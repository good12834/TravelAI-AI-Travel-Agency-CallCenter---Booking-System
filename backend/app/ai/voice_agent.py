import json
from datetime import datetime
from app.extensions import db
from app.models.flight import Flight
from app.models.hotel import Hotel
from app.models.tour import TourPackage
from app.models.booking import Booking
from app.ai.intent import IntentClassifier
from app.ai.sentiment import SentimentAnalyzer
from app.ai.rag import RAGService
from app.ai.languages import get_language, SUPPORTED_LANGUAGES
from app.ai.language_detector import LanguageDetector
from app.ai.prompts import (
    CONVERSATION_PROMPT_TEMPLATE,
    LANGUAGE_GREETINGS,
    SYSTEM_TRAVEL_ASSISTANT_PROMPT,
    acknowledgement_line,
    continuation_line,
    escalation_line,
    format_history,
    format_known_entities,
    build_system_prompt,
    prepare_ai_request,
)


def format_multilingual_flight(f0, count: int, destination: str, passengers: int, language: str) -> str:
    lang = get_language(language)["code"]
    if lang == "am":
        return f"ወደ {destination} {count} በረራዎችን አግኝቻለሁ። የመጀመሪያው {f0.airline} በረራ {f0.flight_number} በ ${f0.price:.2f} ይጀምራል። ይህንን ለ{passengers} ተሳፋሪ ላስይዝልዎ?"
    elif lang == "ar":
        return f"وجدت {count} رحلات طيران إلى {destination}. أقرب رحلة هي على {f0.airline} برقم {f0.flight_number} بسعر يبدأ من ${f0.price:.2f}. هل ترغب في حجزها لـ {passengers} مسافر؟"
    elif lang == "he":
        return f"מצאתי {count} טיסות ל{destination}. הטיסה המוקדמת היא {f0.airline} מספר {f0.flight_number} במחיר החל מ-${f0.price:.2f}. האם תרצה שאזמין עבור {passengers} נוסעים?"
    return (
        f"I found {count} flights to {destination}. "
        f"The earliest is {f0.airline} flight {f0.flight_number} starting at ${f0.price:.2f}. "
        f"Would you like me to book this for {passengers} passenger{'s' if passengers > 1 else ''}?"
    )


def format_multilingual_hotel(h0, destination: str, language: str) -> str:
    lang = get_language(language)["code"]
    if lang == "am":
        return f"በ{destination} ውስጥ ምርጥ ሆቴሎችን አግኝቻለሁ፣ {h0.name} በሌሊት ${h0.price_per_night:.2f} (ደረጃ {h0.rating}/5) ጨምሮ። ክፍል ማስያዝ ይፈልጋሉ?"
    elif lang == "ar":
        return f"وجدت أفضل أماكن الإقامة في {destination}، بما في ذلك {h0.name} بسعر ${h0.price_per_night:.2f} لكل ليلة (تقييم {h0.rating}/5). هل ترغب في حجز غرفة؟"
    elif lang == "he":
        return f"מצאתי מלונות מומלצים ב{destination}, כולל {h0.name} במחיר ${h0.price_per_night:.2f} ללילה (דירוג {h0.rating}/5). האם תרצה להזמין חדר?"
    return (
        f"I found top-rated stays in {destination}, including the {h0.name} at ${h0.price_per_night:.2f} per night (rated {h0.rating}/5). "
        f"Would you like to reserve a room?"
    )


