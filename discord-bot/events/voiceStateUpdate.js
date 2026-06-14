const { Events, ChannelType } = require('discord.js');

module.exports = {
  name: Events.VoiceStateUpdate,
  once: false,
  async execute(oldState, newState, client) {
    const tempVoiceModule = client.modules.get('tempvoice');
    if (tempVoiceModule) {
      await tempVoiceModule.handleVoiceStateUpdate(oldState, newState, client);
    }

    const activityRewardsModule = client.modules.get('activityRewards');
    if (activityRewardsModule) {
      activityRewardsModule.handleVoiceStateUpdate(oldState, newState, client);
    }
  }
};
