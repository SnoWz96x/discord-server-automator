module.exports = {
  name: 'autorole',

  init(client) {
    console.log('AutoRole module initialized');
  },

  async onMemberJoin(member, client) {
    const guildConfig = client.db.getGuild(member.guild.id);
    if (!guildConfig) return;

    const config = guildConfig.config || {};

    if (!config.autoRole) return;

    const role = member.guild.roles.cache.get(config.autoRole);
    if (!role) return;

    try {
      await member.roles.add(role);
      console.log(`✅ AutoRole: ${role.name} added to ${member.user.tag}`);
    } catch (error) {
      console.error('Error adding auto role:', error);
    }
  }
};