def format_multilingual_tour(t0, destination: str, language: str) -> str:
    lang = get_language(language)["code"]
    if lang == "am":
        return f"በ{destination} ውስጥ ልዩ የጉብኝት ጥቅል አለን: '{t0.name}'። ለ{t0.duration} የሚቆይ ሲሆን በአንድ ሰው ${t0.price:.2f} ነው። ይህንን ላስይዝልዎ?"
    elif lang == "ar":
        return f"لدينا باقة جولات سياحية مميزة: '{t0.name}' في {destination}. مدتها {t0.duration} بسعر ${t0.price:.2f} للشخص. هل أحجزها لك؟"
    elif lang == "he":
        return f"יש לנו חבילת סיור מיוחדת: '{t0.name}' ב{destination}. נמשכת {t0.duration} במחיר ${t0.price:.2f} לאדם. האם לשריין זאת עבורך?"
    return (
        f"We feature an exceptional tour package: '{t0.name}' in {destination}. "
        f"It spans {t0.duration} for ${t0.price:.2f} per person. "
        f"Shall I reserve this for you?"
    )


def format_multilingual_booking(booking, language: str) -> str:
    lang = get_language(language)["code"]
    if lang == "am":
        return f"የቦታ ማስያዣ ቁጥር {booking.booking_reference} ወደ {booking.destination} አግኝቻለሁ። ሁኔታው {booking.status} ሲሆን አጠቃላይ ዋጋው ${booking.total_price:.2f} ነው። በማሻሻያ፣ በስረዛ ወይም በደረሰኝ ልርዳዎት እችላለሁ?"
    elif lang == "ar":
        return f"لقد عثرت على حجزك رقم {booking.booking_reference} إلى {booking.destination}. الحالة الحالية هي {booking.status}، والسعر الإجمالي ${booking.total_price:.2f}. هل يمكنني مساعدتك في التعديل أو الإلغاء؟"
    elif lang == "he":
        return f"איתרתי את ההזמנה שלך {booking.booking_reference} ל{booking.destination}. הסטטוס הוא {booking.status}, והמחיר הכולל ${booking.total_price:.2f}. האם לסייע לך בשינוי, ביטול או קבלה?"
    return (
        f"I located your booking {booking.booking_reference} for {booking.destination}. "
        f"The current status is {booking.status}, and total price is ${booking.total_price:.2f}. "
        f"Can I assist you with modifications, cancellation, or receipts?"
    )


