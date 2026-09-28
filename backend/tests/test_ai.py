import unittest
import sys
import os
from unittest import mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.ai.intent import IntentClassifier
from app.ai.sentiment import SentimentAnalyzer
from app.ai.summarizer import ConversationSummarizer
from app.ai.embeddings import EmbeddingService
from app.ai.rag import RAGService
from app.ai.voice_agent import VoiceAgent
from app.models.ai_session import AISession
from app.models.call import Call
from app.services.ai_session_service import AISessionService
from app.services.call_service import CallService


class AIEngineTestCase(unittest.TestCase):
    """Unit tests for the TravelAI AI engine: intent, sentiment, summarizer, embeddings, RAG."""

    def setUp(self):
        self.app = create_app('development')
        self.app.config['TESTING'] = True
        with self.app.app_context():
            db.create_all()

    def test_intent_language_detection(self):
        self.assertEqual(IntentClassifier.detect_language("I want to book a flight"), "en")
        self.assertEqual(IntentClassifier.detect_language("אני רוצה לבטל את ההזמנה"), "he")
        self.assertEqual(IntentClassifier.detect_language("أريد استرداد أموال"), "ar")

    def test_intent_entity_extraction(self):
        # Rules only: the extraction contract must not depend on a live LLM call
        res = IntentClassifier.classify(
            "Book a hotel in Tokyo on 2026-10-15 for 2 people with a $3000 budget", use_gemini=False
        )
        self.assertEqual(res["intent"], "HOTEL")
        self.assertEqual(res["entities"]["destination"], "Tokyo")
        self.assertEqual(res["entities"]["passengers"], 2)
        self.assertEqual(res["entities"]["departure_date"], "2026-10-15")
        self.assertEqual(res["entities"]["budget"], 3000.0)

    def test_intent_priority_overrides(self):
        # High-priority intents should win over generic booking language
        res = IntentClassifier.classify("I want a refund for my flight booking")
        self.assertEqual(res["intent"], "REFUND")

        res2 = IntentClassifier.classify("cancel my hotel reservation")
        self.assertEqual(res2["intent"], "CANCELLATION")

    def test_intent_confidence_thresholds(self):
        res_strong = IntentClassifier.classify("I want to book a hotel room for my stay", use_gemini=False)
        self.assertGreaterEqual(res_strong["confidence"], 0.85)

        res_weak = IntentClassifier.classify("Hello there", use_gemini=False)
        self.assertLessEqual(res_weak["confidence"], 0.85)
        self.assertEqual(res_weak["intent"], "GENERAL")

    def test_sentiment_scale(self):
        pos = SentimentAnalyzer.analyze("Everything was amazing, thank you for the wonderful trip!")
        self.assertEqual(pos["sentiment"], "POSITIVE")
        self.assertGreater(pos["sentiment_score"], 0)

        neg = SentimentAnalyzer.analyze("Terrible experience, my booking is ruined and this is unacceptable")
        self.assertIn(neg["sentiment"], ["NEGATIVE", "FRUSTRATED"])
        self.assertLess(neg["sentiment_score"], 0)

        neu = SentimentAnalyzer.analyze("What time does the flight depart tomorrow")
        self.assertIn(neu["sentiment"], ["NEUTRAL", "POSITIVE"])

    def test_summarizer_generates_action_items(self):
        transcripts = [
            {"speaker": "CUSTOMER", "message": "I want a refund for booking TRV-2026-0001"},
            {"speaker": "AI", "message": "Routing you to Finance Department."},
        ]
        res = ConversationSummarizer.summarize(transcripts, intent="REFUND", customer_name="John Smith")
        self.assertIn("John Smith", res["summary"])
        self.assertTrue(any("refund" in a.lower() for a in res["action_items"]))
        self.assertTrue(len(res["key_points"]) > 0)

        empty = ConversationSummarizer.summarize([], intent="GENERAL")
        self.assertIn("initiated contact", empty["summary"])

    def test_embedding_similarity(self):
        vec_a = EmbeddingService.get_embedding("refund policy for cancelled flights")
        vec_b = EmbeddingService.get_embedding("cancellation and refund terms")
        vec_c = EmbeddingService.get_embedding("hotel room availability in Dubai")

        sim_related = EmbeddingService.cosine_similarity(vec_a, vec_b)
        sim_unrelated = EmbeddingService.cosine_similarity(vec_a, vec_c)

        self.assertGreater(sim_related, 0)
        self.assertGreater(sim_related, sim_unrelated)

    def test_rag_answer_with_context(self):
        chunks = [{"content": "Cancellations are free up to 48 hours before departure.", "score": 0.9}]
        answer = RAGService.answer_with_context("what is the cancellation policy", chunks)
        self.assertIn("TravelAI policy", answer)

        fallback = RAGService.answer_with_context("query", [])
        self.assertIn("human travel agents", fallback)

    def test_voice_agent_escalation_flow(self):
        with self.app.app_context():
            # Human agent request -> immediate escalation
            res = VoiceAgent.process_utterance("I need to speak with a human agent now")
            self.assertTrue(res["should_escalate"])
            self.assertEqual(res["escalate_department"], "Customer Support")

            # Refund -> escalation to Finance
            res_refund = VoiceAgent.process_utterance("I want a refund for my last booking")
            self.assertTrue(res_refund["should_escalate"])
            self.assertEqual(res_refund["escalate_department"], "Finance Department")

            # Normal flight inquiry -> no escalation, actionable response
            res_flight = VoiceAgent.process_utterance("I want to book a flight to Dubai for 2 passengers")
            self.assertFalse(res_flight["should_escalate"])
            self.assertIn("Dubai", res_flight["response"])


    def _offline_ai(self):
        """Conversation tests must not depend on the live LLM or the knowledge base."""
        return (
            mock.patch('app.ai.gemini_client.GeminiClient.generate_json', return_value=None),
            mock.patch('app.ai.gemini_client.GeminiClient.generate_text', return_value=None),
            mock.patch('app.ai.rag.RAGService.search_knowledge', return_value=[]),
        )

    def test_sentiment_lexicon_does_not_flag_calm_turns(self):
        """Word-boundary matching: "issue" must not match the frustration word "sue"."""
        calm = SentimentAnalyzer.analyze("My booking has an issue with the seat", use_gemini=False)
        self.assertNotEqual(calm["sentiment"], "FRUSTRATED")
        self.assertFalse(calm["escalate_recommended"])

        neutral = SentimentAnalyzer.analyze("and I need it from tomorrow", use_gemini=False)
        self.assertEqual(neutral["sentiment"], "NEUTRAL")
        self.assertFalse(neutral["escalate_recommended"])

        # Inflections must keep matching on whole words
        delayed = SentimentAnalyzer.analyze("the flight was delayed", use_gemini=False)
        self.assertEqual(delayed["sentiment"], "NEGATIVE")

        angry = SentimentAnalyzer.analyze("This is unacceptable, I want a lawyer", use_gemini=False)
        self.assertEqual(angry["sentiment"], "FRUSTRATED")
        self.assertTrue(angry["escalate_recommended"])

    def test_voice_agent_remembers_details_across_turns(self):
        """Turn 2 ("for 4 people") must build on turn 1 ("hotel in Dubai")."""
        json_patch, text_patch, rag_patch = self._offline_ai()
        with self.app.app_context(), json_patch, text_patch, rag_patch:
            opening = VoiceAgent.process_utterance("I want to book a hotel in Dubai")
            self.assertEqual(opening["entities"]["destination"], "Dubai")
            self.assertEqual(opening["turn_count"], 1)

            follow_up = VoiceAgent.process_utterance(
                "for 4 people", session_context=opening["session_context"]
            )

            # Without session memory this turn had no destination at all
            self.assertEqual(follow_up["entities"]["destination"], "Dubai")
            self.assertEqual(follow_up["entities"]["passengers"], 4)
            self.assertEqual(follow_up["intent"], "GENERAL")
            self.assertEqual(follow_up["resolved_intent"], "HOTEL")
            self.assertIn("Dubai", follow_up["response"])
            self.assertEqual(follow_up["turn_count"], 2)
            # A calm booking detail must never trigger the apology / supervisor handoff
            self.assertFalse(follow_up["should_escalate"])

    def test_voice_agent_greets_once_per_conversation(self):
        """The assistant must not reintroduce itself on every unresolved turn."""
        json_patch, text_patch, rag_patch = self._offline_ai()
        with self.app.app_context(), json_patch, text_patch, rag_patch:
            opening = VoiceAgent.process_utterance("Hello")
            self.assertIn("Thank you for calling TravelAI", opening["response"])
            self.assertTrue(opening["session_context"]["greeted"])

            later = VoiceAgent.process_utterance(
                "Hi there", session_context=opening["session_context"]
            )
            self.assertNotIn("Thank you for calling TravelAI", later["response"])
            self.assertTrue(later["session_context"]["greeted"])
            self.assertEqual(later["turn_count"], 2)

    def test_voice_agent_acknowledges_courtesy_turn(self):
        """A "thanks" turn must be acknowledged, not answered with the previous question."""
        json_patch, text_patch, rag_patch = self._offline_ai()
        with self.app.app_context(), json_patch, text_patch, rag_patch:
            first = VoiceAgent.process_utterance("I want a hotel in Dubai")
            thanks = VoiceAgent.process_utterance(
                "thanks, that helps", session_context=first["session_context"]
            )

            self.assertNotEqual(thanks["response"], first["response"])
            self.assertIn("Dubai", thanks["response"])
            self.assertEqual(thanks["intent"], "GENERAL")
            self.assertFalse(thanks["should_escalate"])

    def test_voice_agent_never_greets_after_the_first_turn(self):
        """Even when turn 1 was handled by a topic branch, turn 2 must not re-open the call."""
        json_patch, text_patch, rag_patch = self._offline_ai()
        with self.app.app_context(), json_patch, text_patch, rag_patch:
            resumed = VoiceAgent.process_utterance(
                "hmm, hello again",
                session_context={"entities": {}, "turn_count": 1, "greeted": False, "last_intent": "HOTEL"},
            )

            self.assertNotIn("Thank you for calling TravelAI", resumed["response"])
            self.assertEqual(resumed["turn_count"], 2)
            self.assertTrue(resumed["session_context"]["greeted"])

    def test_ai_session_service_persists_conversation_memory(self):
        """The call loop reloads the same session and its accumulated entities."""
        json_patch, text_patch, rag_patch = self._offline_ai()
        with self.app.app_context(), json_patch, text_patch, rag_patch:
            call = CallService.initiate_call('+15550001234', direction='INBOUND')
            try:
                session = AISessionService.get_or_create_session(call_id=call.id)
                first = VoiceAgent.process_utterance(
                    "I want to fly to Tokyo", session_context=AISessionService.build_context(session)
                )
                AISessionService.save_turn(session, "I want to fly to Tokyo", first)

                # A later turn finds the same memory again
                reloaded = AISessionService.get_or_create_session(call_id=call.id)
                self.assertEqual(reloaded.id, session.id)
                self.assertEqual(AISession.query.filter_by(call_id=call.id).count(), 1)

                context = AISessionService.build_context(reloaded)
                self.assertEqual(context["entities"]["destination"], "Tokyo")
                self.assertEqual(context["turn_count"], 1)

                second = VoiceAgent.process_utterance(
                    "for 2 passengers",
                    session_context=context,
                    history=AISessionService.load_history(reloaded)
                )
                AISessionService.save_turn(reloaded, "for 2 passengers", second)

                self.assertIn("Tokyo", second["response"])
                self.assertEqual(second["entities"]["passengers"], 2)
                # Two turns => 4 stored messages, and the call's memory is closed at the end
                self.assertEqual(len(AISessionService.load_history(reloaded)), 4)
                AISessionService.close_session(call_id=call.id)
                self.assertEqual(reloaded.status, "CLOSED")
            finally:
                for stored in AISession.query.filter_by(call_id=call.id).all():
                    db.session.delete(stored)
                db.session.delete(call)
                db.session.commit()


if __name__ == '__main__':
    unittest.main()
