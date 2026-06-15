const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionFlagsBits
} = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Database = require('../database/database');
const blueprint = require('../config/gota-blueprint.json');

const dryRun = process.argv.includes('--dry-run');
const refreshInfo = process.argv.includes('--refresh-info');
const guildIdArg = process.argv.find(arg => arg.startsWith('--guild='));
const guildId = guildIdArg?.split('=')[1] || process.env.GOTA_GUILD_ID || blueprint.guildId;
const token = process.env.DISCORD_TOKEN;
const ownerUserId = process.env.OWNER_USER_ID;

if (!token || !guildId) {
  console.error('Missing DISCORD_TOKEN or target guild id.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});
const db = new Database();
const state = {
  roles: new Map(),
  channels: new Map(),
  categories: new Map()
};

function log(message) {
  console.log(`${dryRun ? '[dry-run] ' : ''}${message}`);
}

function permissionsFromNames(names = []) {
  return names.map(name => PermissionFlagsBits[name]).filter(Boolean);
}

function normalizeName(name) {
  return name.toLowerCase();
}

function staffRoleIds() {
  return ['owner', 'staff']
    .map(key => state.roles.get(key)?.id)
    .filter(Boolean);
}

function mergeOverwrites(overwrites) {
  const merged = new Map();
  for (const overwrite of overwrites) {
    const current = merged.get(overwrite.id) || { id: overwrite.id, allow: [], deny: [] };
    current.allow.push(...(overwrite.allow || []));
    current.deny.push(...(overwrite.deny || []));
    merged.set(overwrite.id, current);
  }

  return [...merged.values()].map(overwrite => ({
    id: overwrite.id,
    allow: [...new Set(overwrite.allow)].filter(permission => !new Set(overwrite.deny).has(permission)),
    deny: [...new Set(overwrite.deny)]
  }));
}

function overwrites(guild, categoryData, channelData = {}) {
  const everyoneId = guild.roles.everyone.id;
  const member = state.roles.get('member');
  const muted = state.roles.get('muted');
  const result = [];
  const staffOnly = Boolean(categoryData.staffOnly || channelData.staffOnly);

  if (staffOnly) {
    result.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] });
    if (member) result.push({ id: member.id, deny: [PermissionFlagsBits.ViewChannel] });
    for (const roleId of staffRoleIds()) {
      result.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      });
    }
  } else if (member) {
    result.push({
      id: everyoneId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: []
    });
    result.push({
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    });
  }

  if (channelData.locked) {
    const lockedDenies = [
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
      PermissionFlagsBits.SendMessagesInThreads
    ];
    result.push({ id: everyoneId, deny: lockedDenies });
    if (member) result.push({ id: member.id, deny: lockedDenies });
    for (const roleId of staffRoleIds()) {
      result.push({ id: roleId, allow: lockedDenies });
    }
  }

  if (muted) {
    result.push({
      id: muted.id,
      deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.Speak]
    });
  }

  return mergeOverwrites(result);
}

async function findOrCreateRole(guild, roleData) {
  const existing = guild.roles.cache.find(role => normalizeName(role.name) === normalizeName(roleData.name));
  if (existing) {
    state.roles.set(roleData.key, existing);
    log(`role exists: ${roleData.name}`);
    return existing;
  }

  if (dryRun) {
    log(`would create role: ${roleData.name}`);
    return null;
  }

  const role = await guild.roles.create({
    name: roleData.name,
    colors: { primaryColor: roleData.color },
    permissions: permissionsFromNames(roleData.permissions),
    hoist: Boolean(roleData.hoist),
    mentionable: false,
    reason: 'Gota DAgua server structure setup'
  });
  state.roles.set(roleData.key, role);
  log(`role created: ${role.name}`);
  return role;
}

async function findOrCreateCategory(guild, categoryData) {
  const existing = guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildCategory &&
    normalizeName(channel.name) === normalizeName(categoryData.name)
  );

  if (existing) {
    state.categories.set(categoryData.name, existing);
    if (!dryRun) await existing.permissionOverwrites.set(overwrites(guild, categoryData, { staffOnly: categoryData.staffOnly }));
    log(`category exists: ${categoryData.name}`);
    return existing;
  }

  if (dryRun) {
    log(`would create category: ${categoryData.name}`);
    return null;
  }

  const category = await guild.channels.create({
    name: categoryData.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites(guild, categoryData, { staffOnly: categoryData.staffOnly }),
    reason: 'Gota DAgua server structure setup'
  });
  state.categories.set(categoryData.name, category);
  log(`category created: ${category.name}`);
  return category;
}

