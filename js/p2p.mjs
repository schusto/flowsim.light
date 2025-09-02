// p2p stub (API surface ready for WebRTC layer)
export async function connect(){ await new Promise(r=>setTimeout(r,250)); console.log('[P2P] stub connect ok'); return true; }
export function broadcast(topic, payload){ console.log('[P2P] broadcast', topic, payload); }
export function on(topic, handler){ console.log('[P2P] on', topic, handler); }
