# TravelAI — Database Schema

## 1. Configuration

Default: **SQLite** at `backend/instance/travelai.db` (auto-created, zero config).
MySQL: set in `backend/.env`:

```
DATABASE_URL=mysql+pymysql://user:password@localhost/travelai
```

Tables are created automatically via `db.create_all()` at app startup and by `python seed.py`.

## 2. Entity Relationship Overview

```
User ──belongs to──► Department ◄──assigned to── Agent
                                                    │
Customer ──┬──► Call ──┬──► CallTranscript           │
           │           ├──► CallRecording ◄───────────┘ (agent_id)
           │           └──► AISession ──► AIMessage
           ├──► Booking ──┬──► BookingPassenger
           │              ├──► Payment
           │              └──► Flight / Hotel / TourPackage (nullable FKs)
           └──► Message (SMS / WHATSAPP / EMAIL / CHAT)

KnowledgeDocument ──► KnowledgeChunk (embedding JSON)

Notification, AuditLog (standalone)
```

## 3. Models (18)

### People & Organization
| Model | Key Fields | Notes |
|---|---|---|
| `User` | name, email (unique), password_hash, role (`admin`/`manager`/`agent`) | `set_password()` / `check_password()` |
| `Department` | name, code (FLIGHT/HOTEL/BOOKING/VISA/FINANCE/SUPPORT), description | Routing target |
| `Agent` | user_id, department_id, extension, status (`AVAILABLE`/`BUSY`/`OFFLINE`), active_calls_count, completed_calls_count | Workload-based routing reads `active_calls_count` |
| `Customer` | first_name, last_name, phone (unique, indexed), email, country, preferred_language (`en`/`am`/`ar`/`he`), notes | Cascade-deletes calls/bookings/messages |

### Call Center
| Model | Key Fields |
|---|---|
| `Call` | customer_id, agent_id, phone_number, direction (`INBOUND`/`OUTBOUND`), status (`IN_PROGRESS`/`TRANSFERRED`/`COMPLETED`/`MISSED`), intent, sentiment, priority, confidence, duration, ai_summary, department_assigned, recording_url, started_at, ended_at |
| `CallTranscript` | call_id, speaker (`CUSTOMER`/`AI`/`AGENT`), message, timestamp |
| `CallRecording` | call_id, recording_url, duration, storage_provider |
| `AISession` / `AIMessage` | call_id, customer_id, session context / role, content |

### Inventory
| Model | Key Fields |
|---|---|
| `Flight` | airline, flight_number, origin, destination, departure_time, arrival_time, price, available_seats, cabin_class |
| `Hotel` | name, city, country, star_rating, room_type, price_per_night, available_rooms, amenities |
| `TourPackage` | name, destination, duration_days, price, available_slots, description, includes |

### Booking & Payments
| Model | Key Fields |
|---|---|
| `Booking` | booking_reference (unique, `TRV-YYYY-XXXXXX`), booking_type (`FLIGHT`/`HOTEL`/`TOUR`/`PACKAGE`), destination, departure_date, return_date, passengers, total_price, currency, status (`PENDING`/`PAYMENT_PENDING`/`CONFIRMED`/`COMPLETED`/`CANCELLED`), flight_id, hotel_id, tour_id |
| `BookingPassenger` | booking_id, first_name, last_name, date_of_birth, passport_number, nationality |
| `Payment` | booking_id, amount, method, status (`PENDING`/`PAID`/`REFUNDED`/`FAILED`), transaction_reference |

### Omnichannel & Knowledge
| Model | Key Fields |
|---|---|
| `Message` | customer_id, channel (`SMS`/`WHATSAPP`/`EMAIL`/`CHAT`), direction, subject, body, status |
| `KnowledgeDocument` | title, category, content (Text), status (`PENDING`/`INDEXED`) |
| `KnowledgeChunk` | document_id, content, embedding (JSON vector), chunk_index |
| `Notification` | title, message, type (`CALL`/`BOOKING`/`TRANSFER`/...), is_read |
| `AuditLog` | user_id, action, entity_type, entity_id, details |

## 4. Inventory Integrity

`BookingService` maintains availability counts:
- **Confirm:** flight `available_seats -= passengers`, hotel `available_rooms -= 1`, tour `available_slots -= passengers`
- **Cancel:** the same quantities are restored

## 5. Indexing

Unique + indexed: `Customer.phone`, `Customer.email`, `User.email`, `Booking.booking_reference`, `KnowledgeChunk` (document_id, chunk_index).
