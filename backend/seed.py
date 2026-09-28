import os
from datetime import datetime, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.department import Department
from app.models.agent import Agent
from app.models.customer import Customer
from app.models.flight import Flight
from app.models.hotel import Hotel
from app.models.tour import TourPackage
from app.models.booking import Booking
from app.models.passenger import BookingPassenger
from app.models.payment import Payment
from app.models.call import Call
from app.models.call_transcript import CallTranscript
from app.models.message import Message
from app.models.notification import Notification
from app.models.knowledge_document import KnowledgeDocument
from app.ai.rag import RAGService

import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

app = create_app('development')

def seed_database():
    with app.app_context():
        print("[SEED] Seeding TravelAI Database...")
        db.create_all()

        # 1. Departments
        departments_data = [
            {"name": "Flight Department", "code": "FLIGHT", "description": "Ticketing, airline reservations, and schedule changes"},
            {"name": "Hotel Department", "code": "HOTEL", "description": "Resort bookings, room upgrades, and hospitality inquiries"},
            {"name": "Booking Department", "code": "BOOKING", "description": "General package reservations, multi-city itineraries"},
            {"name": "Visa Department", "code": "VISA", "description": "Entry requirements, embassy documentation, and visa approvals"},
            {"name": "Finance Department", "code": "FINANCE", "description": "Billing, refunds, invoice disputes, and merchant processing"},
            {"name": "Customer Support", "code": "SUPPORT", "description": "Escalations, general inquiries, and VIP concierge assistance"}
        ]
        dept_map = {}
        for d in departments_data:
            dept = Department.query.filter_by(name=d["name"]).first()
            if not dept:
                dept = Department(name=d["name"], code=d["code"], description=d["description"])
                db.session.add(dept)
                db.session.flush()
            dept_map[d["code"]] = dept

        # 2. Users
        users_data = [
            {"name": "Alex Vance (Admin)", "email": "admin@travelai.com", "password": "admin123", "role": "admin"},
            {"name": "Marcus Brody (Manager)", "email": "manager@travelai.com", "password": "manager123", "role": "manager"},
            {"name": "Sarah Connor (Flight Agent)", "email": "agent@travelai.com", "password": "agent123", "role": "agent", "dept": "FLIGHT", "ext": "1001", "languages": "en,am"},
            {"name": "David Miller (Hotel Specialist)", "email": "david@travelai.com", "password": "agent123", "role": "agent", "dept": "HOTEL", "ext": "1002", "languages": "en,he"},
            {"name": "Elena Rostova (Finance Officer)", "email": "elena@travelai.com", "password": "agent123", "role": "agent", "dept": "FINANCE", "ext": "1003", "languages": "en,ar"},
            {"name": "Ahmed Mansoor (Visa Consultant)", "email": "ahmed@travelai.com", "password": "agent123", "role": "agent", "dept": "VISA", "ext": "1004", "languages": "en,ar"},
            {"name": "Bethlehem Haile (Amharic Specialist)", "email": "bethlehem@travelai.com", "password": "agent123", "role": "agent", "dept": "SUPPORT", "ext": "1005", "languages": "am,en"},
            {"name": "Yoni Cohen (Hebrew Specialist)", "email": "yoni.cohen@travelai.com", "password": "agent123", "role": "agent", "dept": "SUPPORT", "ext": "1006", "languages": "he,en"},
        ]
        for u in users_data:
            user = User.query.filter_by(email=u["email"]).first()
            if not user:
                user = User(name=u["name"], email=u["email"], role=u["role"])
                user.set_password(u["password"])
                db.session.add(user)
                db.session.flush()

                if u.get("dept") and u["dept"] in dept_map:
                    agent = Agent(
                        user_id=user.id,
                        department_id=dept_map[u["dept"]].id,
                        extension=u.get("ext", "1000"),
                        languages=u.get("languages", "en"),
                        status="AVAILABLE",
                        active_calls_count=0,
                        completed_calls_count=42,
                        avg_call_duration_seconds=185
                    )
                    db.session.add(agent)

        # 3. Knowledge Documents
        docs_data = [
            {
                "title": "Agency Cancellation & Refund Policy",
                "file_type": "POLICY",
                "content": (
                    "TravelAI Cancellation and Refund Policy: "
                    "1. Flight and hotel reservations can be cancelled for a 100% full refund up to 48 hours before scheduled departure or check-in. "
                    "2. Cancellations made between 24 to 48 hours prior are eligible for a 75% refund or a 100% travel credit voucher. "
                    "3. Cancellations within 24 hours of departure are non-refundable except in certified medical emergencies. "
                    "4. Refunds are credited back to the original payment method within 3 to 5 business days upon review by our Finance Department."
                )
            },
            {
                "title": "Dubai Entry & Visa Requirements Guide",
                "file_type": "VISA",
                "content": (
                    "United Arab Emirates / Dubai Visa Guidelines: "
                    "1. Citizens of the US, Canada, EU, UK, Israel, and GCC nations receive a complimentary 30 or 90-day visa on arrival at Dubai International Airport (DXB). "
                    "2. Passports must have at least 6 months remaining validity from the date of arrival. "
                    "3. Other nationalities can obtain a 30-day single-entry tourist visa online through TravelAI within 48 to 72 hours for $120. "
                    "4. Mandatory travel health insurance covering COVID-19 and emergency care is included in all TravelAI packages."
                )
            },
            {
                "title": "Baggage & Airport Check-in Protocol",
                "file_type": "FAQ",
                "content": (
                    "Airline Baggage Policies: "
                    "Standard economy fares include 1 complimentary carry-on luggage (up to 8kg) and 1 personal item. "
                    "Checked baggage allowance is 23kg (50 lbs) per piece for standard flights and 32kg for Business/First class. "
                    "Online check-in opens 24 hours prior to departure via the TravelAI portal or airline mobile app."
                )
            }
        ]
        for d in docs_data:
            doc = KnowledgeDocument.query.filter_by(title=d["title"]).first()
            if not doc:
                doc = KnowledgeDocument(
                    title=d["title"],
                    file_type=d["file_type"],
                    file_name=f"{d['title'].lower().replace(' ', '_')}.txt",
                    content=d["content"],
                    status="PROCESSING"
                )
                db.session.add(doc)
                db.session.flush()
                RAGService.index_document(doc.id)

        # 4. Flights
        now = datetime.utcnow()
        flights_data = [
            {"airline": "Emirates", "flight_number": "EK-932", "origin": "Tel Aviv (TLV)", "destination": "Dubai (DXB)", "hours_ahead": 48, "duration": 3.5, "price": 420.0, "seats": 42},
            {"airline": "Air France", "flight_number": "AF-007", "origin": "New York (JFK)", "destination": "Paris (CDG)", "hours_ahead": 72, "duration": 7.5, "price": 680.0, "seats": 28},
            {"airline": "Japan Airlines", "flight_number": "JL-044", "origin": "London (LHR)", "destination": "Tokyo (HND)", "hours_ahead": 96, "duration": 14.0, "price": 950.0, "seats": 19},
            {"airline": "ITA Airways", "flight_number": "AZ-312", "origin": "Paris (CDG)", "destination": "Rome (FCO)", "hours_ahead": 24, "duration": 2.0, "price": 145.0, "seats": 60},
            {"airline": "Delta Air Lines", "flight_number": "DL-118", "origin": "London (LHR)", "destination": "New York (JFK)", "hours_ahead": 36, "duration": 8.0, "price": 540.0, "seats": 35}
        ]
        flight_instances = []
        for f in flights_data:
            flight = Flight.query.filter_by(flight_number=f["flight_number"]).first()
            if not flight:
                dep = now + timedelta(hours=f["hours_ahead"])
                arr = dep + timedelta(hours=f["duration"])
                flight = Flight(
                    airline=f["airline"],
                    flight_number=f["flight_number"],
                    origin=f["origin"],
                    destination=f["destination"],
                    departure_time=dep,
                    arrival_time=arr,
                    price=f["price"],
                    available_seats=f["seats"],
                    cabin_class="Economy"
                )
                db.session.add(flight)
                db.session.flush()
            flight_instances.append(flight)

        # 5. Hotels
        hotels_data = [
            {"name": "Burj Al Arab Jumeirah", "city": "Dubai", "location": "Jumeirah Beach Road", "price": 1250.0, "rating": 4.9, "rooms": 8, "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
            {"name": "The Ritz Paris", "city": "Paris", "location": "Place Vendôme", "price": 890.0, "rating": 4.8, "rooms": 12, "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600"},
            {"name": "Park Hyatt Tokyo", "city": "Tokyo", "location": "Shinjuku City", "price": 620.0, "rating": 4.8, "rooms": 15, "image_url": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600"},
            {"name": "The Savoy", "city": "London", "location": "Strand, Covent Garden", "price": 580.0, "rating": 4.7, "rooms": 14, "image_url": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600"},
            {"name": "Hotel Artemide", "city": "Rome", "location": "Via Nazionale", "price": 310.0, "rating": 4.6, "rooms": 20, "image_url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600"}
        ]
        hotel_instances = []
        for h in hotels_data:
            hotel = Hotel.query.filter_by(name=h["name"]).first()
            if not hotel:
                hotel = Hotel(
                    name=h["name"],
                    city=h["city"],
                    location=h["location"],
                    description=f"Premier luxury hotel in {h['city']} featuring world-class amenities, fine dining, and spa.",
                    rating=h["rating"],
                    price_per_night=h["price"],
                    available_rooms=h["rooms"],
                    image_url=h["image_url"]
                )
                db.session.add(hotel)
                db.session.flush()
            hotel_instances.append(hotel)

        # 6. Tour Packages
        tours_data = [
            {"name": "Dubai Luxury Desert Safari & Skyline Experience", "destination": "Dubai", "duration": "7 Days / 6 Nights", "price": 1499.0, "includes": "Burj Khalifa VIP, Desert Dune Safari, 5-Star Hotel, Private Chauffeur", "image_url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600"},
            {"name": "Parisian Art, Wine & Palace of Versailles Odyssey", "destination": "Paris", "duration": "5 Days / 4 Nights", "price": 1250.0, "includes": "Louvre Private Tour, Seine Dinner Cruise, Luxury Hotel, Wine Tasting", "image_url": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600"},
            {"name": "Tokyo Neon Nights & Mount Fuji Scenic Tour", "destination": "Tokyo", "duration": "8 Days / 7 Nights", "price": 2100.0, "includes": "Shinkansen Bullet Train, Fuji Day Tour, Michelin Dining, Robot Tech Tour", "image_url": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600"},
            {"name": "Grand Imperial Rome & Vatican Museums Tour", "destination": "Rome", "duration": "4 Days / 3 Nights", "price": 950.0, "includes": "Colosseum Arena Pass, Sistine Chapel After-Hours, 4-Star Hotel", "image_url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600"}
        ]
        tour_instances = []
        for t in tours_data:
            tour = TourPackage.query.filter_by(name=t["name"]).first()
            if not tour:
                tour = TourPackage(
                    name=t["name"],
                    destination=t["destination"],
                    duration=t["duration"],
                    price=t["price"],
                    includes=t["includes"],
                    description=f"Curated all-inclusive travel experience in {t['destination']}.",
                    image_url=t["image_url"]
                )
                db.session.add(tour)
                db.session.flush()
            tour_instances.append(tour)

        # 7. Customers
        customers_data = [
            {"first_name": "John", "last_name": "Smith", "phone": "+1-202-555-0143", "email": "john.smith@gmail.com", "country": "United States", "lang": "en"},
            {"first_name": "Amina", "last_name": "Al-Mansoor", "phone": "+971-50-555-1284", "email": "amina.mansoor@uae.ae", "country": "United Arab Emirates", "lang": "ar"},
            {"first_name": "Yoni", "last_name": "Cohen", "phone": "+972-54-555-8910", "email": "yoni.cohen@gmail.com", "country": "Israel", "lang": "he"},
            {"first_name": "Dawit", "last_name": "Kebede", "phone": "+251-91-555-4321", "email": "dawit.k@ethiopia.et", "country": "Ethiopia", "lang": "am"}
        ]
        customer_instances = []
        for c in customers_data:
            cust = Customer.query.filter_by(phone=c["phone"]).first()
            if not cust:
                cust = Customer(
                    first_name=c["first_name"],
                    last_name=c["last_name"],
                    phone=c["phone"],
                    email=c["email"],
                    country=c["country"],
                    preferred_language=c["lang"]
                )
                db.session.add(cust)
                db.session.flush()
            customer_instances.append(cust)

        # 8. Bookings & Payments
        c0 = customer_instances[0]
        b0 = Booking.query.filter_by(customer_id=c0.id).first()
        if not b0:
            b0 = Booking(
                customer_id=c0.id,
                booking_reference="TRV-2026-0001",
                booking_type="TOUR",
                destination="Dubai",
                departure_date=(now + timedelta(days=20)).date(),
                return_date=(now + timedelta(days=27)).date(),
                passengers=2,
                total_price=2998.0,
                status="CONFIRMED",
                tour_id=tour_instances[0].id if tour_instances else None,
                notes="Anniversary luxury trip. Requested high floor room."
            )
            db.session.add(b0)
            db.session.flush()

            # Passenger
            pass1 = BookingPassenger(booking_id=b0.id, first_name="John", last_name="Smith", passport_number="US9823412", nationality="United States")
            pass2 = BookingPassenger(booking_id=b0.id, first_name="Emily", last_name="Smith", passport_number="US9823413", nationality="United States")
            db.session.add_all([pass1, pass2])

            # Payment
            pay0 = Payment(
                booking_id=b0.id,
                amount=2998.0,
                currency="USD",
                payment_method="CREDIT_CARD",
                transaction_reference="PAY-2026-0001-SUCCESS",
                status="PAID"
            )
            db.session.add(pay0)

        # 9. Calls & Transcripts
        call0 = Call.query.filter_by(customer_id=c0.id).first()
        if not call0:
            call0 = Call(
                customer_id=c0.id,
                phone_number=c0.phone,
                direction="INBOUND",
                status="COMPLETED",
                language_code="en",
                intent="BOOKING",
                sentiment="POSITIVE",
                priority="LOW",
                confidence=0.96,
                duration=215,
                ai_summary="John Smith booked the Dubai 7-Day Luxury Desert Safari tour for 2 passengers. Payment verified successfully.",
                department_assigned="Flight Department"
            )
            db.session.add(call0)
            db.session.flush()

            t_lines = [
                ("CUSTOMER", "Hello! I am planning a holiday to Dubai next month for two people."),
                ("AI", "Hello John! Wonderful choice. We have a spectacular 7-Day Luxury Desert Safari package starting at $1,499 per person. Would you like me to reserve that?"),
                ("CUSTOMER", "Yes please, that sounds great. What about flight availability?"),
                ("AI", "Emirates flight EK-932 has seats available. Total for 2 passengers is $2,998 including hotel and activities."),
                ("CUSTOMER", "Perfect, please confirm the booking."),
                ("AI", "Your booking TRV-2026-0001 is confirmed! I have sent the itinerary receipt to your email.")
            ]
            for spk, msg in t_lines:
                db.session.add(CallTranscript(call_id=call0.id, speaker=spk, message=msg))

        # 10. Live Queue Calls across all 4 languages (English, Arabic, Amharic, Hebrew)
        c1 = customer_instances[1] # Amina (Arabic)
        call_ar = Call.query.filter_by(phone_number=c1.phone, status="IN_PROGRESS").first()
        if not call_ar:
            call_ar = Call(
                customer_id=c1.id,
                phone_number=c1.phone,
                direction="INBOUND",
                status="IN_PROGRESS",
                language_code="ar",
                intent="HOTEL",
                sentiment="NEUTRAL",
                priority="MEDIUM",
                confidence=0.94,
                duration=45,
                department_assigned="Hotel Department"
            )
            db.session.add(call_ar)
            db.session.flush()
            db.session.add(CallTranscript(call_id=call_ar.id, speaker="CUSTOMER", message="مرحبًا، أريد التحقق من توفر الغرف في برج العرب نهاية الأسبوع القادم."))
            db.session.add(CallTranscript(call_id=call_ar.id, speaker="AI", message="أهلاً بك يا أمينة! سأتحقق لك فوراً من الأجنحة التنفيذية المتاحة في برج العرب."))

        c3 = customer_instances[3] # Dawit (Amharic)
        call_am = Call.query.filter_by(phone_number=c3.phone, status="IN_PROGRESS").first()
        if not call_am:
            call_am = Call(
                customer_id=c3.id,
                phone_number=c3.phone,
                direction="INBOUND",
                status="IN_PROGRESS",
                language_code="am",
                intent="FLIGHT",
                sentiment="POSITIVE",
                priority="HIGH",
                confidence=0.95,
                duration=60,
                department_assigned="Flight Department"
            )
            db.session.add(call_am)
            db.session.flush()
            db.session.add(CallTranscript(call_id=call_am.id, speaker="CUSTOMER", message="ሰላም! ወደ ዱባይ የሚደረጉ የበረራ አማራጮችን ማወቅ እፈልጋለሁ።"))
            db.session.add(CallTranscript(call_id=call_am.id, speaker="AI", message="ሰላም ዳዊት! ወደ ዱባይ የሚሄዱ ምርጥ በረራዎችን ፈልጌልዎታለሁ። የኢትዮጵያ አየር መንገድ በረራ ቁጥር ET-302 አለ።"))

        c2 = customer_instances[2] # Yoni (Hebrew)
        call_he = Call.query.filter_by(phone_number=c2.phone, status="IN_PROGRESS").first()
        if not call_he:
            call_he = Call(
                customer_id=c2.id,
                phone_number=c2.phone,
                direction="INBOUND",
                status="IN_PROGRESS",
                language_code="he",
                intent="TOUR",
                sentiment="NEUTRAL",
                priority="MEDIUM",
                confidence=0.92,
                duration=35,
                department_assigned="Booking Department"
            )
            db.session.add(call_he)
            db.session.flush()
            db.session.add(CallTranscript(call_id=call_he.id, speaker="CUSTOMER", message="שלום, אני מעוניין בפרטים על חבילת הסיור בפריז."))
            db.session.add(CallTranscript(call_id=call_he.id, speaker="AI", message="שלום יוני! בשמחה רבה. יש לנו חבילת סיור מודרך מדהימה בפריז הכוללת מלון וכרטיסי כניסה."))

        # 11. Notifications
        notifs = [
            {"title": "Incoming VIP Caller", "message": "Amina Al-Mansoor is on the line regarding Dubai luxury hotel reservation.", "type": "CALL"},
            {"title": "New Booking Confirmed", "message": "Booking TRV-2026-0001 for Dubai confirmed ($2,998.00).", "type": "BOOKING"},
            {"title": "Agent Assigned", "message": "Sarah Connor has accepted call transfer #1002.", "type": "TRANSFER"}
        ]
        for n in notifs:
            db.session.add(Notification(title=n["title"], message=n["message"], type=n["type"]))

        db.session.commit()
        print("[SUCCESS] TravelAI Database successfully seeded with full initial catalog and call data!")

if __name__ == '__main__':
    seed_database()
