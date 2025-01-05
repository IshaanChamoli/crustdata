import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { text } = await request.json();
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
      encoding_format: "float",
    });

    return Response.json({
      embedding: response.data[0].embedding,
    });
    
  } catch (error) {
    console.error('OpenAI Embeddings API error:', error);
    return Response.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
} 