'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function RAGBuilder() {
  const [chunks, setChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddChunk = () => {
    if (!currentChunk.trim()) return;
    
    if (editingIndex !== null) {
      const newChunks = chunks.map(chunk => 
        chunk.originalIndex === editingIndex + 1 
          ? { ...chunk, content: currentChunk }
          : chunk
      );
      setChunks(newChunks);
      setEditingIndex(null);
    } else {
      const nextIndex = chunks.length + 1;
      setChunks([
        { content: currentChunk, originalIndex: nextIndex, timestamp: Date.now() },
        ...chunks
      ]);
    }
    setCurrentChunk('');
  };

  const handleEditChunk = (index) => {
    const chunk = chunks.find(c => c.originalIndex === index);
    if (chunk) {
      setCurrentChunk(chunk.content);
      setEditingIndex(index - 1);
    }
  };

  const handleDeleteChunk = (index) => {
    setChunks(chunks.filter(chunk => chunk.originalIndex !== index));
    if (editingIndex === index - 1) {
      setEditingIndex(null);
      setCurrentChunk('');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex justify-between items-center bg-white">
        <h1 className="text-2xl font-bold">RAG Builder</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to Chat
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Fixed */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="flex-1 p-6 flex flex-col">
            {/* Add Chunk Button - Now at Top */}
            <button
              onClick={handleAddChunk}
              className="w-full px-6 py-2 mb-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {editingIndex !== null ? 'Update Chunk' : 'Add Chunk'}
            </button>

            {/* Input Area - Fixed Height */}
            <div className="h-[200px] mb-4">
              <textarea
                value={currentChunk}
                onChange={(e) => setCurrentChunk(e.target.value)}
                placeholder="Enter your markdown text here..."
                className="h-full w-full p-4 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Preview Area - Scrollable */}
            <div className="flex-1 min-h-0">
              {currentChunk ? (
                <div className="h-full border rounded-lg bg-gray-50 flex flex-col">
                  <div className="p-3 border-b bg-gray-50 text-sm text-gray-500">
                    Preview:
                  </div>
                  <div className="flex-1 min-h-0">
                    <div className="h-full overflow-y-auto">
                      <div className="p-4">
                        <ReactMarkdown
                          className="prose prose-sm max-w-none"
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2" {...props} />,
                            p: ({node, ...props}) => <p className="mb-4" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            code: ({node, inline, ...props}) => 
                              inline ? (
                                <code className="bg-gray-100 rounded px-1 py-0.5 text-sm" {...props} />
                              ) : (
                                <code className="block bg-gray-100 rounded p-2 overflow-x-auto text-sm my-2" {...props} />
                              ),
                          }}
                        >
                          {currentChunk}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full border rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  Preview will appear here
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Independently Scrollable */}
        <div className="w-1/2 flex flex-col">
          <div className="p-6 border-b bg-white">
            <h2 className="text-xl font-semibold">Text Chunks ({chunks.length})</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
              {chunks.map((chunk) => (
                <div
                  key={chunk.originalIndex}
                  className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="border-b bg-gray-50 px-4 py-2 flex justify-between items-center">
                    <div className="text-sm text-gray-500">Chunk {chunk.originalIndex}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditChunk(chunk.originalIndex)}
                        className="px-3 py-1 text-sm text-blue-500 hover:bg-blue-50 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteChunk(chunk.originalIndex)}
                        className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <ReactMarkdown
                      className="prose prose-sm max-w-none"
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        code: ({node, inline, ...props}) => 
                          inline ? (
                            <code className="bg-gray-100 rounded px-1 py-0.5 text-sm" {...props} />
                          ) : (
                            <code className="block bg-gray-100 rounded p-2 overflow-x-auto text-sm my-2" {...props} />
                          ),
                      }}
                    >
                      {chunk.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              
              {chunks.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No chunks added yet. Start by adding some markdown text on the left.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Fixed at Bottom */}
          {chunks.length > 0 && (
            <div className="p-6 border-t bg-white">
              <div className="flex gap-4">
                <button
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  onClick={() => alert('Generate Embeddings functionality coming soon!')}
                >
                  Generate Embeddings
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  onClick={() => alert('Upload to Vector DB functionality coming soon!')}
                >
                  Upload to Vector DB
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 