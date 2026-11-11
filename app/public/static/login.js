document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('error');
  err.hidden = true;
  const res = await fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: e.target.username.value.trim(), password: e.target.password.value }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { err.textContent = data.error || 'Connexion impossible.'; err.hidden = false; return; }
  const next = new URLSearchParams(location.search).get('next');
  location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : (data.role === 'site_viewer' ? '/dashboard' : '/console');
});
