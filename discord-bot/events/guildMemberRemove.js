const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member, client) {
    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const embed = modlogs.baseEmbed('Member Left', 0x99AAB5)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})`, inline: false },
        { name: 'Joined At', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
      );

    await modlogs.send(member.guild, embed);
  }
};
