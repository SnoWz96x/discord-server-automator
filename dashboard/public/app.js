const state = {
  overview: null,
  leaderboard: null,
  moderation: null,
  tickets: null,
  badges: null,
  shop: null,
  automod: null,
  logs: null,
  modules: null,
  auth: null
};

const currency = new Intl.NumberFormat('pt-BR');
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

function $(id) {
  return document.getElementById(id);
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (response.status === 401) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'Login necessario.');
    error.status = 401;
    throw error;
  }
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${url}`);
  return payload;
}

function setText(id, value) {
  const node = $(id);
  if (node) node.textContent = value;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTime.format(date);
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function userLabel(row) {
  return row.username || row.id || 'Unknown user';
}

function renderAuth(auth) {
  state.auth = auth;
  const locked = !auth.authenticated;
  $('authGate')?.classList.toggle('hidden', !locked);
  document.body.classList.toggle('locked', locked);

  setText('authUser', auth.user ? auth.user.username : 'Nao conectado');
  const logout = $('logoutLink');
  if (logout) logout.classList.toggle('hidden', Boolean(auth.localMode) || !auth.authenticated);
}

function renderHealth(data) {
  const health = data.health;
  const online = Boolean(health.online);
  const processRunning = health.process?.running === true;
  const score = online && processRunning ? 100 : online ? 68 : 18;

  setText('botName', health.bot ? `${health.bot.username}` : 'RoguePoke Bot');
  setText('guildName', health.guild ? health.guild.name : 'Servidor indisponivel');
  setText('healthMessage', online
    ? (processRunning ? 'Discord API respondeu e o processo do bot esta rodando.' : 'Discord API respondeu, mas o processo do bot parece parado.')
    : (health.error || 'Falha ao consultar o Discord.'));
  setText('healthPercent', `${score}%`);
  setText('commandsCount', currency.format(health.commands || 0));
  setText('channelsCount', currency.format(health.channels || 0));
  setText('processStatus', processRunning ? 'ON' : 'OFF');

  $('healthRing').style.setProperty('--value', `${score * 3.6}deg`);

  const badge = $('botBadge');
  badge.textContent = online && processRunning ? 'Online' : online ? 'API ok' : 'Atencao';
  badge.className = `badge ${online && processRunning ? 'ok' : online ? 'neutral' : 'bad'}`;

  const dot = $('sidebarDot');
  dot.className = `dot ${online && processRunning ? 'ok' : online ? 'muted' : 'bad'}`;
  setText('sidebarStatus', online && processRunning ? 'Bot online' : online ? 'Processo parado' : 'Bot com erro');
  setText('sidebarSub', online ? `${health.commands || 0} comandos registrados` : (health.error || 'Checar token/API'));
}

function renderOverview(data) {
  const stats = data.stats || {};
  setText('usersCount', currency.format(stats.users || 0));
  setText('openTickets', currency.format(stats.ticketsOpen || 0));
  setText('warningsCount', currency.format(stats.warnings || 0));
  setText('totalXp', currency.format(stats.totalXp || 0));
  setText('totalCp', currency.format(stats.totalCp || 0));
  setText('badgesCount', currency.format(stats.badgesAwarded || 0));

  const configs = data.configs || {};
  const modules = [
    ['Welcome', configs.welcome, 'Mensagens de entrada'],
    ['Registro', configs.verification, 'Cargo de membro via botao'],
    ['Tickets', configs.ticket, 'Painel e filas de suporte'],
    ['Leveling', configs.leveling, 'XP por mensagem'],
    ['Economia', configs.economy, 'PokeCoins, daily, weekly e work'],
    ['Temp Voice', configs.tempvoice, 'Canais temporarios'],
    ['AutoMod', true, 'Spam, caps, invites e links'],
    ['Mod Logs', true, 'Eventos enviados para o canal de logs']
  ];

  $('moduleGrid').innerHTML = modules.map(([name, config, description]) => {
    const enabled = config === true || Boolean(config?.enabled);
    return `
      <div class="module-card">
        <strong>${name}</strong>
        <span>${description}</span>
        <span class="badge ${enabled ? 'ok' : 'bad'}">${enabled ? 'Ativo' : 'Inativo'}</span>
      </div>
    `;
  }).join('');
}

function renderModuleSettings(data) {
  const target = $('moduleSettingsGrid');
  if (!target) return;

  const modules = data?.modules || [];
  if (!modules.length) {
    target.innerHTML = '<div class="empty">Nenhum modulo configuravel encontrado.</div>';
    return;
  }

  target.innerHTML = modules.map(module => {
    const settings = Object.entries(module.settings || {});
    return `
      <form class="module-settings-card" data-module-key="${escapeHTML(module.key)}">
        <div class="module-settings-head">
          <div>
            <strong>${escapeHTML(module.name)}</strong>
            <span>${escapeHTML(module.description)}</span>
          </div>
          <label class="toggle-row">
            <input type="checkbox" name="enabled" ${module.enabled ? 'checked' : ''} />
            <span>${module.enabled ? 'Ativo' : 'Inativo'}</span>
          </label>
        </div>
        <div class="module-fields">
          ${settings.map(([key, value]) => renderModuleField(key, value)).join('')}
        </div>
        <div class="module-settings-footer">
          <small>${module.updatedAt ? `Atualizado ${formatDate(module.updatedAt)} por ${escapeHTML(module.updatedBy || '-')}` : 'Usando configuracao padrao'}</small>
          <button type="submit">Salvar</button>
        </div>
      </form>
    `;
  }).join('');
}

function renderModuleField(key, value) {
  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
  if (typeof value === 'boolean') {
    return `
      <label>
        <span>${escapeHTML(label)}</span>
        <select name="settings.${escapeHTML(key)}">
          <option value="true" ${value ? 'selected' : ''}>Sim</option>
          <option value="false" ${!value ? 'selected' : ''}>Nao</option>
        </select>
      </label>
    `;
  }

  const type = typeof value === 'number' ? 'number' : 'text';
  return `
    <label>
      <span>${escapeHTML(label)}</span>
      <input name="settings.${escapeHTML(key)}" type="${type}" value="${escapeHTML(value)}" />
    </label>
  `;
}

function renderLeaderboard(data) {
  renderLeaderList('xpList', data.xp || [], row => `${currency.format(row.xp || 0)} XP`, row => `Nivel ${row.level || 0} · ${row.id}`);
  renderLeaderList('coinsList', data.coins || [], row => `${currency.format(row.coins || 0)} coins`, row => `${currency.format(row.xp || 0)} XP · ${row.id}`);
  renderLeaderList('cpList', data.cp || [], row => `${currency.format(row.cp || 0)} CP`, row => `${currency.format(row.coins || 0)} coins · ${row.id}`);
}

function renderLeaderList(targetId, rows, valueFn, metaFn) {
  const target = $(targetId);
  if (!rows.length) {
    target.innerHTML = '<div class="empty">Ainda nao ha dados suficientes.</div>';
    return;
  }

  target.innerHTML = rows.map((row, index) => `
    <div class="leader-row">
      <div class="rank">${index + 1}</div>
      <div>
        <div class="leader-name">${userLabel(row)}</div>
        <div class="leader-meta">${metaFn(row)}</div>
      </div>
      <div class="leader-value">${valueFn(row)}</div>
    </div>
  `).join('');
}

function renderModeration(data) {
  const rows = data.recent || [];
  const tbody = $('moderationRows');

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5">Nenhum log de moderacao ainda.</td></tr>';
  } else {
    tbody.innerHTML = rows.map(row => `
      <tr>
        <td><span class="chip">${row.case_id || row.action}</span></td>
        <td>${row.user_id}</td>
        <td>${row.moderator_id || '-'}</td>
        <td><strong>${row.action}</strong><br>${row.reason || '-'}</td>
        <td>${formatDate(row.created_at)}</td>
      </tr>
    `).join('');
  }

  const byAction = data.byAction || [];
  const max = Math.max(...byAction.map(item => item.count), 1);
  $('actionBars').innerHTML = byAction.length ? byAction.map(item => `
    <div>
      <div class="bar-label"><span>${item.action}</span><strong>${item.count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, item.count / max * 100)}%"></div></div>
    </div>
  `).join('') : '<div class="empty">Sem punicoes registradas.</div>';
}

function renderTickets(data) {
  const open = data.open || [];
  const categories = data.config?.categories || [];

  $('ticketList').innerHTML = open.length ? open.map(ticket => `
    <div class="ticket-item">
      <div>
        <div class="ticket-title">${ticket.subject || `#${ticket.channel_id}`}</div>
        <div class="ticket-meta">${ticket.category || 'Ticket'} · ${ticket.status || 'open'} · ${ticket.priority || 'normal'} · user ${ticket.user_id}</div>
      </div>
      <span class="badge ok">${formatDate(ticket.created_at)}</span>
    </div>
  `).join('') : '<div class="empty">Nenhum ticket aberto agora.</div>';

  $('ticketCategories').innerHTML = categories.length ? categories.map(category => `
    <span class="chip">${category.emoji || ''} ${category.name}</span>
  `).join('') : '<div class="empty">Categorias nao configuradas.</div>';
}

function renderBadges(rows) {
  const target = $('badgeList');
  if (!target) return;

  target.innerHTML = rows.length ? rows.map(badge => `
    <div class="badge-row">
      <div class="badge-icon">${badge.emoji || '•'}</div>
      <div>
        <div class="leader-name">${badge.name}</div>
        <div class="leader-meta">${badge.description || 'Badge RoguePoke'}</div>
      </div>
      <div class="leader-value">${currency.format(badge.awarded || 0)}</div>
    </div>
  `).join('') : '<div class="empty">Badges ainda nao configuradas.</div>';
}

function renderShop(rows) {
  const target = $('shopList');
  if (!target) return;

  target.innerHTML = rows.length ? rows.map(item => `
    <div class="shop-item">
      <div>
        <div class="leader-name">${item.name}</div>
        <div class="leader-meta">${item.description || 'Item RoguePoke'} · ${item.category || 'general'} · ID ${item.key}</div>
      </div>
      <div class="shop-price">
        <strong>${currency.format(item.price_coins || 0)} + ${currency.format(item.price_cp || 0)}</strong>
        <span>coins + CP</span>
        <small>Nivel ${item.min_level || 0}</small>
      </div>
    </div>
  `).join('') : '<div class="empty">A loja ainda nao tem itens.</div>';
}

function renderAutomod(config) {
  const target = $('automodList');
  if (!target) return;

  const entries = Object.entries(config || {});
  target.innerHTML = entries.length ? entries.map(([name, value]) => `
    <div class="module-card">
      <strong>${name}</strong>
      <span>${JSON.stringify(value.config || {})}</span>
      <span class="badge ${value.enabled ? 'ok' : 'bad'}">${value.enabled ? 'Ativo' : 'Inativo'}</span>
    </div>
  `).join('') : '<div class="empty">AutoMod ainda nao configurado.</div>';
}

function renderLogs(groups) {
  const target = $('logGroups');
  if (!target) return;

  const labels = {
    cadastro: 'Cadastro',
    moderacao: 'Moderacao',
    tickets: 'Tickets',
    mensagens: 'Mensagens',
    cargos: 'Cargos',
    canais: 'Canais',
    automod: 'AutoMod',
    economia: 'Economia'
  };

  target.innerHTML = Object.entries(labels).map(([key, label]) => {
    const rows = (groups?.[key] || []).slice(0, 8);
    return `
      <article class="log-card">
        <div class="log-card-head">
          <strong>${label}</strong>
          <span class="badge neutral">${rows.length}</span>
        </div>
        <div class="log-list">
          ${rows.length ? rows.map(row => `
            <div class="log-row">
              <span class="chip">${row.event_type || key}</span>
              <strong>${row.summary || '-'}</strong>
              <small>${formatDate(row.created_at)}</small>
            </div>
          `).join('') : '<div class="empty">Sem eventos recentes.</div>'}
        </div>
      </article>
    `;
  }).join('');
}

function renderAdminOptions(badges) {
  const select = $('badgeSelect');
  if (!select) return;

  select.innerHTML = badges.length ? badges.map(badge => `
    <option value="${badge.key}">${badge.emoji || ''} ${badge.name}</option>
  `).join('') : '<option value="">Nenhuma badge</option>';
}

function setAdminResult(message, type = 'neutral') {
  const badge = $('adminResult');
  if (!badge) return;
  badge.textContent = message;
  badge.className = `badge ${type}`;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function handleAdminSubmit(form, endpoint, successLabel) {
  setAdminResult('Executando...', 'neutral');
  const button = form.querySelector('button');
  button.disabled = true;

  try {
    const result = await postJSON(endpoint, formValues(form));
    setAdminResult(result.message || successLabel, 'ok');
    await refresh();
  } catch (error) {
    setAdminResult(error.message, 'bad');
  } finally {
    button.disabled = false;
  }
}

async function refresh() {
  $('refreshBtn').disabled = true;
  $('refreshBtn').textContent = 'Atualizando...';

  try {
    const [overview, leaderboard, moderation, tickets, badges, shop, automod, logs, modules] = await Promise.all([
      fetchJSON('/api/overview'),
      fetchJSON('/api/leaderboard'),
      fetchJSON('/api/moderation'),
      fetchJSON('/api/tickets'),
      fetchJSON('/api/badges'),
      fetchJSON('/api/shop'),
      fetchJSON('/api/automod'),
      fetchJSON('/api/logs'),
      fetchJSON('/api/modules/settings')
    ]);

    state.overview = overview;
    state.leaderboard = leaderboard;
    state.moderation = moderation;
    state.tickets = tickets;
    state.badges = badges;
    state.shop = shop;
    state.automod = automod;
    state.logs = logs;
    state.modules = modules;

    renderHealth(overview);
    renderOverview(overview);
    renderLeaderboard(leaderboard);
    renderModeration(moderation);
    renderTickets(tickets);
    renderBadges(badges);
    renderShop(shop);
    renderAutomod(automod);
    renderLogs(logs);
    renderAdminOptions(badges);
    renderModuleSettings(modules);

    setText('lastUpdated', `Atualizado ${dateTime.format(new Date())}`);
  } catch (error) {
    console.error(error);
    if (error.status === 401) {
      renderAuth({ configured: true, authenticated: false, loginUrl: '/api/auth/login' });
      return;
    }
    const badge = $('botBadge');
    badge.textContent = 'Erro';
    badge.className = 'badge bad';
    setText('healthMessage', error.message);
  } finally {
    $('refreshBtn').disabled = false;
    $('refreshBtn').textContent = 'Atualizar';
  }
}

$('refreshBtn').addEventListener('click', refresh);

$('moderationForm')?.addEventListener('submit', event => {
  event.preventDefault();
  handleAdminSubmit(event.currentTarget, '/api/admin/moderation', 'Acao aplicada.');
});

$('xpForm')?.addEventListener('submit', event => {
  event.preventDefault();
  handleAdminSubmit(event.currentTarget, '/api/admin/xp', 'XP atualizado.');
});

$('coinsForm')?.addEventListener('submit', event => {
  event.preventDefault();
  handleAdminSubmit(event.currentTarget, '/api/admin/coins', 'Coins atualizados.');
});

$('cpForm')?.addEventListener('submit', event => {
  event.preventDefault();
  handleAdminSubmit(event.currentTarget, '/api/admin/cp', 'CP atualizado.');
});

$('badgeForm')?.addEventListener('submit', event => {
  event.preventDefault();
  handleAdminSubmit(event.currentTarget, '/api/admin/badges', 'Badge entregue.');
});

$('automodForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = formValues(form);
  const body = {
    ruleName: values.ruleName,
    enabled: values.enabled === 'true'
  };
  if (values.fieldA) body[values.fieldA] = parseAutomodValue(values.valueA);
  if (values.fieldB) body[values.fieldB] = parseAutomodValue(values.valueB);
  setAdminResult('Salvando AutoMod...', 'neutral');
  postJSON('/api/admin/automod', body)
    .then(() => {
      setAdminResult('AutoMod atualizado.', 'ok');
      return refresh();
    })
    .catch(error => setAdminResult(error.message, 'bad'));
});

$('moduleSettingsGrid')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target.closest('form[data-module-key]');
  if (!form) return;

  const moduleKey = form.dataset.moduleKey;
  const values = formValues(form);
  const settings = {};
  for (const [key, value] of Object.entries(values)) {
    if (!key.startsWith('settings.')) continue;
    const settingKey = key.slice('settings.'.length);
    settings[settingKey] = parseModuleValue(value);
  }

  setText('moduleResult', 'Salvando...');
  $('moduleResult').className = 'badge neutral';
  postJSON(`/api/modules/settings/${moduleKey}`, {
    enabled: form.querySelector('[name="enabled"]')?.checked === true,
    settings
  })
    .then(() => {
      setText('moduleResult', 'Modulo salvo.');
      $('moduleResult').className = 'badge ok';
      return refresh();
    })
    .catch(error => {
      setText('moduleResult', error.message);
      $('moduleResult').className = 'badge bad';
    });
});

function parseModuleValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(String(value || '').trim())) return Number(value);
  return value;
}

function parseAutomodValue(value) {
  if (/^-?\d+$/.test(String(value || '').trim())) return Number(value);
  return value;
}

async function init() {
  try {
    const auth = await fetchJSON('/api/auth/me');
    renderAuth(auth);
    if (auth.authenticated) {
      await refresh();
      setInterval(refresh, 30000);
    }
  } catch (error) {
    console.error(error);
    renderAuth({ configured: true, authenticated: false, loginUrl: '/api/auth/login' });
  }
}

init();
