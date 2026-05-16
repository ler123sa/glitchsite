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
        <td class="mono"><strong style="color:var(--brand-2);">#${u.id}</strong></td>
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


// ─── releases ────────────────────────────────────────────────────
async function loadReleases() {
  try {
    const list = await api('/api/admin/releases', 'GET');
    const tbody = $('releases-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Нет релизов. Создай первый.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(r => {
      const status = r.active
        ? '<span class="badge badge-active">Активен</span>'
        : '<span class="badge badge-inactive">Архив</span>';
      const shortUrl = r.url.length > 40 ? r.url.slice(0, 38) + '…' : r.url;
      return `
        <tr>
          <td><strong>${escape(r.version)}</strong></td>
          <td class="mono"><a href="${escape(r.url)}" target="_blank" rel="noopener" style="color:var(--brand-2); text-decoration:none;">${escape(shortUrl)}</a></td>
          <td class="muted-cell">${escape(r.notes || '—')}</td>
          <td>${status}</td>
          <td class="muted-cell">${fmtDate(r.created_at)}</td>
          <td>
            ${!r.active ? `<button class="btn-row-action" data-act="activate" data-id="${r.id}">Активировать</button>` : ''}
            <button class="btn-row-action" data-act="delete" data-id="${r.id}" style="color:#fca5a5; margin-left:4px;">Удалить</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const act = btn.dataset.act;
        if (act === 'delete') {
          if (!confirm('Удалить этот релиз?')) return;
          try {
            await api('/api/admin/releases/delete', 'POST', { id });
            toast('Удалён', 'success');
            await loadReleases();
          } catch (e) { toast(e.message, 'error'); }
        } else if (act === 'activate') {
          if (!confirm('Сделать этот релиз активным?')) return;
          try {
            await api('/api/admin/releases/activate', 'POST', { id });
            toast('Активирован', 'success');
            await loadReleases();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
    });
  } catch (e) {
    if (e.status !== 403 && e.status !== 401) toast(e.message, 'error');
  }
}

function openReleaseModal() {
  $('rel-version').value = '';
  $('rel-url').value = '';
  $('rel-notes').value = '';
  $('release-modal').classList.add('open');
}
function closeReleaseModal() {
  $('release-modal').classList.remove('open');
}
window.closeReleaseModal = closeReleaseModal;

$('new-release-btn').addEventListener('click', openReleaseModal);

$('rel-create').addEventListener('click', async () => {
  const version = $('rel-version').value.trim();
  const url     = $('rel-url').value.trim();
  const notes   = $('rel-notes').value.trim();

  if (!version || !url) {
    return toast('Заполни версию и URL', 'error');
  }
  try {
    await api('/api/admin/releases/create', 'POST', { version, url, notes });
    toast('Релиз создан', 'success');
    closeReleaseModal();
    await loadReleases();
  } catch (e) { toast(e.message, 'error'); }
});

// load releases вместе с пользователями
loadReleases();


// ─── keys (FunPay activation) ────────────────────────────────────
const PLAN_LABELS = {
  month:      'Месяц',
  quarter:    '3 месяца',
  lifetime:   'Lifetime',
  hwid_reset: 'Сброс HWID',
};

async function loadKeys() {
  try {
    const list = await api('/api/admin/keys', 'GET');
    const tbody = $('keys-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Ключей пока нет. Сгенерируй первые.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(k => {
      const status = k.used
        ? '<span class="badge badge-inactive">Использован</span>'
        : '<span class="badge badge-active">Свободен</span>';
      const planLabel = PLAN_LABELS[k.plan] || k.plan;
      const activatedBy = k.activated_by ? escape(k.activated_by) : '—';
      return `
        <tr>
          <td class="mono"><strong>${escape(k.code)}</strong></td>
          <td>${escape(planLabel)}</td>
          <td class="muted-cell">${escape(k.note || '—')}</td>
          <td>${status}</td>
          <td class="muted-cell">
            ${k.used ? activatedBy + '<br><span style="font-size:.7rem; opacity:.7;">' + fmtDate(k.activated_at) + '</span>' : '—'}
          </td>
          <td class="muted-cell">${fmtDate(k.created_at)}</td>
          <td>
            <button class="btn-row-action" data-id="${k.id}" data-act="copy" data-code="${escape(k.code)}">Копировать</button>
            ${!k.used ? `<button class="btn-row-action" data-id="${k.id}" data-act="delete" style="color:#fca5a5; margin-left:4px;">×</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = parseInt(btn.dataset.id, 10);
        const act = btn.dataset.act;
        if (act === 'copy') {
          try {
            await navigator.clipboard.writeText(btn.dataset.code);
            toast('Скопировано в буфер', 'success');
          } catch { toast('Не удалось скопировать', 'error'); }
        } else if (act === 'delete') {
          if (!confirm('Удалить ключ?')) return;
          try {
            await api('/api/admin/keys/delete', 'POST', { id });
            toast('Удалён', 'success');
            await loadKeys();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
    });
  } catch (e) {
    if (e.status !== 403 && e.status !== 401) toast(e.message, 'error');
  }
}

function openKeysModal() {
  $('keys-plan').value  = 'quarter';
  $('keys-count').value = 1;
  $('keys-note').value  = '';
  $('keys-result').style.display = 'none';
  $('keys-result-list').value = '';
  $('keys-modal').classList.add('open');
}
function closeKeysModal() {
  $('keys-modal').classList.remove('open');
}
window.closeKeysModal = closeKeysModal;

$('new-keys-btn').addEventListener('click', openKeysModal);

$('keys-gen-confirm').addEventListener('click', async () => {
  const plan  = $('keys-plan').value;
  const count = parseInt($('keys-count').value, 10);
  const note  = $('keys-note').value.trim();

  if (!count || count < 1) return toast('Укажи количество', 'error');

  try {
    const res = await api('/api/admin/keys/generate', 'POST', { plan, count, note });
    $('keys-result-count').textContent = res.count;
    $('keys-result-list').value = res.keys.join('\n');
    $('keys-result').style.display = 'block';
    toast(`Сгенерировано ${res.count} ключей`, 'success');
    await loadKeys();
  } catch (e) { toast(e.message, 'error'); }
});

$('keys-copy-btn').addEventListener('click', async () => {
  const text = $('keys-result-list').value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast('Скопировано', 'success');
  } catch { toast('Не удалось скопировать', 'error'); }
});

loadKeys();


// ─── loader versions (.exe) ──────────────────────────────────────
async function loadLoaderVersions() {
  try {
    const list = await api('/api/admin/loader/versions', 'GET');
    const tbody = $('loader-tbody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Версий лоудера пока нет.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(r => {
      const status = r.active
        ? '<span class="badge badge-active">Активна</span>'
        : '<span class="badge badge-inactive">Архив</span>';
      const shortUrl = r.url.length > 40 ? r.url.slice(0, 38) + '…' : r.url;
      return `
        <tr>
          <td><strong>${escape(r.version)}</strong></td>
          <td class="mono"><a href="${escape(r.url)}" target="_blank" rel="noopener" style="color:var(--brand-2); text-decoration:none;">${escape(shortUrl)}</a></td>
          <td class="muted-cell">${escape(r.notes || '—')}</td>
          <td>${status}</td>
          <td class="muted-cell">${fmtDate(r.created_at)}</td>
          <td>
            ${!r.active ? `<button class="btn-row-action" data-act="loader-activate" data-id="${r.id}">Активировать</button>` : ''}
            <button class="btn-row-action" data-act="loader-delete" data-id="${r.id}" style="color:#fca5a5; margin-left:4px;">Удалить</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = parseInt(btn.dataset.id, 10);
        const act = btn.dataset.act;
        if (act === 'loader-delete') {
          if (!confirm('Удалить эту версию лоудера?')) return;
          try {
            await api('/api/admin/loader/delete', 'POST', { id });
            toast('Удалено', 'success');
            await loadLoaderVersions();
          } catch (e) { toast(e.message, 'error'); }
        } else if (act === 'loader-activate') {
          if (!confirm('Сделать эту версию активной?')) return;
          try {
            await api('/api/admin/loader/activate', 'POST', { id });
            toast('Активировано', 'success');
            await loadLoaderVersions();
          } catch (e) { toast(e.message, 'error'); }
        }
      });
    });
  } catch (e) {
    if (e.status !== 403 && e.status !== 401) toast(e.message, 'error');
  }
}

function openLoaderModal() {
  $('loader-version').value = '';
  $('loader-url').value     = '';
  $('loader-notes').value   = '';
  $('loader-modal').classList.add('open');
}
function closeLoaderModal() {
  $('loader-modal').classList.remove('open');
}
window.closeLoaderModal = closeLoaderModal;

$('new-loader-btn').addEventListener('click', openLoaderModal);

$('loader-create').addEventListener('click', async () => {
  const version = $('loader-version').value.trim();
  const url     = $('loader-url').value.trim();
  const notes   = $('loader-notes').value.trim();

  if (!version || !url) {
    return toast('Заполни версию и URL', 'error');
  }
  try {
    await api('/api/admin/loader/create', 'POST', { version, url, notes });
    toast('Версия активирована', 'success');
    closeLoaderModal();
    await loadLoaderVersions();
  } catch (e) { toast(e.message, 'error'); }
});

loadLoaderVersions();
