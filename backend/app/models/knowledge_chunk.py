from datetime import datetime
from app.extensions import db

class KnowledgeChunk(db.Model):
    __tablename__ = 'knowledge_chunks'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    embedding = db.Column(db.Text, nullable=True) # JSON string representation of embedding vector
    chunk_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'content': self.content,
            'chunk_index': self.chunk_index,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
