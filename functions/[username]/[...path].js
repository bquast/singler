export async function onRequestGet({ request, env, params }) {
  const username = params.username;
  const segments = params.path || [];
  const filepath = segments.join('/');
  const kvKey = `file:${username}:${filepath}`;

  const file = await env.FILES.get(kvKey);
  if (file === null) {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const accept = request.headers.get('Accept') || '';

  if (accept.includes('text/plain') || url.searchParams.has('raw')) {
    return new Response(file, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const escaped = escapeHtml(file);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${filepath}</title></head>
<body style="font-family:system-ui;margin:2rem">
  <pre style="white-space:pre-wrap;word-wrap:break-word">${escaped}</pre>
  <a href="?raw=true" download>download</a>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
  });
}