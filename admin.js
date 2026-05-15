// ───────────────────────────────────────────────────────────────
// GlitchDLC admin panel
// ───────────────────────────────────────────────────────────────

const token = localStorage.getItem('gdlc_token');
if (!token) { window.location.href = '/login'; }

let allUsers   = [];
let currentUid = null;

// ─── helpers ─────────────────────────────────────────────────────
function $(id)  { return document.getElementById(id); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  return (name || '?').slice(0, 1).toUpperCase();
}

// ─── toast ───────────────────────────────────────────────────────
let toastTimer = null;
function toast(text, type = '') {
  const el = $('toast');
  el.textContent = text;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 2800);
}

// ─── load data ───────────────────────────────────────────────────
async function loadStats() {
  try {
    const s = await api('/api/admin/stats', 'GET');
    $('stat-users').textContent    = s.users;
    $('stat-active').textContent   = s.active_subs;
    $('stat-lifetime').textContent = s.lifetime_subs;
    $('stat-banned').textContent   = s.banned;
  } catch (e) {
    console.error(e);
  }
}

async function loadUsers() {
  const btn = $('refresh-btn');
  btn.classList.add('spinning');
  try {
    allUsers = await api('/api/admin/users', 'GET');
    renderUsers(allUsers);
    await loadStats();
  } catch (e) {
    if (e.status === 403) {
      toast('Доступ только для админов', 'error');
      setTimeout(() => window.location.href = '/dashboard', 1500);
    } else if (e.status === 401) {
      window.location.href = '/login';
    } else {
      toast(e.message, 'error');
    }
  } finally {
    setTimeout(() => btn.classList.remove('spinning'), 400);
  }
}

