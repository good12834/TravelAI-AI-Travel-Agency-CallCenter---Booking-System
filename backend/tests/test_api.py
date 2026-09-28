import unittest
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.ai.intent import IntentClassifier
from app.ai.sentiment import SentimentAnalyzer
from app.ai.rag import RAGService
from app.services.routing_service import RoutingService

class TravelAITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('development')
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_01_health_check(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['status'], 'healthy')

    def test_02_login_success(self):
        res = self.client.post('/api/auth/login', json={
            "email": "admin@travelai.com",
            "password": "admin123"
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("token", res.json)
        self.assertEqual(res.json["user"]["role"], "admin")

    def test_03_intent_detection(self):
        # Booking intent with destination and passengers
        res = IntentClassifier.classify("I want to book a flight to Dubai for 4 passengers")
        self.assertIn(res["intent"], ["BOOKING", "FLIGHT"])
        self.assertEqual(res["entities"]["destination"], "Dubai")
        self.assertEqual(res["entities"]["passengers"], 4)

        # Cancellation intent
        res_cancel = IntentClassifier.classify("Please cancel my booking TRV-2026-0001")
        self.assertEqual(res_cancel["intent"], "CANCELLATION")
        self.assertEqual(res_cancel["entities"]["booking_reference"], "TRV-2026-0001")

        # Human agent intent
        res_agent = IntentClassifier.classify("I need to speak with a human agent right now")
        self.assertEqual(res_agent["intent"], "HUMAN_AGENT")

    def test_04_sentiment_analysis(self):
        res_pos = SentimentAnalyzer.analyze("Thank you so much, your service is wonderful and great!")
        self.assertEqual(res_pos["sentiment"], "POSITIVE")

        res_frust = SentimentAnalyzer.analyze("This is unacceptable, I am furious and want to sue!")
        self.assertEqual(res_frust["sentiment"], "FRUSTRATED")
        self.assertEqual(res_frust["priority"], "URGENT")

    def test_05_routing_rules(self):
        self.assertEqual(RoutingService.get_department_for_intent("FLIGHT"), "Flight Department")
        self.assertEqual(RoutingService.get_department_for_intent("HOTEL"), "Hotel Department")
        self.assertEqual(RoutingService.get_department_for_intent("REFUND"), "Finance Department")
        self.assertEqual(RoutingService.get_department_for_intent("VISA"), "Visa Department")

    def test_06_flight_and_hotel_api(self):
        flights_res = self.client.get('/api/flights')
        self.assertEqual(flights_res.status_code, 200)
        self.assertTrue(len(flights_res.json) > 0)

        hotels_res = self.client.get('/api/hotels')
        self.assertEqual(hotels_res.status_code, 200)
        self.assertTrue(len(hotels_res.json) > 0)

    def test_07_analytics_dashboard(self):
        res = self.client.get('/api/analytics/dashboard')
        self.assertEqual(res.status_code, 200)
        self.assertIn("total_calls", res.json)
        self.assertIn("total_bookings", res.json)

    def test_08_rag_knowledge_search(self):
        with self.app.app_context():
            results = RAGService.search_knowledge("refund policy cancel 48 hours")
            self.assertTrue(len(results) > 0)
            self.assertIn("Cancellation", results[0]["content"])

if __name__ == '__main__':
    unittest.main()
