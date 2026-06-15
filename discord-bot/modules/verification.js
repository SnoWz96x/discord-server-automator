const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'verification',

  init() {
    console.log('Verification module initialized');
  },

  async onMemberJoin(member, client) {
    const config = client.db.getVerificationConfig(member.guild.id);
    if (!config || !config.enabled || !config.channel_id) return;

    const channel = member.guild.channels.cache.get(config.channel_id);
    if (!channel) return;

    await member.send(`Bem-vindo(a) ao ${member.guild.name}! Para liberar o servidor, abra ${channel} e clique em **${config.button_label || 'Verificar'}**.`)
      .catch(() => {});
  },

  async handleButton(interaction, client) {
    if (interaction.customId !== 'verify_captcha') return;

    const config = client.db.getVerificationConfig(interaction.guild.id);
    if (!config || !config.enabled) {
      return interaction.reply({ content: 'Registro nao esta habilitado.', ephemeral: true });
    }

    const role = interaction.guild.roles.cache.get(config.role_id);
    if (!role) {
      return interaction.reply({ content: 'Cargo de membro nao encontrado.', ephemeral: true });
    }

    if (interaction.member.roles.cache.has(config.role_id)) {
      return interaction.reply({ content: 'Voce ja esta registrado.', ephemeral: true });
    }

    try {
      await interaction.member.roles.add(role);
      client.db.createUser(interaction.user.id, interaction.guild.id, interaction.user.username);
      client.db.setVerified(interaction.user.id, interaction.guild.id, true);
      client.db.awardBadge(interaction.guild.id, interaction.user.id, 'verified');

      const successEmbed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('Registro concluido')
        .setDescription('Acesso liberado. Agora escolha seus idiomas no canal \uD83C\uDF10-idiomas.')
        .setTimestamp();

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });

      const modlogs = client.modules.get('modlogs');
      if (modlogs) {
        const logEmbed = modlogs.baseEmbed('Cadastro: membro verificado', 0x57F287)
          .addFields(
            { name: 'Usuario', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
            { name: 'Cargo recebido', value: role.name, inline: true }
          );
        await modlogs.send(interaction.guild, logEmbed);
      }

      console.log(`${interaction.user.tag} verified in ${interaction.guild.name}`);
    } catch (error) {
      console.error('Error verifying user:', error);
      await interaction.reply({ content: 'Erro ao registrar. Contate um administrador.', ephemeral: true });
    }
  }
};
