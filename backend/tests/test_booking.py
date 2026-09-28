import unittest
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models.customer import Customer
from app.models.booking import Booking
from app.services.booking_service import BookingService
from app.services.call_service import CallService


class BookingLifecycleTestCase(unittest.TestCase):
    """Integration tests for the booking engine lifecycle and call services."""

    def setUp(self):
        self.app = create_app('development')
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def _make_customer(self):
        with self.app.app_context():
            suffix = uuid.uuid4().hex[:10]
            c = Customer(
                first_name="Test",
                last_name="Traveler",
                email=f"traveler_{suffix}@test.com",
                phone=f"+1555{suffix[:7]}",
                preferred_language="en"
            )
            db.session.add(c)
            db.session.commit()
            return c.id

    def test_booking_reference_format(self):
        ref = BookingService.generate_reference()
        self.assertTrue(ref.startswith("TRV-"))
        self.assertEqual(len(ref), len("TRV-2026-XXXXXX"))

    def test_create_booking_with_passengers(self):
        customer_id = self._make_customer()
        with self.app.app_context():
            passengers = [
                {"first_name": "John", "last_name": "Doe", "date_of_birth": "1990-05-10",
                 "passport_number": "P1234567", "nationality": "United States"},
                {"first_name": "Jane", "last_name": "Doe", "date_of_birth": "1992-08-22"},
            ]
            booking = BookingService.create_booking(
                customer_id=customer_id,
                booking_type="FLIGHT",
                destination="Dubai",
                total_price=1498.00,
                passengers=passengers,
                departure_date=(datetime.utcnow() + timedelta(days=14)).date()
            )
            self.assertEqual(booking.status, "PENDING")
            self.assertEqual(booking.booking_type, "FLIGHT")
            self.assertEqual(booking.passengers, 2)
            self.assertEqual(len(booking.passenger_list.all()), 2)
            self.assertIsNotNone(booking.booking_reference)

    def test_booking_api_lifecycle(self):
        customer_id = self._make_customer()
        dep = (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d")

        # Create via API
        res = self.client.post('/api/bookings', json={
            "customer_id": customer_id,
            "booking_type": "HOTEL",
            "destination": "Paris",
            "total_price": 890.50,
            "passengers": [{"first_name": "Alice", "last_name": "Smith"}],
            "departure_date": dep,
        })
        self.assertEqual(res.status_code, 201)
        booking_id = res.json["id"]
        self.assertEqual(res.json["status"], "PENDING")

        # Validation error case
        res_bad = self.client.post('/api/bookings', json={"booking_type": "HOTEL"})
        self.assertEqual(res_bad.status_code, 400)

        # Confirm
        res_confirm = self.client.post(f'/api/bookings/{booking_id}/confirm')
        self.assertEqual(res_confirm.status_code, 200)
        self.assertEqual(res_confirm.json["status"], "CONFIRMED")

        # Cancel
        res_cancel = self.client.post(f'/api/bookings/{booking_id}/cancel')
        self.assertEqual(res_cancel.status_code, 200)
        self.assertEqual(res_cancel.json["status"], "CANCELLED")

        # List & filter
        res_list = self.client.get('/api/bookings?destination=Paris')
        self.assertEqual(res_list.status_code, 200)
        self.assertTrue(any(b["id"] == booking_id for b in res_list.json))

        # Detail
        res_detail = self.client.get(f'/api/bookings/{booking_id}')
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json["destination"], "Paris")

    def test_call_service_lifecycle(self):
        customer_id = self._make_customer()
        with self.app.app_context():
            call = CallService.initiate_call("+15550001111", customer_id=customer_id)
            self.assertEqual(call.status, "IN_PROGRESS")
            self.assertEqual(call.customer_id, customer_id)

            CallService.add_transcript(call.id, "CUSTOMER", "I would like to book a hotel in Dubai")
            CallService.add_transcript(call.id, "AI", "Certainly, let me check availability for you.")

            ended = CallService.end_call(call.id, duration_seconds=120)
            self.assertEqual(ended.status, "COMPLETED")
            self.assertEqual(ended.duration, 120)
            self.assertIsNotNone(ended.ai_summary)
            self.assertIsNotNone(ended.recording_url)

            transferred = CallService.initiate_call("+15550001111", customer_id=customer_id)
            moved = CallService.transfer_call(transferred.id, department_name="Finance Department")
            self.assertEqual(moved.status, "TRANSFERRED")
            self.assertEqual(moved.department_assigned, "Finance Department")

            # Close the transferred call so the test does not leave a phantom entry in the live queue
            closed = CallService.end_call(moved.id, duration_seconds=30)
            self.assertEqual(closed.status, "COMPLETED")


if __name__ == '__main__':
    unittest.main()