class VoiceAgent:
    """
    Main conversational agent for TravelAI call center sessions.
    Handles dialogue flow, state tracking, inventory lookup, and routing decisions
    across English, Amharic, Arabic, and Hebrew.
    """

    @classmethod
    def build_system_prompt(cls, language_code: str) -> str:
        """Conforms to Step 5 of the multilingual voice architecture."""
        return build_system_prompt(language_code)

    @classmethod
    def prepare_ai_request(cls, message: str, language_code: str) -> dict:
        """Conforms to Step 5 of the multilingual voice architecture."""
        return prepare_ai_request(message, language_code)

    @classmethod
    def process_utterance(cls, text: str, session_context: dict = None, customer = None,
                          history: list = None, language_code: str = None) -> dict:
        """
        Processes one customer turn.
        `session_context` carries the memory of the conversation so far (entities,
        language, turn count, whether the assistant already greeted) and `history` the recent turns.
        """
        session_context = dict(session_context or {})
        analysis = IntentClassifier.classify(text)
        sentiment_info = SentimentAnalyzer.analyze(text)

        intent = analysis["intent"]
        confidence = analysis["confidence"]
        entities = analysis["entities"]

        # 1. Determine Language & Handle Dynamic Language Switching
        # Priority:
        # A) Explicit language switch request ("Can you speak Amharic?", "ለአማርኛ", etc.)
        # B) Script character detection (Ethiopic -> am, Arabic -> ar, Hebrew -> he)
        # C) Explicit argument language_code
        # D) Existing session_context["language"]
        # E) Customer.preferred_language
        # F) Rule-based intent analysis language
        explicit_switch = LanguageDetector.detect_language_switch_request(text)
        script_lang = LanguageDetector.detect_language(text)

        previous_language = session_context.get("language")
        language_switched = False

        if explicit_switch:
            effective_language = explicit_switch
            language_switched = True
        elif script_lang in ["am", "ar", "he"]:
            effective_language = script_lang
            if previous_language and previous_language != script_lang:
                language_switched = True
        elif language_code:
            effective_language = get_language(language_code)["code"]
        elif previous_language:
            effective_language = get_language(previous_language)["code"]
        elif customer and getattr(customer, 'preferred_language', None):
            effective_language = get_language(customer.preferred_language)["code"]
        else:
            effective_language = analysis.get("language") or "en"

        session_context["language"] = effective_language
        lang_meta = get_language(effective_language)

        # Merge new entities into session context
        new_entities = {k: v for k, v in entities.items() if v not in (None, "")}
        current_entities = dict(session_context.get("entities") or {})
        current_entities.update(new_entities)
        session_context["entities"] = current_entities

        turn_number = int(session_context.get("turn_count") or 0) + 1
        already_greeted = bool(session_context.get("greeted"))
        greeted_this_turn = False
        last_intent = session_context.get("last_intent")
        conversation_history = history or session_context.get("history") or []

        # Follow-up turns keep the working topic
        effective_intent = intent
        if intent == "GENERAL" and last_intent and last_intent != "GENERAL" and current_entities:
            effective_intent = last_intent

        courtesy_turn = (
            turn_number > 1
            and intent == "GENERAL"
            and not new_entities
            and sentiment_info["sentiment"] == "POSITIVE"
        )

        destination = current_entities.get("destination")
        passengers = current_entities.get("passengers", 1)
        booking_ref = current_entities.get("booking_reference")

        response_text = ""
        should_escalate = False
        escalate_department = None
        data_payload = {}

        # If customer explicitly asked to switch language on this turn, confirm warmly
        if language_switched and explicit_switch:
            response_text = lang_meta.get("switch_confirm", f"Switched to {lang_meta['name']}.")
            session_context["greeted"] = True

        # 1. Escalation check
        elif courtesy_turn:
            response_text = acknowledgement_line(effective_language, destination)

        elif effective_intent == "HUMAN_AGENT":
            should_escalate = True
            escalate_department = "Customer Support"
            response_text = escalation_line("HUMAN_AGENT", effective_language)

        elif effective_intent == "REFUND":
            should_escalate = True
            escalate_department = "Finance Department"
            response_text = escalation_line("REFUND", effective_language)

        elif effective_intent == "COMPLAINT" or sentiment_info["escalate_recommended"]:
            should_escalate = True
            escalate_department = "Customer Support"
            response_text = escalation_line("COMPLAINT", effective_language)

        # 2. Flight inquiry / search
        elif effective_intent == "FLIGHT":
            if destination:
                flights = Flight.query.filter(Flight.destination.ilike(f"%{destination}%")).limit(3).all()
                if flights:
                    data_payload["flights"] = [f.to_dict() for f in flights]
                    f0 = flights[0]
                    response_text = format_multilingual_flight(f0, len(flights), destination, passengers, effective_language)
                else:
                    if effective_language == "am":
                        response_text = f"ወደ {destination} በርካታ በረራዎች አሉን። የትኛው የመነሻ ቀን ይመችዎታል?"
                    elif effective_language == "ar":
                        response_text = f"لدينا عدة رحلات إلى {destination}. ما هو موعد المغادرة الأنسب لك؟"
                    elif effective_language == "he":
                        response_text = f"יש לנו מספר טיסות ל{destination}. איזה תאריך יציאה מתאים לך?"
                    else:
                        response_text = f"We have several flights to {destination}. What departure date works best for you?"
            else:
                if effective_language == "am":
                    response_text = "የት መብረር ይፈልጋሉ፣ እና የትኛውን የመነሻ ቀን ይመርጣሉ?"
                elif effective_language == "ar":
                    response_text = "إلى أي وجهة ترغب في السفر، وما هو تاريخ المغادرة المفضل لديك؟"
                elif effective_language == "he":
                    response_text = "לאן תרצה לטוס, ואיזה תאריך יציאה אתה מעדיף?"
                else:
                    response_text = "Where would you like to fly to, and what departure date do you prefer?"

        # 3. Hotel inquiry / search
        elif effective_intent == "HOTEL":
            if destination:
                hotels = Hotel.query.filter(
                    (Hotel.city.ilike(f"%{destination}%")) | (Hotel.location.ilike(f"%{destination}%"))
                ).limit(3).all()
                if hotels:
                    data_payload["hotels"] = [h.to_dict() for h in hotels]
                    h0 = hotels[0]
                    response_text = format_multilingual_hotel(h0, destination, effective_language)
                else:
                    if effective_language == "am":
                        response_text = f"በ{destination} ውስጥ ሆቴል እንዲያገኙ በደስታ እረዳዎታለሁ። ለስንት ሌሊት ይቆያሉ?"
                    elif effective_language == "ar":
                        response_text = f"يسعدني مساعدتك في العثور على فندق في {destination}. كم ليلة ستقيم؟"
                    elif effective_language == "he":
                        response_text = f"אשמח לעזור לך למצוא מלון ב{destination}. לכמה לילות תרצה לשהות?"
                    else:
                        response_text = f"I'd love to help you find a hotel in {destination}. How many nights will you be staying?"
            else:
                if effective_language == "am":
                    response_text = "የትኛው ከተማ ውስጥ ማረፍ ይፈልጋሉ፣ እና ለስንት እንግዶች?"
                elif effective_language == "ar":
                    response_text = "في أي مدينة ترغب بالإقامة، ولكم عدد الضيوف؟"
                elif effective_language == "he":
                    response_text = "באיזו עיר תרצה לשהות, ולכמה אורחים?"
                else:
                    response_text = "Which city would you like to stay in, and for how many guests?"

        # 4. Tour package inquiry
        elif effective_intent == "TOUR":
            if destination:
                tours = TourPackage.query.filter(TourPackage.destination.ilike(f"%{destination}%")).limit(3).all()
                if tours:
                    data_payload["tours"] = [t.to_dict() for t in tours]
                    t0 = tours[0]
                    response_text = format_multilingual_tour(t0, destination, effective_language)
                else:
                    if effective_language == "am":
                        response_text = f"ለ{destination} ድንቅ የሚመሩ ጉብኝቶች አሉን። ጉዞዎ ለስንት ቀናት እንዲሆን ይፈልጋሉ?"
                    elif effective_language == "ar":
                        response_text = f"لدينا جولات سياحية رائعة إلى {destination}. كم يوماً ترغب أن تكون رحلتك؟"
                    elif effective_language == "he":
                        response_text = f"יש לנו סיורים מודרכים נהדרים ב{destination}. לכמה ימים תרצה שהטיול יהיה?"
                    else:
                        response_text = f"We have fantastic guided tours for {destination}. How many days would you like your trip to be?"
            else:
                if effective_language == "am":
                    response_text = "የትኛውን የጉብኝት መድረሻ ይፈልጋሉ? ለዱባይ፣ ፓሪስ፣ ሮም እና ቶኪዮ ተወዳጅ ፓኬጆች አሉን!"
                elif effective_language == "ar":
                    response_text = "ما هي الوجهة السياحية التي تهتم بها؟ لدينا باقات شهيرة لدبي وباريس وروما وطوكيو!"
                elif effective_language == "he":
                    response_text = "איזה יעד סיור מעניין אותך? יש לנו חבילות פופולריות לדובאי, פריז, רומא וטוקיו!"
                else:
                    response_text = "Which destination are you interested in touring? We have popular packages for Dubai, Paris, Rome, and Tokyo!"

        # 5. Booking Status check
        elif effective_intent == "BOOKING_STATUS":
            booking = None
            if booking_ref:
                booking = Booking.query.filter_by(booking_reference=booking_ref).first()
            elif customer:
                booking = Booking.query.filter_by(customer_id=customer.id).order_by(Booking.created_at.desc()).first()

            if booking:
                data_payload["booking"] = booking.to_dict()
                response_text = format_multilingual_booking(booking, effective_language)
            else:
                if effective_language == "am":
                    response_text = "እባክዎን የቦታ ማስያዣ ቁጥርዎን (ለምሳሌ TRV-2026-0001) ይንገሩኝ፣ ወይም የተመዘገበ ስልክ ቁጥርዎን ያረጋግጡ።"
                elif effective_language == "ar":
                    response_text = "يرجى تقديم رقم الحجز الخاص بك (مثال: TRV-2026-0001)، أو تأكيد رقم هاتفك المسجل."
                elif effective_language == "he":
                    response_text = "אנא מסור את מספר ההזמנה שלך (למשל TRV-2026-0001), או אשר את מספר הטלפון הרשום שלך."
                else:
                    response_text = "Please provide your booking reference number (e.g., TRV-2026-0001), or confirm your registered phone number."

        # 6. Cancellation request
        elif effective_intent == "CANCELLATION":
            should_escalate = True
            escalate_department = "Booking Department"
            response_text = escalation_line("CANCELLATION", effective_language)

        # 7. Visa / Policy inquiry using RAG
        elif effective_intent in ("VISA", "PRICE"):
            rag_results = RAGService.search_knowledge(text, top_k=2)
            data_payload["rag_sources"] = rag_results
            if rag_results:
                response_text = RAGService.answer_with_context(text, rag_results)
            else:
                should_escalate = True
                escalate_department = "Visa Department"
                if effective_language == "am":
                    response_text = f"ወደ {destination or 'ዓለም አቀፍ መድረሻዎች'} የሚደረጉ ጉዞዎች ቪዛ በመድረሻ ወይም በኢንተርኔት ሊሰራ ይችላል። ከቪዛ ባለሙያችን ጋር ላገናኝዎት?"
                elif effective_language == "ar":
                    response_text = f"بالنسبة للسفر إلى {destination or 'الوجهات الدولية'}، يمكن إصدار التأشيرات السياحية عند الوصول أو عبر الإنترنت. هل ترغب بأن أصلك بقسم التأشيرات؟"
                elif effective_language == "he":
                    response_text = f"לנסיעות ל{destination or 'יעדים בינלאומיים'}, אשרות תייר ניתנות להנפקה בעת ההגעה או אונליין. האם לחבר אותך למומחה אשרות?"
                else:
                    response_text = (
                        f"For travel to {destination or 'international destinations'}, standard tourist visas can be processed on arrival or online. "
                        f"Would you like me to connect you with our Visa Specialist department?"
                    )

        # 8. General Travel Booking
        elif effective_intent == "BOOKING":
            if destination:
                departure_date = current_entities.get("departure_date")
                if effective_language == "am":
                    date_str = f" በ{departure_date}" if departure_date else ""
                    response_text = f"በጣም ጥሩ! ወደ {destination}{date_str} ለ{passengers} ተጓዦች ላስይዝልዎ እችላለሁ። የበረራ አማራጮችን፣ የሆቴል ማረፊያዎችን ወይም የጉብኝት ፓኬጅን ማየት ይፈልጋሉ?"
                elif effective_language == "ar":
                    date_str = f" في {departure_date}" if departure_date else ""
                    response_text = f"رائع! يمكنني حجز رحلتك إلى {destination}{date_str} لـ {passengers} مسافرين. هل ترغب في مراجعة خيارات الطيران أو الفنادق أو باقة شاملة؟"
                elif effective_language == "he":
                    date_str = f" בתאריך {departure_date}" if departure_date else ""
                    response_text = f"מצוין! אוכל להזמין עבורך נסיעה ל{destination}{date_str} עבור {passengers} נוסעים. האם תרצה לבדוק טיסות, מלונות או חבילת נופש?"
                else:
                    date_clause = f" departing {departure_date}" if departure_date else ""
                    response_text = (
                        f"Great! I can book your trip to {destination}{date_clause} for {passengers} traveler{'s' if passengers > 1 else ''}. "
                        f"Would you like to review flight options, hotel accommodations, or an all-inclusive tour package?"
                    )
            else:
                if effective_language == "am":
                    response_text = "የመጪውን ጉዞዎን ለማስያዝ በደስታ እረዳዎታለሁ! ወዴት ለመጓዝ አቅደዋል?"
                elif effective_language == "ar":
                    response_text = "يسعدني مساعدتك في حجز رحلتك القادمة! إلى أين تخطط للسفر؟"
                elif effective_language == "he":
                    response_text = "אשמח מאוד לעזור לך להזמין את הנסיעה הקרובה שלך! לאן אתה מתכנן לנסוע?"
                else:
                    response_text = "I'd be thrilled to help you book your upcoming trip! Where are you planning to travel?"

        # Default fallback
        else:
            rag_results = RAGService.search_knowledge(text, top_k=2)
            if rag_results:
                response_text = RAGService.answer_with_context(text, rag_results)
            else:
                gemini_conversational = None
                try:
                    from app.ai.gemini_client import GeminiClient
                    prompt = CONVERSATION_PROMPT_TEMPLATE.format(
                        language_name=lang_meta["name"],
                        language_locale=lang_meta["locale"],
                        known_entities=format_known_entities(current_entities),
                        history=format_history(conversation_history),
                        message=text,
                    )
                    sys_prompt = build_system_prompt(effective_language)
                    gemini_conversational = GeminiClient.generate_text(
                        prompt,
                        system_instruction=sys_prompt,
                    )
                except Exception:
                    pass

                if gemini_conversational:
                    response_text = gemini_conversational
                elif turn_number == 1 and not already_greeted:
                    greeting = LANGUAGE_GREETINGS.get(effective_language, LANGUAGE_GREETINGS["en"])
                    if effective_language == "am":
                        response_text = f"{greeting} በረራዎችን መፈለግ፣ ሆቴሎችን ማስያዝ፣ የጉብኝት ፓኬጆችን ማየት ወይም ያለዎትን ማስያዣ መፈተሽ እችላለሁ።"
                    elif effective_language == "ar":
                        response_text = f"{greeting} يمكنني مساعدتك في البحث عن الرحلات وحجز الفنادق الفاخرة وباقات الجولات ومتابعة حجزك الحالي."
                    elif effective_language == "he":
                        response_text = f"{greeting} אוכל לסייע לך בחיפוש טיסות, הזמנת מלונות, חבילות נופש או בדיקת הזמנה קיימת."
                    else:
                        response_text = f"{greeting} I can help you search flights, reserve luxury hotels, book tour packages, or check an existing reservation."
                    greeted_this_turn = True
                else:
                    response_text = continuation_line(effective_language, destination)

        resolved_intent = effective_intent if effective_intent != "GENERAL" else (last_intent or "GENERAL")
        session_context["turn_count"] = turn_number
        session_context["greeted"] = already_greeted or greeted_this_turn or turn_number > 1
        session_context["last_intent"] = resolved_intent
        session_context["last_ai_response"] = response_text
        session_context["language"] = effective_language

        return {
            "response": response_text,
            "intent": intent,
            "resolved_intent": resolved_intent,
            "turn_count": turn_number,
            "session_context": session_context,
            "confidence": confidence,
            "language": effective_language,
            "language_name": lang_meta.get("name", "English"),
            "language_native": lang_meta.get("native", "English"),
            "language_flag": lang_meta.get("flag", "🌐"),
            "language_switched": language_switched,
            "entities": current_entities,
            "sentiment": sentiment_info["sentiment"],
            "sentiment_score": sentiment_info["sentiment_score"],
            "priority": sentiment_info["priority"],
            "should_escalate": should_escalate,
            "escalate_department": escalate_department,
            "data": data_payload
        }
