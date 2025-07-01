export async function onRequestPost({ request, env }) {
  const { username: rawUser, email, password } = await request.json();
  const username = rawUser.trim().toLowerCase();
  if (!/^[a-z0-9]+$/.test(username)) {
    return new Response(JSON.stringify({ message: 'Invalid username' }), { status: 400 });
  }
  if (!email || !password) {
    return new Response(JSON.stringify({ message: 'Email and password required' }), { status: 400 });
  }
  const existing = await env.USERS.get(`user:${username}`);
  if (existing) {
    return new Response(JSON.stringify({ message: 'Username taken' }), { status: 409 });
  }

  // generate salt + hash
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = btoa(String.fromCharCode(...saltBytes));
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuf)));

  // store user record
  await env.USERS.put(
    `user:${username}`,
    JSON.stringify({ email, salt, hash, verified: false })
  );

  // issue verification token (24h TTL)
  const token = crypto.randomUUID();
  await env.USERS.put(`verify:${token}`, username, { expirationTtl: 86400 });

  const verifyUrl = new URL(request.url);
  verifyUrl.pathname = '/verify';
  verifyUrl.searchParams.set('token', token);

  return new Response(
    JSON.stringify({ message: 'Registered—check email', verifyUrl: verifyUrl.toString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}