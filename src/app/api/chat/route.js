import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(request) {
  try {
    const { message, messageHistory } = await request.json();

    // First, get embeddings for the user's message using text-embedding-3-large
    // which produces 3072-dimensional vectors matching your Pinecone index
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: message,
      encoding_format: "float"
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search Pinecone for relevant context
    const index = pinecone.index(process.env.PINECONE_INDEX);
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });

    // Format context from relevant chunks
    const context = searchResponse.matches.map(match => match.metadata.text).join('\n\n');

    // Create messages array with system context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant. Use the following context to help answer the user's question, but don't mention that you're using any context unless specifically asked:\n\n${context}`
      },
      ...messageHistory.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Get chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false,
    });

    return Response.json({
      response: completion.choices[0].message.content,
      references: searchResponse.matches.map(match => ({
        text: match.metadata.text,
        score: match.score,
        chunkIndex: match.metadata.chunkIndex,
        source: match.metadata.chatbotName || 'Unknown'
      }))
    });
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json(
      { error: 'There was an error processing your request' },
      { status: 500 }
    );
  }
} 