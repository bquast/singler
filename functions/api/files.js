export async function onRequest(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
  const [username, password] = atob(auth.split(' ')[1]).split(':');
  // authenticate
  const raw = await env.USERS.get(`user:${username}`);
  if (!raw) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
  const user = JSON.parse(raw);
  if (!user.verified) {
    return new Response(JSON.stringify({ message: 'Email not verified' }), { status: 403 });
  }
  // re-hash
  const encoder = new TextEncoder();
  const data = encoder.encode(user.salt + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));
  if (hash !== user.hash) {
    return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
  }

  const prefix = `file:${username}:`;
  if (request.method === 'GET') {
    const list = await env.FILES.list({ prefix, limit: 1000 });
    const files = list.keys.map(k => k.name.substring(prefix.length));
    return new Response(JSON.stringify(files), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const path = body.path;
  if (!path) {
    return new Response(JSON.stringify({ message: 'Path required' }), { status: 400 });
  }
  const key = prefix + path;

  if (request.method === 'POST') {
    await env.FILES.put(key, body.content || '');
    return new Response(JSON.stringify({ message: 'Saved' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'DELETE') {
    await env.FILES.delete(key);
    return new Response(JSON.stringify({ message: 'Deleted' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
}