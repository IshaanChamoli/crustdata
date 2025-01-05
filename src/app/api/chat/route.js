import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 500,
    });

    return Response.json({
      content: response.choices[0].message.content,
      role: 'bot'
    });
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json(
      { error: 'There was an error processing your request' },
      { status: 500 }
    );
  }
} 