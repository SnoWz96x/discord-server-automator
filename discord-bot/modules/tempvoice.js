const { ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'tempvoice',

  tempChannels: new Map(),

  init(client) {
    console.log('TempVoice module initialized');
  },

  async handleVoiceStateUpdate(oldState, newState, client) {
    const config = client.db.getTempVoiceConfig(newState.guild.id);
    if (!config || !config.enabled) return;

    const joinChannelId = config.channel_id;
    if (!joinChannelId) return;

    if (newState.channel && newState.channel.id === joinChannelId && !oldState.channel) {
      await this.createTempChannel(newState, client);
    }

    if (oldState.channel && this.tempChannels.has(oldState.channel.id)) {
      const tempChannel = this.tempChannels.get(oldState.channel.id);
      if (oldState.channel.members.size === 0) {
        await this.deleteTempChannel(oldState.channel, client);
      } else if (oldState.channel.members.size > 0) {
        const owner = oldState.channel.members.first();
        if (owner) {
          try {
            await oldState.channel.permissionOverwrites.edit(owner.user, {
              ManageChannels: true,
              ManagePermissions: true
            });
          } catch (error) {}
        }
      }
    }
  },

  async createTempChannel(member, client) {
    try {
      const channel = await member.guild.channels.create({
        name: `🔊 ${member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: null,
        permissionOverwrites: [
          {
            id: member.guild.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
          },
          {
            id: member.user.id,
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
        ownerId: member.user.id,
        createdAt: Date.now()
      });

      await member.voice.setChannel(channel);

      console.log(`🔊 Temp voice channel created: ${channel.name} by ${member.user.tag}`);
    } catch (error) {
      console.error('Error creating temp voice channel:', error);
    }
  },

  async deleteTempChannel(channel, client) {
    try {
      this.tempChannels.delete(channel.id);
      await channel.delete();
      console.log(`🔊 Temp voice channel deleted: ${channel.name}`);
    } catch (error) {
      console.error('Error deleting temp voice channel:', error);
    }
  }
};
