export const getBotResponse = async (message, messageHistory = [], codeExecution = null) => {
  try {
    console.log('Getting bot response for message:', message);
    console.log('Message history:', messageHistory);

    // Handle code execution request
    if (codeExecution) {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codeExecution }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute code');
      }

      const data = await response.json();
      return {
        response: data.output ? formatCodeOutput(data.output) : data.error,
        isCodeExecution: true
      };
    }

    // Search for relevant context across entire database
    const searchResponse = await fetch('/api/pinecone/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message
      }),
    });

    let context = [];
    if (searchResponse.ok) {
      const { matches } = await searchResponse.json();
      context = matches;
      console.log('Found relevant context:', context); // Debug log
    }

    // Format message history for OpenAI
    const formattedHistory = messageHistory.map(msg => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Get chat response with context
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message, 
        messageHistory: formattedHistory, 
        context 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Chat API error:', errorData);
      throw new Error(errorData.error || 'Failed to get response');
    }

    const data = await response.json();
    console.log('Chat API response:', data); // Debug log

    return {
      response: data.response,
      references: data.references?.map(ref => ({
        text: ref.text,
        score: ref.score,
        chunkIndex: ref.chunkIndex,
        source: ref.source
      }))
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Helper to format code execution output
const formatCodeOutput = (output) => {
  if (Array.isArray(output)) {
    return output.map(([type, ...args]) => {
      return `[${type}] ${args.join(' ')}`;
    }).join('\n');
  }
  return String(output);
};

// Create chat message helper
export const createChatMessage = (message, isUser = true, references = []) => ({
  role: isUser ? 'user' : 'assistant',
  content: message,
  references
});

// Handle message helper
export const handleMessage = async (newMessage, messageHistory = []) => {
  console.log('handleMessage started with:', {
    newMessage,
    messageHistoryLength: messageHistory.length
  });

  if (!newMessage.trim()) return null;

  const userMessage = createChatMessage(newMessage, true);
  
  try {
    console.log('Calling getBotResponse...');
    const result = await getBotResponse(newMessage, messageHistory);
    console.log('getBotResponse result:', result);
    
    const botMessage = createChatMessage(result.response, false, result.references);
    console.log('Created bot message:', botMessage);
    
    return {
      userMessage,
      botMessage,
      error: null
    };
  } catch (error) {
    console.error('handleMessage error:', error);
    return {
      userMessage,
      error: error.message || "Failed to get response. Please try again."
    };
  }
};

// Helper to extract code blocks from messages
export const extractCodeBlock = (message) => {
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/;
  const match = message.match(codeBlockRegex);
  if (match) {
    return {
      language: match[1],
      code: match[2].trim()
    };
  }
  return null;
};

// Helper to detect if credentials are needed
export const needsCredentials = (code) => {
  const credentialPatterns = [
    /api[-_]?key/i,
    /auth[-_]?token/i,
    /bearer[-_]?token/i,
    /credentials/i,
    /secret/i
  ];
  return credentialPatterns.some(pattern => pattern.test(code));
}; 