function renderUsers(list) {
  const tbody = $('users-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Никого не найдено</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(u => {
    const sub      = u.subscription || {};
    const subLabel = sub.active
      ? (sub.expires_at ? `${sub.plan} · до ${fmtDate(sub.expires_at)}` : `${sub.plan} · ∞`)
      : 'нет';
    const subBadge = sub.active ? 'badge-active' : 'badge-inactive';

    const status = u.banned
      ? '<span class="badge badge-banned">Бан</span>'
      : '<span class="badge badge-ok">OK</span>';

    return `
      <tr data-uid="${u.id}">
        <td class="muted-cell">#${u.id}</td>
        <td>
          <div class="user-cell">
            <div class="user-avatar">${initials(u.username)}</div>
            <div>
              <div class="user-name">${escape(u.username)}</div>
              <div class="user-email">${escape(u.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${subBadge}">${subLabel}</span></td>
        <td><span class="role-badge role-${u.role}">${u.role}</span></td>
        <td>${status}</td>
        <td class="muted-cell">${fmtDate(u.created_at)}</td>
        <td><button class="btn-row-action">Открыть →</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr[data-uid]').forEach(tr => {
    tr.addEventListener('click', () => openModal(parseInt(tr.dataset.uid, 10)));
  });
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ─── search ──────────────────────────────────────────────────────
$('search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) return renderUsers(allUsers);
  renderUsers(allUsers.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    String(u.id) === q
  ));
});

// ─── modal ───────────────────────────────────────────────────────
async function openModal(uid) {
  currentUid = uid;
  $('user-modal').classList.add('open');
  $('modal-loading').style.display = 'block';
  $('modal-content').style.display = 'none';

  try {
    const u = await api('/api/admin/user/' + uid, 'GET');
    fillModal(u);
    $('modal-loading').style.display = 'none';
    $('modal-content').style.display = 'block';
  } catch (e) {
    toast(e.message, 'error');
    closeModal();
  }
}

function fillModal(u) {
  $('m-avatar').textContent  = initials(u.username);
  $('m-username').textContent = u.username;
  $('m-email').textContent    = u.email;
  $('m-id').textContent       = '#' + u.id;
  $('m-hwid').textContent     = u.hwid ? u.hwid.substring(0, 24) + '…' : 'не привязан';
  $('m-created').textContent  = fmtDateTime(u.created_at);

  const role = $('m-role');
  role.textContent = u.role;
  role.className   = 'role-badge role-' + u.role;

  const sub = u.subscription;
  $('m-sub').textContent = sub.active
    ? (sub.lifetime ? `${sub.plan} (lifetime)` : `${sub.plan} до ${fmtDate(sub.expires_at)}`)
    : 'нет активной';

  // toggle role button text
  $('role-btn-text').textContent = u.role === 'admin' ? 'Снять админа' : 'Сделать админом';
  $('btn-toggle-role').disabled  = u.role === 'owner';

  // ban button text
  $('ban-btn-text').textContent = u.banned ? 'Разбанить' : 'Забанить';

  // delete disabled for owner
  $('btn-delete').disabled = u.role === 'owner';

  // history
  if (u.history && u.history.length) {
    $('history-section').style.display = 'block';
    $('history-list').innerHTML = u.history.map(h => `
      <div class="history-item ${h.active ? '' : 'inactive'}">
        <div>
          <span class="plan">${escape(h.plan)}</span>
          ${h.expires_at ? '· до ' + fmtDate(h.expires_at) : '· ∞'}
        </div>
        <span class="when">${fmtDateTime(h.created_at)}</span>
      </div>
    `).join('');
  } else {
    $('history-section').style.display = 'none';
  }
}

function closeModal() {
  $('user-modal').classList.remove('open');
  currentUid = null;
}
window.closeModal = closeModal;

// ─── plan select toggle ──────────────────────────────────────────
$('grant-plan').addEventListener('change', (e) => {
  $('grant-days').style.display = e.target.value === 'custom' ? 'block' : 'none';
});

// ─── modal actions ───────────────────────────────────────────────
$('btn-grant').addEventListener('click', async () => {
  const plan = $('grant-plan').value;
  const body = { user_id: currentUid };
  if (plan === 'custom') {
    const d = parseInt($('grant-days').value, 10);
    if (!d || d < 1) return toast('Введи число дней', 'error');
    body.plan = 'custom';
    body.days = d;
  } else {
    body.plan = plan;
  }
  try {
    await api('/api/admin/subscription/grant', 'POST', body);
    toast('Подписка выдана', 'success');
    await loadUsers();
    await openModal(currentUid);
  } catch (e) { toast(e.message, 'error'); }
});

$('btn-reset-hwid').addEventListener('click', async () => {
  if (!confirm('Сбросить HWID?')) return;
  try {
    await api('/api/admin/user/reset_hwid', 'POST', { user_id: currentUid });
    toast('HWID сброшен', 'success');
    await openModal(currentUid);
    await loadUsers();
  } catch (e) { toast(e.message, 'error'); }
});

$('btn-revoke').addEventListener('click', async () => {
  if (!confirm('Отозвать подписку?')) return;
  try {
    await api('/api/admin/subscription/revoke', 'POST', { user_id: currentUid });
    toast('Подписка отозвана', 'success');
    await openModal(currentUid);
    await loadUsers();
  } catch (e) { toast(e.message, 'error'); }
});

$('btn-toggle-role').addEventListener('click', async () => {
  const u = allUsers.find(x => x.id === currentUid);
  if (!u) return;
  const newRole = u.role === 'admin' ? 'user' : 'admin';
  if (!confirm(`Изменить роль на ${newRole}?`)) return;
  try {
    await api('/api/admin/user/role', 'POST', { user_id: currentUid, role: newRole });
    toast('Роль изменена', 'success');
    await loadUsers();
    await openModal(currentUid);
  } catch (e) { toast(e.message, 'error'); }
});

$('btn-ban').addEventListener('click', async () => {
  const u = allUsers.find(x => x.id === currentUid);
  if (!u) return;
  if (u.banned) {
    if (!confirm('Разбанить пользователя?')) return;
    try {
      await api('/api/admin/user/unban', 'POST', { user_id: currentUid });
      toast('Разбанен', 'success');
    } catch (e) { return toast(e.message, 'error'); }
  } else {
    const reason = prompt('Причина бана:', 'Нарушение правил');
    if (reason === null) return;
    try {
      await api('/api/admin/user/ban', 'POST', { user_id: currentUid, reason });
      toast('Забанен', 'success');
    } catch (e) { return toast(e.message, 'error'); }
  }
  await loadUsers();
  await openModal(currentUid);
});

$('btn-delete').addEventListener('click', async () => {
  const u = allUsers.find(x => x.id === currentUid);
  if (!u) return;
  if (!confirm(`Удалить пользователя "${u.username}" безвозвратно?`)) return;
  try {
    await api('/api/admin/user/delete', 'POST', { user_id: currentUid });
    toast('Удалён', 'success');
    closeModal();
    await loadUsers();
  } catch (e) { toast(e.message, 'error'); }
});

// ─── refresh & logout ────────────────────────────────────────────
$('refresh-btn').addEventListener('click', loadUsers);
$('logout-btn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', 'POST'); } catch {}
  localStorage.removeItem('gdlc_token');
  localStorage.removeItem('gdlc_user');
  window.location.href = '/';
});

// esc to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ─── init ────────────────────────────────────────────────────────
loadUsers();
