const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'leveling',

  cooldowns: new Map(),

  init() {
    console.log('Leveling module initialized');
  },

  async addXP(userId, guildId, client) {
    const config = client.db.getLevelingConfig(guildId);
    if (!config || !config.enabled) return;

    const now = Date.now();
    const lastXP = this.cooldowns.get(`${userId}-${guildId}`) || 0;
    if (now - lastXP < config.cooldown) return;

    this.cooldowns.set(`${userId}-${guildId}`, now);

    client.db.createUser(userId, guildId, '');

    const xp = Math.floor(Math.random() * (config.xp_max - config.xp_min + 1)) + config.xp_min;
    client.db.updateUserXP(userId, guildId, xp);

    const user = client.db.getUser(userId, guildId);
    const newLevel = Math.floor(0.1 * Math.sqrt(user.xp));

    if (newLevel > user.level) {
      client.db.setUserLevel(userId, guildId, newLevel);
      await this.onLevelUp(userId, guildId, newLevel, client);
    }
  },

  async onLevelUp(userId, guildId, level, client) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = guild.members.cache.get(userId);
    if (!member) return;

    const config = client.db.getLevelingConfig(guildId);
    const message = (config?.level_up_message || 'Parabens {user}! Voce alcancou o nivel **{level}**.')
      .replace('{user}', `${member}`)
      .replace('{level}', level);

    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle('Level Up')
      .setDescription(message)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    try {
      await member.send({ embeds: [embed] }).catch(() => {});

      const channel = guild.systemChannel;
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error sending level up message:', error);
    }

    const rewards = client.db.getLevelRewards(guildId);
    const reward = rewards.find(row => row.level === level);
    if (!reward) return;

    try {
      const role = guild.roles.cache.get(reward.role_id);
      if (role) {
        await member.roles.add(role);
        console.log(`Role ${role.name} given to ${member.user.tag} for reaching level ${level}`);
      }

      if (reward.badge_key) {
        client.db.awardBadge(guildId, userId, reward.badge_key);
      }
    } catch (error) {
      console.error('Error applying level reward:', error);
    }
  },

  getRank(userId, guildId, client) {
    const user = client.db.getUser(userId, guildId);
    if (!user) return null;

    const leaderboard = client.db.getLeaderboard(guildId, 100);
    const rank = leaderboard.findIndex(row => row.id === userId) + 1;

    return {
      level: user.level,
      xp: user.xp,
      rank,
      xpForNextLevel: Math.pow((user.level + 1) / 0.1, 2)
    };
  },

  getLeaderboard(guildId, client) {
    return client.db.getLeaderboard(guildId, 10);
  }
};
