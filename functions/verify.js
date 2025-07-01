export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response('Missing token', { status: 400 });
  }
  const username = await env.USERS.get(`verify:${token}`);
  if (!username) {
    return new Response('Invalid or expired token', { status: 400 });
  }
  const raw = await env.USERS.get(`user:${username}`);
  if (!raw) {
    return new Response('User not found', { status: 404 });
  }
  const user = JSON.parse(raw);
  user.verified = true;
  await env.USERS.put(`user:${username}`, JSON.stringify(user));
  await env.USERS.delete(`verify:${token}`);
  return new Response(
    `Email verified!<br/><a href="/login.html">Go to login</a>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}