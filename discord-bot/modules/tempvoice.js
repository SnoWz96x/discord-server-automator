const { ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'tempvoice',

  tempChannels: new Map(),

  init() {
    console.log('TempVoice module initialized');
  },

  async handleVoiceStateUpdate(oldState, newState, client) {
    const config = client.db.getTempVoiceConfig(newState.guild.id);
    if (!config || !config.enabled || !config.channel_id) return;

    const joinedCreateChannel = newState.channelId === config.channel_id && oldState.channelId !== config.channel_id;
    if (joinedCreateChannel) {
      await this.createTempChannel(newState, client, config);
    }

    if (!oldState.channel || !this.tempChannels.has(oldState.channel.id)) return;

    if (oldState.channel.members.size === 0) {
      await this.deleteTempChannel(oldState.channel);
      return;
    }

    const nextOwner = oldState.channel.members.first();
    if (!nextOwner) return;

    await oldState.channel.permissionOverwrites.edit(nextOwner.user, {
      ManageChannels: true,
      ManagePermissions: true
    }).catch(() => {});
  },

  async createTempChannel(state, client, config) {
    try {
      const member = state.member;
      const user = member?.user || state.client?.users.cache.get(state.id);
      if (!member || !user) return;

      const safeName = (user.username || 'voice')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32) || 'voice';

      const channel = await state.guild.channels.create({
        name: `voice-${safeName}`,
        type: ChannelType.GuildVoice,
        parent: config?.category_id || null,
        permissionOverwrites: [
          {
            id: state.guild.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManagePermissions
            ]
          }
        ]
      });

      this.tempChannels.set(channel.id, {
        ownerId: user.id,
        createdAt: Date.now()
      });

      await state.setChannel(channel);

      console.log(`Temp voice channel created: ${channel.name} by ${user.tag}`);
    } catch (error) {
      console.error('Error creating temp voice channel:', error);
    }
  },

  async deleteTempChannel(channel) {
    try {
      this.tempChannels.delete(channel.id);
      await channel.delete();
      console.log(`Temp voice channel deleted: ${channel.name}`);
    } catch (error) {
      console.error('Error deleting temp voice channel:', error);
    }
  }
};
