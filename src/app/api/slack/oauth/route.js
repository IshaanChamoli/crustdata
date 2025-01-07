import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const result = await new WebClient().oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code
    });

    // TODO: Store the access token securely
    // result.access_token

    return NextResponse.redirect('/slack/success');
  } catch (error) {
    console.error('OAuth Error:', error);
    return NextResponse.redirect('/slack/error');
  }
} 