import re
from app.extensions import db
from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_chunk import KnowledgeChunk
from app.ai.embeddings import EmbeddingService

class RAGService:
    """
    Retrieval-Augmented Generation service for TravelAI.
    Manages document indexing, chunking, semantic retrieval, and context augmentation.
    """

    CHUNK_SIZE = 300 # Characters per chunk with overlap
    CHUNK_OVERLAP = 50

    @classmethod
    def index_document(cls, document_id: int):
        doc = KnowledgeDocument.query.get(document_id)
        if not doc or not doc.content:
            return

        # Delete existing chunks for this document
        KnowledgeChunk.query.filter_by(document_id=doc.id).delete()

        content = doc.content
        chunks = []
        start = 0
        chunk_idx = 0

        while start < len(content):
            end = min(start + cls.CHUNK_SIZE, len(content))
            chunk_text = content[start:end].strip()
            if chunk_text:
                embedding_json = EmbeddingService.get_embedding(chunk_text)
                chunk = KnowledgeChunk(
                    document_id=doc.id,
                    content=chunk_text,
                    embedding=embedding_json,
                    chunk_index=chunk_idx
                )
                db.session.add(chunk)
                chunks.append(chunk)
                chunk_idx += 1
            start += (cls.CHUNK_SIZE - cls.CHUNK_OVERLAP)

        doc.status = "INDEXED"
        db.session.commit()
        return len(chunks)

    @classmethod
    def search_knowledge(cls, query: str, top_k: int = 3) -> list:
        if not query:
            return []

        query_vec = EmbeddingService.get_embedding(query)
        chunks = KnowledgeChunk.query.all()
        scored_chunks = []

        query_lower = query.lower()
        query_words = set(EmbeddingService.tokenize(query))

        for c in chunks:
            sim = 0.0
            if c.embedding:
                sim = EmbeddingService.cosine_similarity(query_vec, c.embedding)
            
            # Keyword bonus
            c_text_lower = c.content.lower()
            keyword_matches = sum(1 for w in query_words if w in c_text_lower)
            final_score = sim + (keyword_matches * 0.15)

            if final_score > 0.05 or keyword_matches > 0:
                scored_chunks.append({
                    "id": c.id,
                    "document_id": c.document_id,
                    "document_title": c.document.title if c.document else "Policy",
                    "content": c.content,
                    "score": round(final_score, 4)
                })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    @classmethod
    def answer_with_context(cls, query: str, context_chunks: list, use_gemini: bool = True) -> str:
        if not context_chunks:
            return "I couldn't find specific company policy documentation regarding this inquiry. Let me connect you with one of our human travel agents to assist you."

        context_str = " ".join([c["content"] for c in context_chunks])

        if use_gemini:
            try:
                from app.ai.gemini_client import GeminiClient

                prompt = f"""You are TravelAI's customer service agent.
Answer the traveler's question accurately and helpfully based strictly on the provided policy documents below.
State clearly: 'According to TravelAI policy:' in your response.
Be concise (2-4 sentences max), conversational, and friendly.

Policy excerpts:
{context_str}

Customer Question:
"{query}"
"""
                gemini_text = GeminiClient.generate_text(prompt, temperature=0.2)
                if gemini_text and len(gemini_text.strip()) > 10:
                    return gemini_text.strip()
            except Exception:
                pass

        return f"According to TravelAI policy: {context_str[:300]}... If you would like further details or booking assistance, I can arrange that right away."