function forumSettings(channelData) {
  if (channelData.type !== 'forum') return {};
  return {
    availableTags: [
      { name: 'Conversas', emoji: { name: '💬' } },
      { name: 'Jogos', emoji: { name: '🎮' } },
      { name: 'Ideias', emoji: { name: '💡' } },
      { name: 'Resolvido', emoji: { name: '✅' }, moderated: true }
    ],
    defaultReactionEmoji: { emojiName: '💧' },
    defaultThreadRateLimitPerUser: 5
  };
}

async function findOrCreateChannel(guild, category, categoryData, channelData) {
  const channelType = channelData.type === 'voice'
    ? ChannelType.GuildVoice
    : channelData.type === 'forum'
      ? ChannelType.GuildForum
      : ChannelType.GuildText;
  const existing = guild.channels.cache.find(channel =>
    channel.type === channelType &&
    normalizeName(channel.name) === normalizeName(channelData.name)
  );

  if (existing) {
    state.channels.set(channelData.key, existing);
    if (!dryRun) {
      const edits = {};
      if (category && existing.parentId !== category.id) edits.parent = category.id;
      if ((existing.type === ChannelType.GuildText || existing.type === ChannelType.GuildForum) && channelData.topic) edits.topic = channelData.topic;
      if (existing.type === ChannelType.GuildForum) Object.assign(edits, forumSettings(channelData));
      if (Object.keys(edits).length) await existing.edit(edits).catch(error => console.error(`Could not edit ${existing.name}:`, error.message));
      await existing.permissionOverwrites.set(overwrites(guild, categoryData, channelData));
    }
    log(`channel exists: ${channelData.name}`);
    return existing;
  }

  if (dryRun) {
    log(`would create channel: ${channelData.name}`);
    return null;
  }

  const channel = await guild.channels.create({
    name: channelData.name,
    type: channelType,
    parent: category?.id,
    topic: channelType === ChannelType.GuildText || channelType === ChannelType.GuildForum ? channelData.topic : undefined,
    permissionOverwrites: overwrites(guild, categoryData, channelData),
    ...forumSettings(channelData),
    reason: 'Gota DAgua server structure setup'
  });
  state.channels.set(channelData.key, channel);
  log(`channel created: ${channel.name}`);
  return channel;
}

async function clearOfficialInfoMessages(channel, key) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return;

  for (const message of messages.values()) {
    if (message.author.id === client.user.id && message.embeds.some(embed => embed.footer?.text === key)) {
      await message.delete().catch(() => {});
    }
  }
}

async function ensureInfoMessage(channel, key, embed, components = []) {
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const existing = messages?.filter(message =>
    message.author.id === client.user.id &&
    message.embeds.some(current => current.footer?.text === key)
  );

  if (refreshInfo) {
    await clearOfficialInfoMessages(channel, key);
  } else if (existing?.size > 0) {
    const keep = existing.first();
    const duplicates = existing.filter(message => message.id !== keep.id);
    for (const duplicate of duplicates.values()) await duplicate.delete().catch(() => {});
    log(`info message exists: #${channel.name} ${key}`);
    return;
  }

  if (dryRun) {
    log(`would send info message: #${channel.name} ${key}`);
    return;
  }

  embed.setFooter({ text: key }).setTimestamp();
  const message = await channel.send({ embeds: [embed], components });
  await message.pin('Gota DAgua official info message').catch(() => {});
  log(`info message sent: #${channel.name} ${key}`);
}

function roleButton(role, style = ButtonStyle.Secondary) {
  const emojiMatch = role.name.match(/^(\S+)/);
  const cleanName = role.name.replace(/^(\S+)\s*/, '').slice(0, 80);
  return new ButtonBuilder()
    .setCustomId(`role_toggle_${role.id}`)
    .setLabel(cleanName || role.name.slice(0, 80))
    .setEmoji(emojiMatch?.[1] || undefined)
    .setStyle(style);
}

function roleRows(roleKeys, style = ButtonStyle.Secondary) {
  const rows = [];
  let row = new ActionRowBuilder();
  for (const key of roleKeys) {
    const role = state.roles.get(key);
    if (!role) continue;
    row.addComponents(roleButton(role, style));
    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
  }
  if (row.components.length) rows.push(row);
  return rows;
}

