import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(request) {
  try {
    const { chunks } = await request.json();
    const index = pinecone.Index(process.env.PINECONE_INDEX);

    // First get the current count to use as starting index
    const queryResponse = await index.query({
      vector: Array(3072).fill(0),
      topK: 10000,
      includeMetadata: true
    });

    // Find the highest global index from existing vectors
    const currentMaxIndex = Math.max(
      ...queryResponse.matches.map(match => 
        parseInt(match.metadata.globalIndex) || 0
      ),
      -1
    );

    // Prepare vectors with sequential indices starting after the highest existing index
    const vectors = chunks.map((chunk, i) => ({
      id: `chunk_${Date.now()}_${i}`,
      values: chunk.embedding,
      metadata: {
        text: chunk.content,
        category: chunk.category,
        chunkId: chunk.originalIndex,
        globalIndex: currentMaxIndex + 1 + i, // Start after the highest existing index
        timestamp: Date.now(),
      }
    }));

    // Upload vectors in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    return Response.json({ 
      success: true,
      vectorCount: vectors.length,
      startIndex: currentMaxIndex + 1,
      endIndex: currentMaxIndex + vectors.length
    });
    
  } catch (error) {
    console.error('Pinecone Upload Error:', error);
    return Response.json(
      { error: 'Failed to upload to vector database' },
      { status: 500 }
    );
  }
} 