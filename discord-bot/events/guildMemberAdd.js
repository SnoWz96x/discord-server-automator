const { Events } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member, client) {
    const guildId = member.guild.id;
    const userId = member.user.id;

    client.db.createGuild(guildId, member.guild.name);
    client.db.createUser(userId, guildId, member.user.username);

    const welcomeModule = client.modules.get('welcome');
    if (welcomeModule) await welcomeModule.sendWelcome(member, client);

    const verificationModule = client.modules.get('verification');
    if (verificationModule) await verificationModule.onMemberJoin(member, client);

    const autoRoleModule = client.modules.get('autorole');
    if (autoRoleModule) await autoRoleModule.onMemberJoin(member, client);

    const modlogs = client.modules.get('modlogs');
    if (modlogs) {
      const embed = modlogs.baseEmbed('Cadastro: membro entrou', 0x57F287)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Usuario', value: `${member.user.tag} (${member.id})`, inline: false },
          { name: 'Conta criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        );
      await modlogs.send(member.guild, embed);
    }

    console.log(`${member.user.tag} joined ${member.guild.name}`);
  }
};
