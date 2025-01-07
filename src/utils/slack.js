import crypto from 'crypto';

export async function verifyRequestSignature(request) {
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');
  
  // Verify timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return false;
  }

  const body = await request.text();
  const baseString = `v0:${timestamp}:${body}`;
  
  const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest('hex');
  
  const computedSignature = `v0=${hmac}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
} 