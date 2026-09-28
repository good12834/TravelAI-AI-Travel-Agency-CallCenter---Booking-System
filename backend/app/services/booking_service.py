import uuid
from datetime import datetime
from app.extensions import db
from app.models.booking import Booking
from app.models.passenger import BookingPassenger
from app.models.payment import Payment
from app.models.flight import Flight
from app.models.hotel import Hotel
from app.models.tour import TourPackage

class BookingService:
    @staticmethod
    def generate_reference():
        unique_suffix = uuid.uuid4().hex[:6].upper()
        return f"TRV-{datetime.utcnow().year}-{unique_suffix}"

    @classmethod
    def create_booking(cls, customer_id: int, booking_type: str, destination: str,
                       total_price: float, passengers: list = None,
                       flight_id: int = None, hotel_id: int = None, tour_id: int = None,
                       departure_date = None, return_date = None, notes: str = None,
                       currency: str = "USD") -> Booking:
        
        ref = cls.generate_reference()
        booking = Booking(
            customer_id=customer_id,
            booking_reference=ref,
            booking_type=booking_type.upper(),
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            passengers=len(passengers) if passengers else 1,
            total_price=float(total_price),
            currency=currency,
            status="PENDING",
            flight_id=flight_id,
            hotel_id=hotel_id,
            tour_id=tour_id,
            notes=notes
        )
        db.session.add(booking)
        db.session.flush()

        # Add passenger records
        if passengers:
            for p in passengers:
                dob = p.get('date_of_birth')
                if isinstance(dob, str) and dob:
                    try:
                        dob = datetime.strptime(dob, "%Y-%m-%d").date()
                    except ValueError:
                        dob = None

                passenger_rec = BookingPassenger(
                    booking_id=booking.id,
                    first_name=p.get('first_name', 'Guest'),
                    last_name=p.get('last_name', 'Passenger'),
                    date_of_birth=dob,
                    passport_number=p.get('passport_number'),
                    nationality=p.get('nationality', 'United States')
                )
                db.session.add(passenger_rec)

        db.session.commit()
        return booking

    @classmethod
    def confirm_booking(cls, booking_id: int, payment_ref: str = None) -> Booking:
        booking = Booking.query.get_or_404(booking_id)
        booking.status = "CONFIRMED"

        # Decrement seat or room count if available
        if booking.flight and booking.flight.available_seats >= booking.passengers:
            booking.flight.available_seats -= booking.passengers
        if booking.hotel and booking.hotel.available_rooms > 0:
            booking.hotel.available_rooms -= 1
        if booking.tour and booking.tour.available_slots >= booking.passengers:
            booking.tour.available_slots -= booking.passengers

        db.session.commit()
        return booking

    @classmethod
    def cancel_booking(cls, booking_id: int) -> Booking:
        booking = Booking.query.get_or_404(booking_id)
        booking.status = "CANCELLED"

        # Restore inventory
        if booking.flight:
            booking.flight.available_seats += booking.passengers
        if booking.hotel:
            booking.hotel.available_rooms += 1
        if booking.tour:
            booking.tour.available_slots += booking.passengers

        db.session.commit()
        return booking
