from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.knowledge_document import KnowledgeDocument
from app.ai.rag import RAGService

knowledge_bp = Blueprint('knowledge', __name__, url_prefix='/api/knowledge')

@knowledge_bp.route('', methods=['GET'])
def get_documents():
    docs = KnowledgeDocument.query.order_by(KnowledgeDocument.created_at.desc()).all()
    return jsonify([d.to_dict() for d in docs])

@knowledge_bp.route('', methods=['POST'])
def create_document():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    file_type = data.get('file_type', 'POLICY').upper()
    file_name = data.get('file_name', f"{title.lower().replace(' ', '_')}.txt")

    if not title or not content:
        return jsonify({"error": "Title and content are required"}), 400

    doc = KnowledgeDocument(
        title=title,
        content=content,
        file_type=file_type,
        file_name=file_name,
        status="PROCESSING"
    )
    db.session.add(doc)
    db.session.commit()

    # Index into RAG knowledge chunks
    chunk_count = RAGService.index_document(doc.id)

    return jsonify({
        "document": doc.to_dict(),
        "chunks_indexed": chunk_count
    }), 201

@knowledge_bp.route('/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    doc = KnowledgeDocument.query.get_or_404(doc_id)
    db.session.delete(doc)
    db.session.commit()
    return jsonify({"message": f"Document {doc_id} deleted"})

@knowledge_bp.route('/search', methods=['POST'])
def search_knowledge():
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    top_k = int(data.get('top_k', 3))

    if not query:
        return jsonify({"results": [], "answer": ""})

    results = RAGService.search_knowledge(query, top_k=top_k)
    grounded_answer = RAGService.answer_with_context(query, results)

    return jsonify({
        "query": query,
        "results": results,
        "grounded_answer": grounded_answer
    })
