const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildBanAdd,
  once: false,
  async execute(ban, client) {
    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const embed = modlogs.baseEmbed('Member Banned', 0xED4245)
      .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: false },
        { name: 'Reason', value: ban.reason || 'No reason provided', inline: false }
      );

    await modlogs.send(ban.guild, embed);
  }
};
