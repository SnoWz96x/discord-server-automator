const state = {
  overview: null,
  leaderboard: null,
  moderation: null,
  tickets: null,
  badges: null,
  shop: null
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

function userLabel(row) {
  return row.username || row.id || 'Unknown user';
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
        <td><span class="chip">${row.action}</span></td>
        <td>${row.user_id}</td>
        <td>${row.moderator_id || '-'}</td>
        <td>${row.reason || '-'}</td>
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
        <div class="ticket-title">#${ticket.channel_id}</div>
        <div class="ticket-meta">${ticket.category || 'Ticket'} · user ${ticket.user_id}</div>
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
        <div class="leader-meta">${item.description || 'Item RoguePoke'} · ID ${item.key}</div>
      </div>
      <div class="shop-price">
        <strong>${currency.format(item.price_coins || 0)} + ${currency.format(item.price_cp || 0)}</strong>
        <span>coins + CP</span>
        <small>Nivel ${item.min_level || 0}</small>
      </div>
    </div>
  `).join('') : '<div class="empty">A loja ainda nao tem itens.</div>';
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
    const [overview, leaderboard, moderation, tickets, badges, shop] = await Promise.all([
      fetchJSON('/api/overview'),
      fetchJSON('/api/leaderboard'),
      fetchJSON('/api/moderation'),
      fetchJSON('/api/tickets'),
      fetchJSON('/api/badges'),
      fetchJSON('/api/shop')
    ]);

    state.overview = overview;
    state.leaderboard = leaderboard;
    state.moderation = moderation;
    state.tickets = tickets;
    state.badges = badges;
    state.shop = shop;

    renderHealth(overview);
    renderOverview(overview);
    renderLeaderboard(leaderboard);
    renderModeration(moderation);
    renderTickets(tickets);
    renderBadges(badges);
    renderShop(shop);
    renderAdminOptions(badges);

    setText('lastUpdated', `Atualizado ${dateTime.format(new Date())}`);
  } catch (error) {
    console.error(error);
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

refresh();
setInterval(refresh, 30000);
