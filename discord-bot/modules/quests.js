const quests = [
  {
    key: 'daily_messages',
    period: 'daily',
    type: 'message',
    title: 'Presenca diaria',
    description: 'Envie 10 mensagens validas no servidor.',
    target: 10,
    rewards: { xp: 80, coins: 75, cp: 5 }
  },
  {
    key: 'daily_voice',
    period: 'daily',
    type: 'voice',
    title: 'Treino em call',
    description: 'Fique 30 minutos em canais de voz.',
    target: 30,
    rewards: { xp: 120, coins: 120, cp: 10 }
  },
  {
    key: 'weekly_forum',
    period: 'weekly',
    type: 'forum_post',
    title: 'Feedback da comunidade',
    description: 'Crie 1 postagem em bugs, sugestoes ou reports.',
    target: 1,
    rewards: { xp: 250, coins: 300, cp: 35, badge: 'community_voice' }
  }
];

module.exports = {
  name: 'quests',

  init(client) {
    client.db.upsertBadge({
      key: 'community_voice',
      name: 'Voz da Comunidade',
      emoji: '📣',
      description: 'Contribuiu com feedback organizado em forum.'
    });
    console.log('Quests module initialized');
  },

  definitions: quests,

  periodKey(period, date = new Date()) {
    const year = date.getUTCFullYear();
    const dayStart = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
    if (period === 'daily') return `daily:${date.toISOString().slice(0, 10)}`;
    const firstDay = Date.UTC(year, 0, 1);
    const week = Math.floor((dayStart - firstDay) / 604800000) + 1;
    return `weekly:${year}-W${String(week).padStart(2, '0')}`;
  },

  record(client, guildId, userId, type, amount = 1) {
    const updated = [];
    for (const quest of quests.filter(item => item.type === type)) {
      const periodKey = this.periodKey(quest.period);
      const row = client.db.incrementQuestProgress(guildId, userId, quest.key, periodKey, amount, quest.target);
      if (row) updated.push({ quest, row });
    }
    return updated;
  },

  listForUser(client, guildId, userId) {
    const rows = [];
    for (const quest of quests) {
      const periodKey = this.periodKey(quest.period);
      const progress = client.db.getQuestProgressRow(guildId, userId, quest.key, periodKey);
      rows.push({
        ...quest,
        periodKey,
        progress: progress?.progress || 0,
        completed: Boolean(progress?.completed),
        claimed: Boolean(progress?.claimed)
      });
    }
    return rows;
  },

  claim(client, guildId, userId, questKey) {
    const quest = quests.find(item => item.key === questKey);
    if (!quest) return { success: false, message: 'Quest nao encontrada.' };

    const periodKey = this.periodKey(quest.period);
    const row = client.db.claimQuest(guildId, userId, quest.key, periodKey);
    if (!row) return { success: false, message: 'Quest incompleta ou ja resgatada.' };

    const rewards = quest.rewards || {};
    if (rewards.xp) client.db.updateUserXP(userId, guildId, rewards.xp);
    if (rewards.coins) client.db.addCoins(userId, guildId, rewards.coins);
    if (rewards.cp) client.db.addCp(userId, guildId, rewards.cp);
    if (rewards.badge) client.db.awardBadge(guildId, userId, rewards.badge);

    return { success: true, quest, rewards };
  }
};
