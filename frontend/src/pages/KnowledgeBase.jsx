import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  Layers, 
  CheckCircle2,
  HelpCircle,
  X
} from 'lucide-react';

export const KnowledgeBase = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState('What is the refund and cancellation policy?');
  const [ragResult, setRagResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    file_type: 'POLICY',
    content: ''
  });

  useEffect(() => {
    fetchDocs();
    handleSearchKnowledge('What is the refund and cancellation policy?');
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/knowledge');
      setDocuments(res.data);
    } catch (err) {
      console.error("Fetch docs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKnowledge = async (queryText) => {
    const q = queryText || testQuery;
    if (!q.trim()) return;

    setSearching(true);
    try {
      const res = await api.post('/knowledge/search', { query: q, top_k: 3 });
      setRagResult(res.data);
    } catch (err) {
      console.error("RAG search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.content) return;

    try {
      await api.post('/knowledge', newDoc);
      setShowAddModal(false);
      setNewDoc({ title: '', file_type: 'POLICY', content: '' });
      fetchDocs();
    } catch (err) {
      alert("Error indexing document");
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm("Delete this document and its indexed chunks?")) return;
    try {
      await api.delete(`/knowledge/${id}`);
      fetchDocs();
    } catch (err) {
      console.error("Delete doc error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-purple-400" />
            RAG Knowledge Base
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Retrieval-Augmented Generation policies, visa guidelines, FAQs, and semantic vector chunk search.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Policy / FAQ Doc</span>
        </button>
      </div>

      {/* RAG Interactive Test Engine */}
      <div className="glass-panel p-6 rounded-3xl border-purple-500/30 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white font-heading">Interactive Semantic RAG Query Simulator</h2>
        </div>
        <p className="text-xs text-slate-400">
          Test how the AI retrieves policy chunks and grounds its conversational answers in real time:
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchKnowledge();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask any policy question (e.g. 'Can I get a refund?', 'Do I need a visa for Dubai?')..."
              className="w-full bg-slate-900 text-slate-100 text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-2xl transition-all shadow-md shadow-purple-600/20"
          >
            {searching ? 'Querying...' : 'Semantic Search'}
          </button>
        </form>

        {/* Grounded AI Answer */}
        {ragResult && (
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 space-y-2">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Grounded AI Answer to Customer
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {ragResult.grounded_answer}
              </p>
            </div>

            {/* Retrieved Chunks */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Retrieved Vector Chunks ({ragResult.results?.length || 0}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ragResult.results?.map((chunk, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold text-blue-400 truncate max-w-[140px]">{chunk.document_title}</span>
                      <span className="font-mono text-emerald-400">Score: {chunk.score}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-4">
                      "{chunk.content}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indexed Documents Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Indexed Knowledge Documents ({documents.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-5">Document Title</th>
                <th className="py-3.5 px-5">Type</th>
                <th className="py-3.5 px-5">Chunks</th>
                <th className="py-3.5 px-5">Vector Status</th>
                <th className="py-3.5 px-5">Added Date</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-white">
                    {d.title}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-purple-400 font-mono text-[10px]">
                      {d.file_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-cyan-400">
                    {d.chunk_count} chunks
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ● {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-400">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleDeleteDoc(d.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white font-heading mb-4">Index New Policy Document</h2>

            <form onSubmit={handleCreateDoc} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., European Schengen Visa Requirements"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Document Type</label>
                <select
                  value={newDoc.file_type}
                  onChange={(e) => setNewDoc({ ...newDoc, file_type: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                >
                  <option value="POLICY">Policy Document</option>
                  <option value="VISA">Visa Guidelines</option>
                  <option value="FAQ">FAQ</option>
                  <option value="AIRLINE">Airline Rules</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Content Text (will be chunked automatically)</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste policy rules, cancellation conditions, or visa procedures..."
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  className="w-full bg-slate-800 rounded-xl p-2.5 border border-slate-700 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl mt-4 shadow-lg shadow-purple-600/30"
              >
                Index & Generate Embeddings
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