function rulesEmbeds() {
  return [
    new EmbedBuilder()
      .setColor('#38BDF8')
      .setTitle('🚨📜 Regras Oficiais do Servidor 📜🚨')
      .setDescription([
        'Ao permanecer no servidor, voce declara que leu, entendeu e concorda com todas as regras abaixo.',
        '',
        '**1. Respeito e comportamento**',
        'Respeito e obrigatorio em qualquer situacao.',
        'Proibido ofender, provocar, humilhar, intimidar ou desrespeitar membros ou staff.',
        'Discussoes agressivas nao serao toleradas.',
        'Proibido solicitar cargos.',
        '**Punicao:** Warn -> Mute -> Ban.',
        '',
        '**2. Palavroes e linguagem**',
        'Palavroes, linguagem ofensiva, toxica ou desrespeitosa sao proibidos.',
        'Insinuacoes ou piadas de mau gosto nao sao permitidas.',
        '**Punicao:** Warn imediato -> Mute. Reincidencia: Ban.',
        '',
        '**3. Uso dos canais**',
        'Cada canal possui uma finalidade.',
        'Evite flood, spam, mensagens repetidas, assunto fora de contexto, letras grandes e emojis grandes em excesso.',
        '**Punicao:** Warn -> Mute.'
      ].join('\n')),
    new EmbedBuilder()
      .setColor('#0EA5E9')
      .setTitle('📌 Regras de conteudo e divulgacao')
      .setDescription([
        '**4. Conteudo proibido**',
        'Conteudo +18, gore, violencia explicita, midias improprias, material ilegal e links de cunho improprio sao proibidos.',
        '**Punicao:** Mute imediato -> Ban direto, dependendo do caso.',
        '',
        '**5. Divulgacao e propaganda**',
        'Proibida qualquer divulgacao sem autorizacao.',
        'Links de servidores, canais, sites ou produtos dependem de aprovacao da staff.',
        '**Punicao:** Warn -> Mute -> Ban.',
        '',
        '**6. Bots e comandos**',
        'Use comandos apenas nos canais permitidos.',
        'Spam ou abuso de bots nao sera tolerado.',
        '**Punicao:** Warn -> Mute.'
      ].join('\n')),
    new EmbedBuilder()
      .setColor('#22C55E')
      .setTitle('🛡️ Staff, moderacao e punicoes')
      .setDescription([
        '**7. Staff e moderacao**',
        'Decisoes da staff devem ser respeitadas.',
        'Desafiar, provocar ou desrespeitar a staff e infracao grave.',
        'Reclamacoes devem ser tratadas via ticket.',
        'Denuncie abuso de autoridade ou conduta inadequada da staff.',
        'A staff pode aplicar punicoes fora da progressao padrao conforme a gravidade.',
        '**Punicao:** Warn -> Mute -> Ban.',
        '',
        '**8. Punicoes**',
        'Warn, mute, kick e ban podem ser aplicados conforme gravidade, intencao e reincidencia.',
        '',
        '**Avisos**',
        'Mudancas nas regras podem receber aviso previo.',
        'As punicoes consideram intencao e reincidencia.',
        '',
        '💙 Respeite as regras para uma comunidade agradavel.'
      ].join('\n'))
  ];
}

async function sendRules(channel) {
  if (!channel) return;
  const key = 'gota:rules:v1';
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const existing = messages?.filter(message =>
    message.author.id === client.user.id &&
    message.embeds.some(current => current.footer?.text?.startsWith(key))
  );

  if (refreshInfo) {
    for (const message of existing?.values() || []) await message.delete().catch(() => {});
  } else if (existing?.size >= 3) {
    log(`rules messages exist: #${channel.name}`);
    return;
  }

  if (dryRun) {
    log(`would send rules messages: #${channel.name}`);
    return;
  }

  const embeds = rulesEmbeds();
  for (let index = 0; index < embeds.length; index += 1) {
    embeds[index].setFooter({ text: `${key}:${index + 1}` }).setTimestamp();
    const message = await channel.send({ embeds: [embeds[index]] });
    await message.pin('Gota DAgua official rules').catch(() => {});
  }
  log(`rules messages sent: #${channel.name}`);
}

