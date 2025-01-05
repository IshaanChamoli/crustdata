'use client';
import { useState } from 'react';

export default function RAGBuilder() {
  const [chunks, setChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddChunk = () => {
    if (!currentChunk.trim()) return;
    
    if (editingIndex !== null) {
      // Edit existing chunk
      const newChunks = [...chunks];
      newChunks[editingIndex] = currentChunk;
      setChunks(newChunks);
      setEditingIndex(null);
    } else {
      // Add new chunk
      setChunks([...chunks, currentChunk]);
    }
    setCurrentChunk('');
  };

  const handleEditChunk = (index) => {
    setCurrentChunk(chunks[index]);
    setEditingIndex(index);
  };

  const handleDeleteChunk = (index) => {
    setChunks(chunks.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentChunk('');
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">RAG Builder</h1>
        
        {/* Input Section */}
        <div className="mb-8">
          <div className="flex gap-4 mb-2">
            <textarea
              value={currentChunk}
              onChange={(e) => setCurrentChunk(e.target.value)}
              placeholder="Enter your text chunk here..."
              className="flex-1 p-3 border rounded-lg min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddChunk}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 h-fit"
            >
              {editingIndex !== null ? 'Update Chunk' : 'Add Chunk'}
            </button>
          </div>
        </div>

        {/* Chunks Display */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Text Chunks ({chunks.length})</h2>
          {chunks.map((chunk, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">Chunk {index + 1}</div>
                  <div className="whitespace-pre-wrap">{chunk}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditChunk(index)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteChunk(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {chunks.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No chunks added yet. Start by adding some text above.
            </div>
          )}
        </div>

        {/* Action Buttons (for future implementation) */}
        <div className="mt-8 flex gap-4">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            disabled={chunks.length === 0}
            onClick={() => alert('Generate Embeddings functionality coming soon!')}
          >
            Generate Embeddings
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            disabled={chunks.length === 0}
            onClick={() => alert('Upload to Vector DB functionality coming soon!')}
          >
            Upload to Vector DB
          </button>
        </div>
      </div>
    </div>
  );
} 