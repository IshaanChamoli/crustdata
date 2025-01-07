import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { getBotResponse } from '@/utils/chat';
import { verifyRequestSignature } from '@/utils/slack';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Received Slack event:', body);

    // Handle Slack URL verification
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Verify the request is from Slack
    // TODO: Implement proper request verification using body.token

    // Add this before processing the event
    const isValid = await verifyRequestSignature(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
    }

    // Handle message events
    if (body.event && (body.event.type === 'message' || body.event.type === 'app_mention')) {
      const event = body.event;
      
      // Ignore bot messages to prevent loops
      if (event.bot_id || event.subtype === 'bot_message') {
        return NextResponse.json({ ok: true });
      }

      // Get message history for context
      const history = await slack.conversations.history({
        channel: event.channel,
        limit: 5
      });

      const messageHistory = history.messages
        .reverse()
        .map(msg => ({
          role: msg.bot_id ? 'bot' : 'user',
          content: msg.text
        }));

      // Get bot response
      const response = await getBotResponse(event.text, messageHistory);

      // Send response back to Slack
      await slack.chat.postMessage({
        channel: event.channel,
        text: response.response,
        thread_ts: event.thread_ts || event.ts
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack Event Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 