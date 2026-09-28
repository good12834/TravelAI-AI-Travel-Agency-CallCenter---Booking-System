from datetime import datetime
from app.extensions import db

class KnowledgeDocument(db.Model):
    __tablename__ = 'knowledge_documents'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    file_name = db.Column(db.String(255), nullable=True)
    file_type = db.Column(db.String(50), default='POLICY') # PDF, DOCX, TXT, FAQ, POLICY, VISA
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='INDEXED') # PENDING, PROCESSING, INDEXED, ERROR
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    chunks = db.relationship('KnowledgeChunk', backref='document', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'file_name': self.file_name,
            'file_type': self.file_type,
            'content': self.content,
            'status': self.status,
            'chunk_count': self.chunks.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
