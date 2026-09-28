# TravelAI — REST API Reference

**Base URL:** `http://localhost:5000/api`
**Auth:** `Authorization: Bearer <JWT>` (all endpoints except `/auth/login` and `/health`)

---

## Health

### `GET /health`
```json
{ "status": "healthy", "service": "TravelAI Call Center & Booking API", "version": "1.0.0" }
```

## Authentication

### `POST /auth/login`
```json
// Request
{ "email": "admin@travelai.com", "password": "admin123" }
// Response 200
{ "token": "eyJhbGciOi...", "user": { "id": 1, "name": "Alex Vance (Admin)", "role": "admin" } }
```

## Bookings

| Method | Path | Description |
|---|---|---|
| `GET` | `/bookings?status=&type=&destination=` | List with filters |
| `GET` | `/bookings/:id` | Detail incl. passengers & payments |
| `POST` | `/bookings` | Create (PENDING) — requires `customer_id`, `destination` |
| `PUT` | `/bookings/:id` | Update status/notes/destination/total_price |
| `POST` | `/bookings/:id/confirm` | → `CONFIRMED`, decrements inventory |
| `POST` | `/bookings/:id/cancel` | → `CANCELLED`, restores inventory |

**Create body:**
```json
{
  "customer_id": 1,
  "booking_type": "FLIGHT",
  "destination": "Dubai",
  "total_price": 1498.00,
  "passengers": [
    { "first_name": "John", "last_name": "Doe", "date_of_birth": "1990-05-10", "passport_number": "P1234567" }
  ],
  "flight_id": 3,
  "departure_date": "2026-10-15",
  "return_date": "2026-10-22"
}
```
Errors: `400` missing fields · `404` unknown booking.

## Inventory

| Method | Path | Description |
|---|---|---|
| `GET` | `/flights?destination=&origin=&date=` | Flight search |
| `GET` | `/hotels?city=&country=` | Hotel search |
| `GET` | `/tours?destination=` | Tour package catalog |
| `POST` | `/flights` `/hotels` `/tours` | Add inventory (admin) |

## Call Center

| Method | Path | Description |
|---|---|---|
| `GET` | `/calls?status=` | Call history |
| `GET` | `/calls/live` | Currently active calls |
| `GET` | `/calls/:id` | Call + transcripts + recording + AI summary |
| `POST` | `/calls/start` | Initiate call (`phone_number`, `customer_id`, `direction`) |
| `GET` | `/calls/:id/transcript` | Fetch transcript lines |
| `POST` | `/calls/:id/transcript` | Append transcript line (`speaker`, `message`) |
| `POST` | `/calls/:id/transfer` | Transfer to agent/department |
| `POST` | `/calls/:id/end` | End call, generate AI summary + recording |

**Real-time (Socket.IO):** `call:new`, `call:transcript`, `call:transferred`, `call:ended`.

## AI & Voice

### `POST /ai/message`
```json
// Request
{ "message": "I want to book a flight to Dubai for 2 passengers", "session_id": "abc123" }
// Response 200
{
  "response": "I found 3 flights to Dubai...",
  "intent": "FLIGHT",
  "confidence": 0.95,
  "language": "en",
  "entities": { "destination": "Dubai", "passengers": 2 },
  "sentiment": "POSITIVE",
  "sentiment_score": 0.8,
  "priority": "LOW",
  "should_escalate": false,
  "escalate_department": null,
  "data": { "flights": [ ... ] }
}
```

| Method | Path | Description |
|---|---|---|
| `POST` | `/ai/analyze` | Intent + entities + confidence only |
| `POST` | `/ai/sentiment` | Sentiment & priority only |
| `POST` | `/ai/transcribe` | Audio → text transcription (STT) |
| `POST` | `/ai/speak` | Text → audio synthesis (TTS, voice pitch/speed settings) |
| `POST` | `/ai/call-simulate` | Simulate a full customer call conversation |

## Knowledge Base (RAG)

| Method | Path | Description |
|---|---|---|
| `GET` | `/knowledge` | List indexed documents |
| `POST` | `/knowledge` | Add document (auto-chunks & indexes) |
| `DELETE` | `/knowledge/:id` | Delete document |
| `POST` | `/knowledge/search` | Hybrid vector + keyword search — body: `{"query": "refund policy"}` |

**Search response** includes ranked chunks plus a `grounded_answer` composed from the top policy excerpts.

## Customers, Agents, Messages, Payments, Telephony, Analytics, Notifications

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/customers` · `GET/PUT/DELETE /customers/:id` | CRM profiles |
| `GET` | `/customers/:id/calls` `/customers/:id/bookings` | Customer-360 history |
| `GET` | `/agents` `/agents/departments` · `PUT /agents/:id/status` | Roster & availability toggle |
| `GET/POST` | `/messages` | Omnichannel inbox (SMS/WHATSAPP/EMAIL/CHAT) |
| `GET/POST` | `/payments` · `POST /payments/:id/refund` | Payments & refunds |
| `POST` | `/telephony/incoming` `/telephony/status` `/telephony/recording` | Telephony webhooks (simulated) |
| `GET` | `/analytics/dashboard` | Calls/day, revenue, AI resolution rate, top destinations |
| `GET` | `/notifications` · `PUT /notifications/:id/read` · `POST /notifications/read-all` | Notification center |

## Status Codes
`200` OK · `201` Created · `400` Validation error · `401` Missing/invalid JWT · `404` Not found · `500` Server error.
