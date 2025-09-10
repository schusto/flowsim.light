// p2p stub (API surface ready for WebRTC layer)
// Implementers should ensure peers are authenticated and messages validated.
const allowedTopics = new Set();
const MAX_MESSAGE_SIZE = 16 * 1024; // 16KB

export async function connect(opts={}){
  // TODO: establish WebRTC connection and verify peer credentials.
  // Reject connections lacking proper authentication (e.g., shared secret or certificate).
  await new Promise(r=>setTimeout(r,250));
  console.log('[P2P] stub connect ok');
  return true;
}

export function broadcast(topic, payload){
  // Only allow known topics and bounded payloads to avoid abuse.
  if (typeof topic !== 'string' || !allowedTopics.has(topic)){
    console.warn('[P2P] blocked broadcast of unexpected topic', topic);
    return;
  }
  const data = JSON.stringify(payload);
  if (data.length > MAX_MESSAGE_SIZE){
    console.warn('[P2P] message too large, dropped');
    return;
  }
  // TODO: send data to peers with rate limiting to mitigate flooding attacks.
  console.log('[P2P] broadcast', topic, payload);
}

export function on(topic, handler){
  // Register a handler for an expected topic. Incoming messages should be
  // validated for structure and size before invoking the handler.
  if (typeof topic !== 'string' || typeof handler !== 'function') return;
  allowedTopics.add(topic);
  console.log('[P2P] on', topic, handler);
}
