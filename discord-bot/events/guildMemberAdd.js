const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member, client) {
    const guildId = member.guild.id;
    const userId = member.user.id;

    client.db.createGuild(guildId, member.guild.name);
    client.db.createUser(userId, guildId, member.user.username);

    const welcomeModule = client.modules.get('welcome');
    if (welcomeModule) {
      await welcomeModule.sendWelcome(member, client);
    }

    const verificationModule = client.modules.get('verification');
    if (verificationModule) {
      await verificationModule.onMemberJoin(member, client);
    }

    const autoRoleModule = client.modules.get('autorole');
    if (autoRoleModule) {
      await autoRoleModule.onMemberJoin(member, client);
    }

    console.log(`📥 ${member.user.tag} joined ${member.guild.name}`);
  }
};
