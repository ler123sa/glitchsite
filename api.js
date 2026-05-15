// ───────────────────────────────────────────────────────────────
// GlitchDLC API client
// ───────────────────────────────────────────────────────────────

// Базовый URL backend API.
// Для локалки берём localhost, иначе — Railway backend.
const API_BASE = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return 'https://backend-production-c97c.up.railway.app';
})();

async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('gdlc_token');

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    mode: 'cors',
    credentials: 'omit',
  };

  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch (e) {
    // сеть/CORS не дала даже долететь до сервера
    console.error('[api] network error:', e);
    const err = new Error('Не удалось подключиться к серверу. Проверь интернет.');
    err.network = true;
    throw err;
  }

  let data = {};
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const err = new Error(data.detail || data.message || `Ошибка сервера (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
