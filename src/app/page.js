'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [selectedReferences, setSelectedReferences] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          messageHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const botMessage = {
        role: 'bot',
        content: data.response,
        references: data.references
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-screen flex flex-col">
      {/* References Modal */}
      {selectedReferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Reference Chunks</h2>
              <button 
                onClick={() => setSelectedReferences(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedReferences.map((ref, i) => (
                <div key={i} className="mb-6 last:mb-0">
                  <div className="mb-2 text-sm text-gray-500">
                    {ref.score && `Relevance: ${(ref.score * 100).toFixed(1)}%`}
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {ref.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-bold">Chat Interface</h1>
          <Link
            href="/rag-builder"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            RAG Builder
          </Link>
        </div>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[80%] relative group">
              <div
                className={`rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <ReactMarkdown
                  className={`prose ${message.role === 'user' ? 'prose-invert' : ''} max-w-none prose-sm`}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    code: ({node, inline, ...props}) => 
                      inline ? (
                        <code className="bg-gray-700 bg-opacity-20 rounded px-1 py-0.5 text-sm" {...props} />
                      ) : (
                        <code className="block bg-gray-700 bg-opacity-10 rounded p-2 overflow-x-auto text-sm my-2" {...props} />
                      ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              
              {/* Info button for bot messages with references */}
              {message.role === 'bot' && message.references && message.references.length > 0 && (
                <button
                  onClick={() => setSelectedReferences(message.references)}
                  className="absolute -right-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center"
                  title="Show references"
                >
                  <div className="text-xs text-gray-500 font-serif leading-none">
                    i
                  </div>
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
