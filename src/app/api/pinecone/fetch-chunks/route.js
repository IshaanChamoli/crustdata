import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(request) {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX);

    const queryResponse = await index.query({
      vector: Array(3072).fill(0),
      topK: 10000,
      includeMetadata: true,
      includeValues: true
    });

    // Transform and sort chunks by global index (descending order - newest first)
    const chunks = queryResponse.matches
      .map(match => ({
        content: match.metadata.text,
        category: match.metadata.category,
        embedding: match.values,
        originalIndex: match.metadata.chunkId,
        embeddingGeneratedAt: match.metadata.timestamp,
        globalIndex: parseInt(match.metadata.globalIndex) || 0
      }))
      .sort((a, b) => b.globalIndex - a.globalIndex); // Newest first (highest index on top)

    return new Response(JSON.stringify({ chunks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 