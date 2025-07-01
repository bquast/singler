export async function onRequestPost({ request, env }) {
  const { username: rawUser, password } = await request.json();
  const username = rawUser.trim().toLowerCase();
  if (!password) {
    return new Response(JSON.stringify({ message: 'Password required' }), { status: 400 });
  }
  const raw = await env.USERS.get(`user:${username}`);
  if (!raw) {
    return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
  }
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
  const token = btoa(`${username}:${password}`);
  return new Response(
    JSON.stringify({ token, username }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}