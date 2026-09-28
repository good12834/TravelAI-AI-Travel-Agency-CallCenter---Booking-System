# TravelAI — System Architecture

## 1. High-Level Overview

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  React Frontend (Vite)  │  HTTP  │      Flask Backend API       │
│  - Tailwind UI          │◄──────►│  ┌────────────────────────┐  │
│  - Recharts BI          │  REST  │  │ 15 Route Blueprints    │  │
│  - Web Speech API       │  JWT   │  ├────────────────────────┤  │
│  - Socket.IO client     │◄──────►│  │ Service Layer          │  │
└─────────────────────────┘ Socket │  │ (booking, call,        │  │
        ▲            WS events     │  │  routing, payment...)  │  │
        │                          │  ├────────────────────────┤  │
   Browser Mic/Speakers            │  │ AI Engine              │  │
   (STT / TTS)                     │  │ intent • sentiment     │  │
                                   │  │ RAG • summarizer       │  │
                                   │  │ voice_agent • prompts  │  │
                                   │  ├────────────────────────┤  │
                                   │  │ Integrations (mock)    │  │
                                   │  │ telephony sms whatsapp │  │
                                   │  │ email payment gateway  │  │
                                   │  └────────────────────────┘  │
                                   └──────────┬───────────────────┘
                                              │ SQLAlchemy
                                   ┌──────────▼───────────┐
                                   │  SQLite (default)    │
                                   │  MySQL (via .env)    │
                                   └──────────────────────┘
```

## 2. Layers

### 2.1 Presentation — `frontend/`
- **React 19 + Vite** SPA with React Router v7.
- **Tailwind CSS** glassmorphic design, dark/light theme.
- **Recharts** for analytics visualizations; **Lucide** icons.
- **Contexts:** `AuthContext` (JWT + user session), `SocketContext` (live call events).
- Voice calls use the **Web Speech API** (`SpeechRecognition` for STT, `speechSynthesis` for TTS) directly in the browser, falling back to backend audio endpoints.

### 2.2 API Layer — `backend/app/routes/`
15 Flask blueprints under `/api`: `auth`, `customers`, `calls`, `bookings`, `flights`, `hotels`, `tours`, `payments`, `messages`, `agents`, `analytics`, `knowledge`, `ai`, `telephony`, `notifications`. Authentication via **Flask-JWT-Extended** Bearer tokens.

### 2.3 Service Layer — `backend/app/services/`
Business logic decoupled from routes:
- `BookingService` — reference generation (`TRV-YYYY-XXXXXX`), passenger records, inventory seat/room decrement & restore on confirm/cancel.
- `CallService` — call lifecycle (`IN_PROGRESS → TRANSFERRED/COMPLETED`), transcript persistence, auto-summary on hang-up, simulated recording, Socket.IO broadcasting (`call:new`, `call:transcript`, `call:transferred`, `call:ended`).
- `RoutingService` — intent→department rules + workload-based agent selection + escalation rules (confidence < 0.70, refunds, complaints, explicit human request).
- `PaymentService`, `CustomerService`, `NotificationService`.

### 2.4 AI Engine — `backend/app/ai/`
Zero external API dependencies — fully self-contained:
- `IntentClassifier` — keyword scoring with high-priority overrides + regex entity extraction.
- `SentimentAnalyzer` — lexicon-based scoring → POSITIVE/NEUTRAL/NEGATIVE/FRUSTRATED + urgency priority.
- `EmbeddingService` — TF-IDF vectorizer & cosine similarity (no numpy/sklearn required).
- `RAGService` — 300-char chunking with 50-char overlap, hybrid vector+keyword retrieval.
- `VoiceAgent` — orchestrates the full conversational turn (see [ai-flow.md](ai-flow.md)).
- `ConversationSummarizer` — structured summaries with action items.

### 2.5 Data Layer
**Hybrid database:** SQLite (`travelai.db`) by default for zero-config startup; set `DATABASE_URL=mysql+pymysql://...` in `.env` for MySQL. 18 models (see [database.md](database.md)).

### 2.6 Real-time — Socket.IO
`Flask-SocketIO` (eventlet) emits live events to all connected dashboards: new calls, transcript chunks, transfers, call endings. Redis configured as message queue for multi-worker deployments.

## 3. Key Design Decisions

| Decision | Rationale |
|---|---|
| SQLite fallback | Runs out-of-the-box with zero external dependencies; MySQL optional via `.env` |
| Self-contained AI (no LLM API) | Deterministic, offline-capable, no API key costs; `prompts.py` ready for LLM swap-in |
| TF-IDF embeddings instead of transformers | No heavy deps; hybrid keyword bonus compensates for lexical matching |
| Browser Web Speech API | Native STT/TTS with no media streaming infrastructure needed |
| Mock integrations | Telephony/SMS/WhatsApp/payment adapters simulate external providers behind stable interfaces |
