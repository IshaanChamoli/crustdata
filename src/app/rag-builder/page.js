'use client';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

const WORD_LIMIT = 600;
const DOCUMENT_CATEGORIES = ['Document 1', 'Document 2'];

export default function RAGBuilder() {
  const [chunks, setChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [processingChunks, setProcessingChunks] = useState(new Set());
  const [categoryIndices, setCategoryIndices] = useState({
    'Document 1': 0,
    'Document 2': 0
  });

  // Load chunks from localStorage on component mount
  useEffect(() => {
    const savedChunks = localStorage.getItem('ragBuilderChunks');
    if (savedChunks) {
      try {
        const parsedChunks = JSON.parse(savedChunks);
        setChunks(parsedChunks);
        
        // Reconstruct category indices from loaded chunks
        const maxIndices = parsedChunks.reduce((acc, chunk) => ({
          ...acc,
          [chunk.category]: Math.max(acc[chunk.category] || 0, chunk.originalIndex)
        }), {
          'Document 1': 0,
          'Document 2': 0
        });
        
        setCategoryIndices(maxIndices);
      } catch (error) {
        console.error('Error loading chunks from localStorage:', error);
        localStorage.removeItem('ragBuilderChunks');
      }
    }
  }, []);

  // Save chunks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ragBuilderChunks', JSON.stringify(chunks));
  }, [chunks]);

  const handleAddChunk = () => {
    if (!currentChunk.trim()) return;
    
    if (isOverWordLimit(currentChunk)) {
      const shouldAdd = window.confirm(
        `This chunk has ${getWordCount(currentChunk)} words, which is over the recommended limit of ${WORD_LIMIT} words. ` +
        'Longer chunks might affect the quality of embeddings and retrieval. Add anyway?'
      );
      if (!shouldAdd) return;
    }
    
    if (editingIndex !== null) {
      const newChunks = chunks.map(chunk => 
        chunk.originalIndex === editingIndex 
          ? { 
              ...chunk, 
              content: currentChunk,
              category: selectedCategory,
              lastModified: Date.now() 
            }
          : chunk
      );
      setChunks(newChunks);
      setEditingIndex(null);
    } else {
      // Update the category index and get the next index
      setCategoryIndices(prev => ({
        ...prev,
        [selectedCategory]: prev[selectedCategory] + 1
      }));
      
      // Create category-specific ID (e.g., "1.1" for Document 1, "2.1" for Document 2)
      const categoryPrefix = selectedCategory === 'Document 1' ? '1.' : '2.';
      const nextIndex = categoryPrefix + (categoryIndices[selectedCategory] + 1);
      
      setChunks([
        { 
          content: currentChunk, 
          originalIndex: nextIndex,
          category: selectedCategory,
        },
        ...chunks
      ]);
    }
    setCurrentChunk('');
  };

  // Add clear all functionality
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all chunks? This cannot be undone.')) {
      setChunks([]);
      setCurrentChunk('');
      setEditingIndex(null);
      setCategoryIndices({
        'Document 1': 0,
        'Document 2': 0
      });
      localStorage.removeItem('ragBuilderChunks');
    }
  };

  const handleEditChunk = (index) => {
    const chunk = chunks.find(c => c.originalIndex === index);
    if (chunk) {
      setCurrentChunk(chunk.content);
      setSelectedCategory(chunk.category);
      setEditingIndex(index);
    }
  };

  const handleDeleteChunk = (index) => {
    setChunks(chunks.filter(chunk => chunk.originalIndex !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentChunk('');
    }
  };

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const isOverWordLimit = (text) => {
    return getWordCount(text) > WORD_LIMIT;
  };

  const handleConvertChunk = async (chunkId) => {
    setProcessingChunks(prev => new Set([...prev, chunkId]));
    try {
      const chunk = chunks.find(c => c.originalIndex === chunkId);
      if (!chunk) throw new Error('Chunk not found');

      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: chunk.content }),
      });

      if (!response.ok) throw new Error('Failed to generate embedding');
      
      const { embedding } = await response.json();
      
      // Update the chunk with its embedding
      setChunks(prevChunks => prevChunks.map(c => 
        c.originalIndex === chunkId 
          ? { 
              ...c, 
              embedding,
              embeddingGeneratedAt: Date.now()
            }
          : c
      ));

    } catch (error) {
      console.error('Error converting chunk:', error);
      alert('Failed to convert chunk to embedding');
    } finally {
      setProcessingChunks(prev => {
        const newSet = new Set(prev);
        newSet.delete(chunkId);
        return newSet;
      });
    }
  };

  const handleConvertAll = async () => {
    const unconvertedChunks = chunks.filter(chunk => !chunk.embedding);
    const chunkIds = unconvertedChunks.map(chunk => chunk.originalIndex);
    
    if (chunkIds.length === 0) {
      alert('All chunks already have embeddings!');
      return;
    }

    setProcessingChunks(new Set(chunkIds));
    
    try {
      // Process chunks in parallel with a limit of 5 concurrent requests
      const batchSize = 5;
      for (let i = 0; i < unconvertedChunks.length; i += batchSize) {
        const batch = unconvertedChunks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (chunk) => {
            const response = await fetch('/api/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: chunk.content }),
            });

            if (!response.ok) throw new Error('Failed to generate embedding');
            
            const { embedding } = await response.json();
            
            setChunks(prevChunks => prevChunks.map(c => 
              c.originalIndex === chunk.originalIndex 
                ? { ...c, embedding, embeddingGeneratedAt: Date.now() }
                : c
            ));
          })
        );
      }
      
      alert('Successfully converted all chunks to embeddings!');
    } catch (error) {
      console.error('Error converting chunks:', error);
      alert('Failed to convert some chunks to embeddings');
    } finally {
      setProcessingChunks(new Set());
    }
  };

  const formatDisplayIndex = (chunk) => {
    const categoryNum = chunk.category === 'Document 1' ? '1' : '2';
    const chunkNum = chunk.originalIndex.split('.')[1];
    return `${chunk.category} - Chunk ${chunkNum}`;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Clear All button */}
      <div className="border-b p-4 flex justify-between items-center bg-white">
        <h1 className="text-2xl font-bold">RAG Builder</h1>
        <div className="flex gap-4">
          {chunks.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
          )}
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Chat
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Fixed */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="flex-1 p-6 flex flex-col">
            {/* Add Chunk Button with Category and Word Count */}
            <div className="flex items-center gap-4 mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOCUMENT_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddChunk}
                disabled={!currentChunk.trim()}
                className={`flex-1 px-6 py-2 rounded-lg transition-colors ${
                  isOverWordLimit(currentChunk)
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editingIndex !== null ? 'Update Chunk' : 'Add Chunk'}
                {isOverWordLimit(currentChunk) && ' (Warning)'}
              </button>
              <div className={`text-sm ${
                isOverWordLimit(currentChunk) 
                  ? 'text-red-500 font-medium' 
                  : getWordCount(currentChunk) > WORD_LIMIT * 0.8 
                    ? 'text-yellow-600' 
                    : 'text-gray-500'
              }`}>
                {getWordCount(currentChunk)} / {WORD_LIMIT} words
              </div>
            </div>

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
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">
                        {formatDisplayIndex(chunk)}
                        {chunk.embedding && (
                          <span className="ml-2 text-xs text-green-600">
                            • Embedding generated {new Date(chunk.embeddingGeneratedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConvertChunk(chunk.originalIndex)}
                        disabled={processingChunks.has(chunk.originalIndex) || chunk.embedding}
                        className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                          chunk.embedding 
                            ? 'text-green-600 bg-green-50 cursor-default'
                            : processingChunks.has(chunk.originalIndex)
                            ? 'opacity-50 cursor-not-allowed text-green-500'
                            : 'text-green-500 hover:bg-green-50'
                        }`}
                      >
                        {processingChunks.has(chunk.originalIndex) ? (
                          <>
                            <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                            Converting...
                          </>
                        ) : chunk.embedding ? (
                          'Converted ✓'
                        ) : (
                          'Convert'
                        )}
                      </button>
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
                    
                    {chunk.embedding && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-xs font-mono text-gray-400">
                          Embedding Preview: [{chunk.embedding.slice(0, 5).map(n => n.toFixed(6)).join(', ')}, ...]
                        </div>
                      </div>
                    )}
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
                  className={`flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
                    processingChunks.size > 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={handleConvertAll}
                  disabled={processingChunks.size > 0}
                >
                  {processingChunks.size > 0 ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Converting...
                    </>
                  ) : (
                    'Convert All to Embeddings'
                  )}
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