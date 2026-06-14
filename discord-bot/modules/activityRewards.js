module.exports = {
  name: 'activityRewards',

  voiceXpPerMinute: 2,
  voiceCoinsPerMinute: 1,
  voiceCpEveryMinutes: 10,
  maxRewardMinutes: 180,

  init() {
    console.log('Activity rewards module initialized');
  },

  handleVoiceStateUpdate(oldState, newState, client) {
    if (oldState.member?.user.bot || newState.member?.user.bot) return;

    const userId = newState.id || oldState.id;
    const guildId = newState.guild?.id || oldState.guild?.id;
    const username = newState.member?.user.username || oldState.member?.user.username || '';

    const wasInVoice = Boolean(oldState.channelId);
    const isInVoice = Boolean(newState.channelId);
    const changedChannel = oldState.channelId !== newState.channelId;

    client.db.createUser(userId, guildId, username);
    if (username) client.db.updateUsername(userId, guildId, username);

    if (!wasInVoice && isInVoice) {
      client.db.startVoiceSession(guildId, userId, newState.channelId);
      return;
    }

    if (wasInVoice && !isInVoice) {
      this.finishVoiceSession(guildId, userId, client);
      return;
    }

    if (wasInVoice && isInVoice && changedChannel) {
      this.finishVoiceSession(guildId, userId, client);
      client.db.startVoiceSession(guildId, userId, newState.channelId);
    }
  },

  finishVoiceSession(guildId, userId, client) {
    const session = client.db.getVoiceSession(guildId, userId);
    if (!session) return null;

    client.db.clearVoiceSession(guildId, userId);

    const joinedAt = new Date(session.joined_at);
    const minutes = Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / 60000));
    const rewardMinutes = Math.min(minutes, this.maxRewardMinutes);
    if (rewardMinutes < 1) return { minutes, xp: 0, coins: 0 };

    const xp = rewardMinutes * this.voiceXpPerMinute;
    const coins = rewardMinutes * this.voiceCoinsPerMinute;
    const cp = Math.floor(rewardMinutes / this.voiceCpEveryMinutes);

    client.db.updateUserXP(userId, guildId, xp);
    client.db.addCoins(userId, guildId, coins);
    client.db.addVoiceMinutes(userId, guildId, rewardMinutes);
    if (cp > 0) client.db.addCp(userId, guildId, cp);

    const quests = client.modules.get('quests');
    if (quests) quests.record(client, guildId, userId, 'voice', rewardMinutes);

    const user = client.db.getUser(userId, guildId);
    const newLevel = Math.floor(0.1 * Math.sqrt(user.xp));
    if (newLevel > user.level) {
      client.db.setUserLevel(userId, guildId, newLevel);
      const leveling = client.modules.get('leveling');
      if (leveling) leveling.onLevelUp(userId, guildId, newLevel, client).catch(() => {});
    }

    return { minutes: rewardMinutes, xp, coins, cp };
  }
};
