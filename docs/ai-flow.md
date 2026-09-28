# TravelAI — AI Pipeline Flow

## 1. Conversation Turn Lifecycle

Every customer utterance flows through `VoiceAgent.process_utterance()`:

```
Customer speech (Browser Web Speech API STT)
        │
        ▼
┌──────────────────┐   ┌───────────────────┐   ┌────────────────────┐
│ IntentClassifier │──►│ SentimentAnalyzer │──►│ Entity Merger      │
│ keyword scores   │   │ lexicon scoring   │   │ (session context   │
│ priority rules   │   │ → sentiment score │   │  accumulates across│
│ lang detect      │   │ → priority/urgency│   │  turns)            │
└──────────────────┘   └───────────────────┘   └─────────┬──────────┘
                                                         ▼
                                              ┌─────────────────────┐
                                              │ Response Selector   │
                                              │ 1. Escalation check │
                                              │ 2. Inventory lookup │
                                              │ 3. RAG policy answer│
                                              │ 4. Fallback greeting│
                                              └─────────┬───────────┘
                                                        ▼
                                        ┌───────────────────────────┐
                                        │ RoutingService            │
                                        │ department + agent assign │
                                        │ Socket.IO broadcast       │
                                        └───────────────────────────┘
                                                        ▼
                                          AI reply (Browser speechSynthesis TTS)
```

## 2. Intent Detection

**12 intents:** `BOOKING`, `FLIGHT`, `HOTEL`, `TOUR`, `PRICE`, `VISA`, `CANCELLATION`, `REFUND`, `COMPLAINT`, `HUMAN_AGENT`, `BOOKING_STATUS`, `GENERAL`.

- **Scoring:** keyword frequency per intent (multilingual: EN + HE + AR + AM keywords).
- **Priority override:** `HUMAN_AGENT` > `REFUND` > `CANCELLATION` > `COMPLAINT` win immediately over generic booking phrases — a customer saying *"I want a refund for my flight"* routes to Finance, not the flight desk.
- **Confidence:** `0.95` (≥2 keyword hits) · `0.85` (1 hit) · `0.65` (0 hits, fallback).
- **Language detection** via Unicode script ranges (Hebrew `0590-05FF`, Arabic `0600-06FF`, Ethiopic `1200-137F`).

### Entity Extraction (regex)
| Entity | Example match |
|---|---|
| `destination` | "Dubai", "Tokyo", "Tel Aviv" (16 known cities) |
| `passengers` | "4 passengers", "couple" → 2, "family" → 4 |
| `booking_reference` | `TRV-2026-0001`, `BK-12345` |
| `departure_date` | `2026-10-15` |
| `budget` | "$3000", "1500 USD" |

## 3. Sentiment & Escalation

**Sentiment:** lexicon scoring → `POSITIVE` / `NEUTRAL` / `NEGATIVE` / `FRUSTRATED`, mapped to call priority (`LOW`/`MEDIUM`/`HIGH`/`URGENT`).

**Escalation triggers (RoutingService.check_escalation_rules):**
1. Customer explicitly requests a human (`HUMAN_AGENT`)
2. AI confidence **< 0.70**
3. `REFUND` intent (requires human financial authorization)
4. `COMPLAINT` or sentiment = `FRUSTRATED`

Because handing a caller to a supervisor is high impact, `SentimentAnalyzer` only
recommends escalation when the word lexicon corroborates it, or when the LLM reports
`FRUSTRATED` with an emphatic score (≤ `LLM_FRUSTRATION_SCORE`, default `-0.7`). A single
borderline model guess must never interrupt a calm booking call with an apology.

**Routing rules:**

| Intent | Department |
|---|---|
| FLIGHT | Flight Department |
| HOTEL | Hotel Department |
| BOOKING / TOUR / BOOKING_STATUS | Booking Department |
| VISA | Visa Department |
| REFUND | Finance Department |
| COMPLAINT / HUMAN_AGENT / GENERAL / PRICE | Customer Support |

Agent selection = `AVAILABLE` agents in the department ordered by **lowest `active_calls_count`** (workload balancing), with fallback to any available agent.

## 4. RAG Knowledge Pipeline

```
KnowledgeDocument (policy text)
   → chunked at 300 chars with 50-char overlap
   → each chunk embedded via TF-IDF (EmbeddingService)
   → stored in KnowledgeChunk.embedding (JSON)

Query:
   question → TF-IDF vector
   → cosine similarity against all chunk vectors
   → + keyword-overlap bonus (0.15 per matched word)
   → top-K chunks → answer_with_context()
```

The hybrid keyword bonus compensates for TF-IDF's lexical nature — exact policy terms ("48 hours", "baggage") rank reliably.

## 5. Voice Interaction

- **STT:** Browser `SpeechRecognition` API (Chrome/Edge) streams live transcript lines to `/api/calls/:id/transcript`.
- **TTS:** Browser `speechSynthesis` with configurable pitch/rate (Settings page); backend `/api/ai/tts` endpoint available for server-side synthesis.
- **Session memory:** `AISessionService` persists the turn state in `AISession.context_data` (accumulated entities, turn counter, greeting flag) and logs each turn in `AIMessage`. `/api/ai/call-turn`, `/api/ai/message` and `/api/messages` all reload that memory before answering, so a customer can say *"Dubai"* then *"for 4 people"* and the agent combines both. `CallService.end_call()` closes the session.
- **Greeting discipline:** the opening greeting is only used on the first turn of a conversation — and not at all when the call already opened with the welcome line. Later turns either continue the current topic, answer from the knowledge base, or acknowledge a courtesy turn instead of repeating the previous sentence.

## 6. Call Wrap-up

On `CallService.end_call()`:
1. Duration computed from start/end timestamps
2. `ConversationSummarizer` generates `ai_summary` + action items from full transcript
3. Simulated `CallRecording` attached
4. Assigned agent released (`AVAILABLE`, workload decremented)
5. `call:ended` Socket.IO event broadcast

## 7. LLM Upgrade Path

`app/ai/prompts.py` holds the system prompt (persona, escalation rules, extraction discipline). To swap the deterministic engine for an LLM, replace the response-selector step in `VoiceAgent` with an LLM call that receives: the system prompt + `RAGService.search_knowledge()` excerpts + session entities + sentiment. The rest of the pipeline (routing, escalation, summarizer) is unchanged.
