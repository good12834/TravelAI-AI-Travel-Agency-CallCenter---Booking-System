import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.integrations.payment import PaymentGatewayIntegration
from app.ai.gemini_client import GeminiClient
from app.ai.sentiment import SentimentAnalyzer
from app.ai.summarizer import ConversationSummarizer
from app.ai.rag import RAGService
from app.ai.intent import IntentClassifier

class IntegrationsTestCase(unittest.TestCase):
    def test_01_stripe_mock_and_processing(self):
        # Charge test
        charge_res = PaymentGatewayIntegration.charge(
            amount=150.00,
            currency="USD",
            token="pm_card_visa",
            metadata={"booking_ref": "TRV-TEST-001"}
        )
        self.assertEqual(charge_res["status"], "SUCCESS")
        self.assertTrue(charge_res["charge_id"].startswith("ch_") or charge_res["charge_id"].startswith("pi_"))
        self.assertEqual(charge_res["currency"], "USD")
        self.assertEqual(charge_res["amount"], 150.00)

        # Refund test
        refund_res = PaymentGatewayIntegration.refund(
            charge_id=charge_res["charge_id"],
            amount=50.00,
            reason="requested_by_customer"
        )
        self.assertEqual(refund_res["status"], "REFUNDED")
        self.assertTrue(refund_res["refund_id"].startswith("re_"))

    def test_02_gemini_client_json_and_text(self):
        # Test structured JSON generation
        json_res = GeminiClient.generate_json("Return a JSON object with key 'status' set to 'ok' and key 'items' set to [1, 2].")
        if json_res is not None:
            self.assertIsInstance(json_res, dict)
            self.assertIn("status", json_res)

        # Test text generation
        text_res = GeminiClient.generate_text("Say 'Hello TravelAI'")
        if text_res is not None:
            self.assertIsInstance(text_res, str)
            self.assertGreater(len(text_res), 0)

    def test_03_sentiment_and_summarizer_gemini_integration(self):
        # Sentiment with Gemini integration fallback/enrichment
        sent = SentimentAnalyzer.analyze("I loved the flight so much, it was very relaxing!", use_gemini=True)
        self.assertEqual(sent["sentiment"], "POSITIVE")
        self.assertGreaterEqual(sent["sentiment_score"], 0.0)

        # Summarizer with transcripts
        transcripts = [
            {"speaker": "CUSTOMER", "message": "Hi, I need to cancel my hotel in Rome."},
            {"speaker": "AI", "message": "I can assist you with canceling your Rome hotel reservation."}
        ]
        summary = ConversationSummarizer.summarize(transcripts, intent="CANCELLATION", customer_name="Alice", use_gemini=True)
        self.assertIn("summary", summary)
        self.assertIn("action_items", summary)
        self.assertIn("Alice", summary["summary"])

    def test_04_rag_answer_with_gemini(self):
        context = [{"content": "Cancellation is fully refundable up to 24 hours prior to scheduled departure time."}]
        answer = RAGService.answer_with_context("What is the cancellation policy?", context, use_gemini=True)
        self.assertIn("TravelAI policy", answer)
        self.assertTrue("refund" in answer.lower())

if __name__ == '__main__':
    unittest.main()

