# ✈️ TravelAI — AI Travel Agency Call Center & Booking System

An ultra-modern, full-stack AI-powered travel agency platform featuring an **AI customer service call center**, **speech-to-text & text-to-speech voice interactions**, **intent detection & smart routing**, a **RAG knowledge base**, a full **flight/hotel/tour booking engine**, **CRM**, and a **real-time live agent dashboard**.

![Stack](https://img.shields.io/badge/Flask-React-blue) ![DB](https://img.shields.io/badge/SQLite%20%7C%20MySQL-hybrid-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Core Features

| Module | Description |
|---|---|
| 🤖 **AI Voice Agent** | Conversational agent handling bookings, cancellations, refunds, visa & policy questions with multi-language support (EN / HE / AR / AM) |
| 🎙️ **Speech Engine** | Browser-native Web Speech API for STT & TTS plus backend audio synthesis endpoints |
| 🧭 **Intent Detection** | Detects `BOOKING`, `FLIGHT`, `HOTEL`, `TOUR`, `PRICE`, `VISA`, `CANCELLATION`, `REFUND`, `COMPLAINT`, `HUMAN_AGENT`, `BOOKING_STATUS` with entity extraction (destination, dates, passengers, budget) |
| 😊 **Sentiment & Summaries** | Real-time sentiment scoring (`POSITIVE`/`NEUTRAL`/`NEGATIVE`/`FRUSTRATED`) and auto-generated call summaries with action items |
| 📚 **RAG Knowledge Base** | Document chunking, TF-IDF vectorization & hybrid keyword/vector search over policies, visa guides, baggage rules |
| 🔀 **Smart Routing** | Rule-based + workload-based agent assignment with automatic escalation to live human agents (confidence < 0.70, refunds, complaints) |
| 🎫 **Booking Engine** | Full lifecycle: `PENDING → CONFIRMED → COMPLETED / CANCELLED` with inventory seat/room management |
| 👥 **CRM** | Customer-360 profiles with booking, call, and message history |
| 📡 **Omnichannel** | SMS, WhatsApp, Email & Webchat message simulation |
| 📊 **Analytics & BI** | Calls per day, department breakdown, AI vs Human resolution rate, revenue trends, top destinations |
| ⚡ **Real-time** | Flask-SocketIO live call events, transcript streaming, and dashboard updates |

---

## 🏗️ Architecture

```
TravelAI/
├── backend/                  # Flask API + AI engine
│   ├── app/
│   │   ├── ai/               # intent, sentiment, summarizer, RAG, embeddings, voice agent
│   │   ├── config/           # settings (dev / prod / test)
│   │   ├── integrations/     # telephony, sms, whatsapp, email, payment adapters
│   │   ├── models/           # 18 SQLAlchemy models
│   │   ├── routes/           # 15 REST blueprints
│   │   ├── services/         # booking, call, routing, customer, payment, notification
│   │   └── utils/            # auth helpers
│   ├── seed.py               # comprehensive demo data seeder
│   ├── tests/                # pytest suite (21 tests)
│   └── run.py
├── frontend/                 # React 19 + Vite + Tailwind CSS
│   └── src/
│       ├── components/       # layout, call widgets
│       ├── context/          # AuthContext, SocketContext
│       ├── pages/            # 19 pages (Dashboard, LiveCalls, Bookings, ...)
│       ├── routes/           # AppRoutes
│       └── services/         # API clients
├── docs/                     # architecture, database, api, ai-flow, deployment
├── docker-compose.yml
└── README.md
```

**Backend:** Python Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, Flask-SocketIO
**Database:** SQLite out-of-the-box (`travelai.db`), configurable to MySQL via `.env`
**Frontend:** React (Vite), Tailwind CSS, Lucide Icons, Recharts

---

## 🚀 Quick Start

### Option A — Docker (recommended for production)

```bash
docker-compose up --build
# Frontend:  http://localhost
# API:       http://localhost:5000/api/health
```

### Option B — Local Development

**1. Backend**

```bash
cd backend
pip install -r requirements.txt
python seed.py        # seed demo data (departments, agents, flights, hotels, tours...)
python run.py         # http://localhost:5000
```

**2. Frontend**

```bash
cd frontend
npm install
npm run dev           # http://localhost:5173
```

> ⚠️ **Windows note:** if the project path contains `&` (e.g. this repo), `npm run build` may fail because
> `npm.cmd` routes through `cmd.exe`. Workaround: `node node_modules/vite/bin/vite.js build`, or move the
> repo to a path without special characters.

### Demo Accounts (1-click logins)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@travelai.com` | `admin123` |
| Manager | `manager@travelai.com` | `manager123` |
| Agent | `agent@travelai.com` | `agent123` |

---

## 🧪 Verification

```bash
# Backend tests (21 tests: API, AI engine, booking lifecycle)
cd backend && python -m pytest tests/ -v

# Frontend build
cd frontend && npm run build
```

Manual smoke test:

```bash
curl http://localhost:5000/api/health
# {"status": "healthy", "service": "TravelAI Call Center & Booking API", "version": "1.0.0"}
```

---

## 🔌 API Overview

Base URL: `http://localhost:5000/api` — see **[docs/api.md](docs/api.md)** for the full reference.

| Endpoint | Description |
|---|---|
| `POST /auth/login` | JWT authentication |
| `GET/POST /bookings` | Booking CRUD + `/confirm`, `/cancel` lifecycle |
| `GET /flights` `/hotels` `/tours` | Searchable inventories |
| `GET /calls/live` | Active call queue |
| `POST /calls/start` | Initiate call |
| `POST /ai/message` | AI voice agent utterance processing |
| `POST /knowledge/search` | RAG knowledge base search |
| `GET /analytics/dashboard` | Call center metrics |

---

## 📚 Documentation

- [docs/architecture.md](docs/architecture.md) — system design & module map
- [docs/database.md](docs/database.md) — 18-model ERD & schema
- [docs/api.md](docs/api.md) — full REST API reference
- [docs/ai-flow.md](docs/ai-flow.md) — AI pipeline: intent → RAG → voice → routing
- [docs/deployment.md](docs/deployment.md) — Docker, MySQL, and production checklist

---

## 📄 License

MIT — see [LICENSE](LICENSE).
