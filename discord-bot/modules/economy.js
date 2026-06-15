const { ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'economy',

  init() {
    console.log('Economy module initialized');
  },

  ensureUser(userId, guildId, username, client) {
    client.db.createUser(userId, guildId, username || '');
    if (username) client.db.updateUsername(userId, guildId, username);
  },

  getBalance(userId, guildId, client) {
    const user = client.db.getUser(userId, guildId);
    return user ? user.coins : 0;
  },

  getCp(userId, guildId, client) {
    const user = client.db.getUser(userId, guildId);
    return user ? user.cp || 0 : 0;
  },

  addCoins(userId, guildId, amount, client) {
    client.db.addCoins(userId, guildId, amount);
    return this.getBalance(userId, guildId, client);
  },

  addCp(userId, guildId, amount, client) {
    client.db.addCp(userId, guildId, amount);
    return this.getCp(userId, guildId, client);
  },

  removeCoins(userId, guildId, amount, client) {
    const balance = this.getBalance(userId, guildId, client);
    if (balance < amount) return false;
    client.db.removeCoins(userId, guildId, amount);
    return true;
  },

  daily(userId, guildId, client) {
    const config = client.db.getEconomyConfig(guildId);
    const reward = config?.daily_reward || 100;
    const user = client.db.getUser(userId, guildId);

    if (!user) {
      client.db.createUser(userId, guildId, '');
      return this.daily(userId, guildId, client);
    }

    const now = new Date();
    const lastDaily = user.last_daily ? new Date(user.last_daily) : null;

    if (lastDaily) {
      const hoursSinceLastDaily = (now - lastDaily) / (1000 * 60 * 60);
      if (hoursSinceLastDaily < 24) {
        const hoursLeft = Math.ceil(24 - hoursSinceLastDaily);
        return { success: false, message: `Voce ja coletou seu daily. Volte em ${hoursLeft} hora(s).` };
      }
    }

    this.addCoins(userId, guildId, reward, client);
    const cpReward = 10;
    this.addCp(userId, guildId, cpReward, client);
    client.db.db.prepare('UPDATE users SET last_daily = ? WHERE id = ? AND guild_id = ?')
      .run(now.toISOString(), userId, guildId);

    return { success: true, amount: reward, cp: cpReward };
  },

  weekly(userId, guildId, client) {
    const config = client.db.getEconomyConfig(guildId);
    const reward = config?.weekly_reward || 500;
    const user = client.db.getUser(userId, guildId);

    if (!user) {
      client.db.createUser(userId, guildId, '');
      return this.weekly(userId, guildId, client);
    }

    const now = new Date();
    const lastWeekly = user.last_weekly ? new Date(user.last_weekly) : null;

    if (lastWeekly) {
      const daysSinceLastWeekly = (now - lastWeekly) / (1000 * 60 * 60 * 24);
      if (daysSinceLastWeekly < 7) {
        const daysLeft = Math.ceil(7 - daysSinceLastWeekly);
        return { success: false, message: `Voce ja coletou seu weekly. Volte em ${daysLeft} dia(s).` };
      }
    }

    this.addCoins(userId, guildId, reward, client);
    const cpReward = 75;
    this.addCp(userId, guildId, cpReward, client);
    client.db.db.prepare('UPDATE users SET last_weekly = ? WHERE id = ? AND guild_id = ?')
      .run(now.toISOString(), userId, guildId);

    return { success: true, amount: reward, cp: cpReward };
  },

  work(userId, guildId, client) {
    const minReward = 50;
    const maxReward = 200;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    const user = client.db.getUser(userId, guildId);

    if (!user) {
      client.db.createUser(userId, guildId, '');
      return this.work(userId, guildId, client);
    }

    const now = new Date();
    const lastWork = user.last_work ? new Date(user.last_work) : null;

    if (lastWork) {
      const minutesSinceLastWork = (now - lastWork) / (1000 * 60);
      if (minutesSinceLastWork < 30) {
        const minutesLeft = Math.ceil(30 - minutesSinceLastWork);
        return { success: false, message: `Voce esta cansado. Volte em ${minutesLeft} minuto(s).` };
      }
    }

    this.addCoins(userId, guildId, reward, client);
    const cpReward = Math.floor(Math.random() * 11) + 5;
    this.addCp(userId, guildId, cpReward, client);
    client.db.db.prepare('UPDATE users SET last_work = ? WHERE id = ? AND guild_id = ?')
      .run(now.toISOString(), userId, guildId);

    const works = [
      'Voce treinou uma rota de batalha',
      'Voce completou uma missao da comunidade',
      'Voce encontrou um item raro',
      'Voce ajudou outro treinador',
      'Voce venceu uma run curta'
    ];

    return { success: true, amount: reward, cp: cpReward, work: works[Math.floor(Math.random() * works.length)] };
  },

  async buy(userId, guildId, itemKey, client, options = {}) {
    const item = client.db.getShopItem(guildId, itemKey);
    if (!item) return { success: false, message: 'Item nao encontrado na lojinha.' };

    const user = client.db.getUser(userId, guildId);
    if (!user) {
      client.db.createUser(userId, guildId, '');
      const created = client.db.getUser(userId, guildId);
      if (!created) return { success: false, message: 'Nao foi possivel criar usuario no banco.' };
      return this.buy(userId, guildId, itemKey, client, options);
    }

    if (user.level < item.min_level) {
      return { success: false, message: `Este item exige nivel ${item.min_level}. Seu nivel atual e ${user.level}.` };
    }

    if (user.coins < item.price_coins) {
      return { success: false, message: `Saldo insuficiente. Faltam ${item.price_coins - user.coins} PokeCoins.` };
    }

    const priceCp = item.price_cp || 0;
    if ((user.cp || 0) < priceCp) {
      return { success: false, message: `CP insuficiente. Faltam ${priceCp - (user.cp || 0)} CP.` };
    }

    const purchase = client.db.db.transaction(() => {
      client.db.removeCoins(userId, guildId, item.price_coins);
      client.db.removeCp(userId, guildId, priceCp);
      client.db.addInventoryItem(guildId, userId, item.key, 1);
      client.db.decrementShopStock(guildId, item.key, 1);
    });
    purchase();

    if (item.type === 'badge' && item.payload?.badge?.key) {
      client.db.upsertBadge(item.payload.badge);
      client.db.awardBadge(guildId, userId, item.payload.badge.key);
    }

    if (item.payload?.roleId && options.member) {
      const role = options.member.guild.roles.cache.get(item.payload.roleId);
      if (role && !options.member.roles.cache.has(role.id)) {
        await options.member.roles.add(role, `Purchased ${item.name} in RoguePoke shop`);
      }
    }

    await this.publishPurchase(guildId, userId, item, client, options).catch(error => {
      console.error('Error publishing purchase:', error);
    });

    return { success: true, item };
  },

  async publishPurchase(guildId, userId, item, client, options = {}) {
    const guild = options.member?.guild || client.guilds?.cache?.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.find(current =>
      current.type === ChannelType.GuildText &&
      (current.name === '🧾-compras' || current.name.endsWith('-compras'))
    );
    if (!channel) return;

    const user = options.member?.user || await client.users.fetch(userId).catch(() => null);
    const embed = new EmbedBuilder()
      .setColor('#2DD4BF')
      .setTitle('Compra registrada')
      .setDescription([
        `${user ? `${user}` : `<@${userId}>`} comprou **${item.name}**.`,
        '',
        `Custo: **${Number(item.price_coins || 0).toLocaleString('pt-BR')} PokeCoins** + **${Number(item.price_cp || 0).toLocaleString('pt-BR')} CP**`,
        `Categoria: **${item.category || 'general'}**`
      ].join('\n'))
      .setTimestamp();

    if (user?.displayAvatarURL) embed.setThumbnail(user.displayAvatarURL());
    await channel.send({ embeds: [embed] });
  },

  getLeaderboard(guildId, client) {
    return client.db.getCoinLeaderboard(guildId, 10);
  }
};