async function sendRolePanels() {
  const roleChannels = [
    state.channels.get('roles'),
    state.channels.get('role_pick')
  ].filter(Boolean);

  for (const channel of roleChannels) {
    await ensureInfoMessage(channel, 'gota:colors:v1', new EmbedBuilder()
      .setColor('#38BDF8')
      .setTitle('🎨✨ Cores do perfil ✨🎨')
      .setDescription([
        'Escolha uma cor para decorar seu perfil.',
        'Voce pode trocar quando quiser clicando novamente nos botoes abaixo.',
        '',
        '🔵 Azul',
        '🟢 Verde Limao',
        '🌿 Menta',
        '🟡 Amarelo',
        '🟠 Salmao',
        '⚪ Algodao Doce',
        '🟣 Roxo',
        '🟧 Laranja',
        '🔴 Vermelho',
        '⚪ Branco',
        '⚫ Preto'
      ].join('\n')), roleRows(blueprint.rolePanels.colors));

    await ensureInfoMessage(channel, 'gota:interests:v1', new EmbedBuilder()
      .setColor('#0EA5E9')
      .setTitle('Cargos e notificacoes 💧')
      .setDescription([
        'Pegue cargos para mostrar seus interesses e receber pings certos.',
        '',
        'Use Gamer, Musica, Arte, Anime, Memes, Social, Corujao, Eventos, Sorteios, Ping LiveON e Ping Jogatina.'
      ].join('\n')), roleRows(blueprint.rolePanels.interests, ButtonStyle.Primary));
  }
}

async function sendInfoMessages(guild) {
  await ensureInfoMessage(state.channels.get('welcome'), 'gota:welcome:v1', new EmbedBuilder()
    .setColor('#38BDF8')
    .setTitle("Bem-vindo(a) ao Gota D'Agua! 💧")
    .setDescription([
      'Ja bebeu agua hoje?',
      '',
      'Antes de comecar, leia 📜｜regras, escolha suas cores em 🎨｜aquarela e se apresente em 🤝｜apresente-se.',
      '',
      'Depois disso, cola no 💬｜chat-geral e fique a vontade. Aqui e um espaco para conversar, jogar, rir, ouvir musica e conhecer gente nova.'
    ].join('\n')));

  await sendRules(state.channels.get('rules'));

  await ensureInfoMessage(state.channels.get('introductions'), 'gota:intro:v1', new EmbedBuilder()
    .setColor('#2DD4BF')
    .setTitle('Apresente-se para a comunidade 💧')
    .setDescription([
      'Conte um pouco sobre voce:',
      '',
      '**Nome ou apelido:**',
      '**Idade:**',
      '**O que gosta de jogar:**',
      '**Hobbies:**',
      '**Como encontrou o servidor:**',
      '**Ja bebeu agua hoje?**'
    ].join('\n')));

  await sendRolePanels();

  await ensureInfoMessage(state.channels.get('announcements'), 'gota:announcements:v1', new EmbedBuilder()
    .setColor('#FACC15')
    .setTitle('📣 Anuncios')
    .setDescription('Canal reservado para avisos importantes, eventos, mudancas e comunicados do servidor.'));

  await ensureInfoMessage(state.channels.get('staff_intro'), 'gota:staff:v1', new EmbedBuilder()
    .setColor('#22C55E')
    .setTitle('Conheca a staff')
    .setDescription('A staff cuida da organizacao, seguranca, eventos e suporte. Caso precise de ajuda privada, abra um ticket.'));

  await ensureInfoMessage(state.channels.get('live_on'), 'gota:live:v1', new EmbedBuilder()
    .setColor('#EF4444')
    .setTitle('🔴 LiveON')
    .setDescription('Canal para avisos de lives. Quem quiser receber ping pode pegar o cargo 🔴 Ping LiveON em 🎨｜aquarela.'));

  await ensureInfoMessage(state.channels.get('starboard'), 'gota:starboard:v1', new EmbedBuilder()
    .setColor('#FACC15')
    .setTitle('⭐ Starboard')
    .setDescription('As melhores mensagens, memes e momentos do servidor podem aparecer aqui como destaque.'));

  await ensureInfoMessage(state.channels.get('events'), 'gota:events:v1', new EmbedBuilder()
    .setColor('#FB923C')
    .setTitle('📅 Eventos')
    .setDescription('Agenda oficial para Noite da Gota, Corujao, Sessao de Musica, Dia de Jogatina, sorteios e desafios.'));

  await ensureInfoMessage(state.channels.get('rankings'), 'gota:rankings:v1', new EmbedBuilder()
    .setColor('#FACC15')
    .setTitle('🏆 Rankings')
    .setDescription('Canal para rankings de jogos, desafios, placares e destaques da galera.'));

  await ensureInfoMessage(state.channels.get('game_events'), 'gota:game-events:v1', new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle('🎮 Eventos de jogos')
    .setDescription('Use este canal para organizar Gartic, Stop, Roblox, Minecraft, Valorant, Among Us e outras jogatinas.'));

  await ensureInfoMessage(state.channels.get('music_request'), 'gota:music:v1', new EmbedBuilder()
    .setColor('#06B6D4')
    .setTitle('🎧 Peca sua musica')
    .setDescription([
      'Use este canal para pedir musicas e controlar o bot musical.',
      '',
      'Entre em uma call, use o comando do bot musical instalado e combine a fila com quem estiver ouvindo.'
    ].join('\n')));

  await ensureInfoMessage(state.channels.get('voice_interface'), 'gota:voice:v1', new EmbedBuilder()
    .setColor('#F43F5E')
    .setTitle('TempVoice Interface')
    .setDescription([
      'Este canal fica reservado para interface de canais temporarios quando o bot externo estiver instalado.',
      '',
      'A ideia e usar botoes para renomear call, limitar membros, bloquear/desbloquear e transferir dono da sala.'
    ].join('\n')));

  await ensureInfoMessage(state.channels.get('ticket'), 'gota:ticket:v1', new EmbedBuilder()
    .setColor('#F97316')
    .setTitle('🎫 Suporte')
    .setDescription([
      'Abra ticket quando precisar falar com a staff em privado.',
      '',
      'Use para problemas com membros, denuncias, duvidas sensiveis ou assuntos que nao devem ficar publicos.'
    ].join('\n')));

  db.createGuild(guild.id, guild.name);
  const welcome = state.channels.get('welcome');
  const levels = state.channels.get('levels');
  const logs = state.channels.get('logs');
  if (welcome) {
    db.setWelcomeConfig(guild.id, {
      enabled: true,
      channelId: welcome.id,
      dmEnabled: false,
      dmMessage: `Bem-vindo(a) ao ${guild.name}!`,
      embedTitle: null,
      embedDescription: "Bem-vindo(a), {user}! Leia as regras, escolha seus cargos e se apresente.",
      embedColor: '#38BDF8',
      embedThumbnail: null
    });
  }
  db.setLevelingConfig(guild.id, {
    enabled: true,
    xpMin: 10,
    xpMax: 18,
    cooldown: 60000,
    levelUpMessage: 'Parabens {user}! Voce alcancou o nivel **{level}** no Gota DAgua.'
  });
  db.setEconomyConfig(guild.id, {
    enabled: true,
    currency: 'Gotinhas',
    dailyReward: 50,
    weeklyReward: 250
  });
  db.updateGuildConfig(guild.id, {
    brand: "Gota D'Agua",
    defaultChatChannelId: state.channels.get('general')?.id || null,
    modLogChannelId: logs?.id || null,
    levelLogChannelId: levels?.id || null
  });
}

