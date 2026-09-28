import os
import logging
from app.ai.languages import get_language, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

class TelephonyIntegration:
    """
    Twilio Telephony & Voice Stream integration.
    Generates TwiML for incoming voice calls, interactive multilingual IVR language selection,
    bidirectional Media Streams, and agent transfers in the customer's language.
    """
    @staticmethod
    def handle_incoming_call(caller_phone: str, call_sid: str = None, host: str = "localhost:5000", language_code: str = None) -> dict:
        logger.info(f"Incoming Twilio call received from {caller_phone} [SID: {call_sid}]")
        
        ws_protocol = "wss" if "https" in host or "443" in host else "ws"
        clean_host = host.replace("http://", "").replace("https://", "").rstrip("/")
        stream_url = f"{ws_protocol}://{clean_host}/api/telephony/voice-stream"
        http_protocol = "https" if "https" in host or "443" in host else "http"
        gather_url = f"{http_protocol}://{clean_host}/api/telephony/language-select"

        welcome_text = "Welcome to TravelAI. Press 1 for English. ለአማርኛ 2 ይጫኑ። للعربية اضغط 3. לעברית הקש 4."

        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            f'    <Gather action="{gather_url}" method="POST" numDigits="1" timeout="3">\n'
            f'        <Say voice="Polly.Joanna">Welcome to TravelAI. Press 1 for English.</Say>\n'
            f'        <Say voice="Polly.Joanna">ለአማርኛ 2 ይጫኑ።</Say>\n'
            f'        <Say voice="Polly.Zeina" language="ar-XA">للعربية اضغط 3.</Say>\n'
            f'        <Say voice="Polly.Joanna">לעברית הקש 4.</Say>\n'
            '    </Gather>\n'
            '    <Connect>\n'
            f'        <Stream url="{stream_url}">\n'
            f'            <Parameter name="caller" value="{caller_phone}" />\n'
            f'            <Parameter name="callSid" value="{call_sid or ""}" />\n'
            f'            <Parameter name="language" value="{language_code or "en"}" />\n'
            '        </Stream>\n'
            '    </Connect>\n'
            '</Response>'
        )

        return {
            "status": "ACCEPTED",
            "caller": caller_phone,
            "call_sid": call_sid,
            "stream_url": stream_url,
            "gather_url": gather_url,
            "twiml": twiml,
            "welcome_message": welcome_text
        }

    @staticmethod
    def generate_language_twiml(language_code: str, host: str, caller_phone: str = "", call_sid: str = "") -> str:
        """Generates TwiML connecting the call after the customer selected their language."""
        lang_info = get_language(language_code)
        ws_protocol = "wss" if "https" in host or "443" in host else "ws"
        clean_host = host.replace("http://", "").replace("https://", "").rstrip("/")
        stream_url = f"{ws_protocol}://{clean_host}/api/telephony/voice-stream"

        voice = lang_info.get("twilio_voice", "Polly.Joanna")
        greeting = lang_info.get("greeting", "Welcome to TravelAI.")

        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            f'    <Say voice="{voice}">{greeting}</Say>\n'
            '    <Connect>\n'
            f'        <Stream url="{stream_url}">\n'
            f'            <Parameter name="caller" value="{caller_phone}" />\n'
            f'            <Parameter name="callSid" value="{call_sid}" />\n'
            f'            <Parameter name="language" value="{lang_info["code"]}" />\n'
            '        </Stream>\n'
            '    </Connect>\n'
            '</Response>'
        )

    @staticmethod
    def transfer_to_extension(call_id: int, extension: str, language_code: str = "en") -> dict:
        logger.info(f"Transferring call {call_id} to extension {extension} in language {language_code}")
        lang_info = get_language(language_code)
        voice = lang_info.get("twilio_voice", "Polly.Joanna")
        transfer_msg = lang_info.get("transfer_message", f"Please hold while we transfer your call to extension {extension}.")

        twiml = (
            f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<Response>\n'
            f'    <Say voice="{voice}">{transfer_msg}</Say>\n'
            f'    <Dial>{extension}</Dial>\n'
            f'</Response>'
        )
        return {"status": "TRANSFERRED", "extension": extension, "language": language_code, "twiml": twiml}

class SMSIntegration:
    @staticmethod
    def send_sms(to_phone: str, message: str) -> dict:
        logger.info(f"[SMS to {to_phone}]: {message}")
        return {"status": "SENT", "channel": "SMS", "recipient": to_phone}

class WhatsAppIntegration:
    @staticmethod
    def send_whatsapp(to_phone: str, message: str) -> dict:
        logger.info(f"[WhatsApp to {to_phone}]: {message}")
        return {"status": "SENT", "channel": "WHATSAPP", "recipient": to_phone}

class EmailIntegration:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str) -> dict:
        logger.info(f"[Email to {to_email} - Subj: {subject}]: {body[:100]}...")
        return {"status": "SENT", "channel": "EMAIL", "recipient": to_email}

class PaymentGatewayIntegration:
    @staticmethod
    def charge(amount: float, currency: str, token: str) -> dict:
        logger.info(f"Charging {currency} {amount} via payment token {token}")
        return {
            "status": "SUCCESS",
            "amount": amount,
            "currency": currency,
            "charge_id": f"ch_{abs(hash(token)) % 10000000}"
        }
