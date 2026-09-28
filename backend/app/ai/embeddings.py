import math
import re
import json
from collections import Counter

class EmbeddingService:
    """
    Self-contained TF-IDF / Term Frequency vectorizer and cosine similarity engine.
    Computes semantic vector representations for knowledge base documents.
    """

    @classmethod
    def tokenize(cls, text: str) -> list:
        text = text.lower()
        return re.findall(r'\b[a-zA-Z0-9_\u0590-\u05FF\u0600-\u06FF\u1200-\u137F]{2,}\b', text)

    @classmethod
    def get_embedding(cls, text: str) -> str:
        """Returns JSON serialized term frequency vector for storage"""
        tokens = cls.tokenize(text)
        if not tokens:
            return json.dumps({})
        counts = Counter(tokens)
        total = float(len(tokens))
        vec = {word: count / total for word, count in counts.items()}
        return json.dumps(vec)

    @classmethod
    def cosine_similarity(cls, vec1_json: str, vec2_json: str) -> float:
        try:
            v1 = json.loads(vec1_json) if isinstance(vec1_json, str) else vec1_json
            v2 = json.loads(vec2_json) if isinstance(vec2_json, str) else vec2_json
        except Exception:
            return 0.0

        if not v1 or not v2:
            return 0.0

        common_words = set(v1.keys()).intersection(set(v2.keys()))
        dot_product = sum(v1[w] * v2[w] for w in common_words)

        mag1 = math.sqrt(sum(val * val for val in v1.values()))
        mag2 = math.sqrt(sum(val * val for val in v2.values()))

        if mag1 == 0 or mag2 == 0:
            return 0.0

        return dot_product / (mag1 * mag2)