async function assignOwnerRole(guild) {
  if (!ownerUserId || dryRun) return;
  const role = state.roles.get('owner');
  if (!role) return;
  const member = await guild.members.fetch(ownerUserId).catch(() => null);
  if (!member) return;
  await member.roles.add(role, 'Gota DAgua owner sync').catch(error => {
    console.error(`Could not assign owner role: ${error.message}`);
  });
  const gotinha = state.roles.get('member');
  if (gotinha) await member.roles.add(gotinha, 'Gota DAgua member sync').catch(() => {});
}

async function syncBotNickname(guild) {
  if (dryRun || !blueprint.botNickname) {
    if (blueprint.botNickname) log(`would set bot nickname: ${blueprint.botNickname}`);
    return;
  }

  const botMember = await guild.members.fetch(client.user.id).catch(() => null);
  if (!botMember) return;
  if (botMember.displayName === blueprint.botNickname) {
    log(`bot nickname exists: ${blueprint.botNickname}`);
    return;
  }

  await botMember.setNickname(blueprint.botNickname, 'Gota DAgua bot nickname setup').catch(error => {
    console.error(`Could not set bot nickname: ${error.message}`);
  });
  log(`bot nickname synced: ${blueprint.botNickname}`);
}

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();
    log(`Applying Gota DAgua structure to ${guild.name} (${guild.id})`);

    for (const roleData of blueprint.roles) await findOrCreateRole(guild, roleData);
    for (const categoryData of blueprint.categories) {
      const category = await findOrCreateCategory(guild, categoryData);
      for (const channelData of categoryData.channels) {
        await findOrCreateChannel(guild, category, categoryData, channelData);
      }
    }

    if (!dryRun && guild.name !== blueprint.name) {
      await guild.setName(blueprint.name, 'Gota DAgua branding setup').catch(error => {
        console.error(`Could not rename guild: ${error.message}`);
      });
    }

    await assignOwnerRole(guild);
    await syncBotNickname(guild);
    await sendInfoMessages(guild);
    log('Gota DAgua structure applied.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.destroy();
    db.db?.close?.();
  }
});

client.login(token);
