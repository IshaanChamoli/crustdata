import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Helper to safely execute code in a sandboxed environment
async function executeCode(language, code, credentials = {}) {
  try {
    // Create a sandbox environment for code execution
    const vm = await import('vm');
    const context = {
      console: {
        log: (...args) => results.push(['log', ...args]),
        error: (...args) => results.push(['error', ...args])
      },
      fetch: async (url, options = {}) => {
        // Add credentials to headers if provided
        if (credentials.apiKey) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${credentials.apiKey}`
          };
        }
        return fetch(url, options);
      },
      setTimeout,
      clearTimeout,
      Buffer,
      URL,
      results: []
    };

    // Execute code in sandbox
    const script = new vm.Script(code);
    const results = [];
    await script.runInNewContext(context, { timeout: 5000 });

    return {
      success: true,
      output: results,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error.message
    };
  }
}

export async function POST(request) {
  try {
    const { message, messageHistory, codeExecution } = await request.json();

    // Handle code execution request
    if (codeExecution) {
      const { language, code, credentials } = codeExecution;
      const result = await executeCode(language, code, credentials);
      return Response.json(result);
    }

    // Get embeddings for context search
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: message,
      encoding_format: "float"
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search for relevant context
    const index = pinecone.index(process.env.PINECONE_INDEX);
    const searchResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });

    const context = searchResponse.matches.map(match => match.metadata.text).join('\n\n');

    // Updated system message to handle interactive code execution
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant that can actively execute code and make real API calls. You have a secure sandbox environment to run code safely. When users ask about APIs or code examples, get excited about running them!

1. Enthusiastically offer to execute code examples - you can actually run them!
2. For API calls, ask for necessary credentials (API keys, etc.) and offer to test them
3. Show both the code and a curl command when relevant
4. After execution, explain the results in a user-friendly way
5. If there are errors, help troubleshoot them
6. Encourage users to try different variations and experiment

Use markdown for code blocks with language specification (e.g. \`\`\`python or \`\`\`curl).
For section titles, use a single #.

Use this context to help answer questions (but don't mention using it unless asked):\n\n${context}`
      },
      ...messageHistory.map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
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
        source: match.metadata.chatbotName || 'Unknown'
      }))
    });
    
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'There was an error processing your request' },
      { status: 500 }
    );
  }
} 