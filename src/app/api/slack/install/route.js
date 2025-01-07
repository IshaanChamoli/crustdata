import { NextResponse } from 'next/server';

export async function GET(request) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const scopes = [
    'chat:write',
    'im:history',
    'im:read',
    'im:write',
    'app_mentions:read',
    'channels:history',
    'channels:read'
  ].join(',');

  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}`;
  
  return NextResponse.redirect(url);
} 