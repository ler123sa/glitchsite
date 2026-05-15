// Базовый URL API
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://backend-production-c97c.up.railway.app';

async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('gdlc_token');

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  };

  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.detail || data.message || 'Ошибка сервера');
    err.status = res.status;
    throw err;
  }

  return data;
}
