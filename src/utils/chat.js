export const getBotResponse = async (message, messageHistory = []) => {
  try {
    console.log('Getting bot response for message:', message); // Debug log
    console.log('Message history:', messageHistory); // Debug log

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
    console.error('API error:', error);
    throw error; // Propagate error to handler
  }
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