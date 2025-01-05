import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { query } = await request.json();
    
    console.log('Search request:', { query }); // Debug log

    // Get embeddings for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float"
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone without filters to search entire database
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX);
    
    console.log('Querying Pinecone without filters'); // Debug log

    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true
    });

    console.log('Detailed matches:', searchResponse.matches.map(match => ({
      text: match.metadata.text,
      score: match.score,
      metadata: match.metadata,
      chunkIndex: match.metadata.chunkIndex
    })));

    return NextResponse.json({
      matches: searchResponse.matches.map(match => ({
        text: match.metadata.text,
        score: match.score,
        chunkIndex: match.metadata.chunkIndex,
        source: match.metadata.chatbotName || 'Unknown' // Include source information
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    );
  }
} 