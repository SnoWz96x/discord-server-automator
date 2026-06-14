const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'reactionroles',

  init(client) {
    console.log('Reaction Roles module initialized');
  },

  async createPanel(channel, config, client) {
    const embed = new EmbedBuilder()
      .setColor('#DCFF00')
      .setTitle(config.title || '🎭 Reaction Roles')
      .setDescription(config.description || 'Selecione seus cargos:')
      .setTimestamp();

    if (config.type === 'button') {
      const rows = [];
      let currentRow = new ActionRowBuilder();

      for (let i = 0; i < config.roles.length; i++) {
        const roleConfig = config.roles[i];
        const button = new ButtonBuilder()
          .setCustomId(`role_toggle_${roleConfig.roleId}`)
          .setLabel(roleConfig.label)
          .setEmoji(roleConfig.emoji)
          .setStyle(ButtonStyle[roleConfig.style || 'Primary']);

        currentRow.addComponents(button);

        if (currentRow.components.length === 5 || i === config.roles.length - 1) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
      }

      const message = await channel.send({ embeds: [embed], components: rows });

      for (const roleConfig of config.roles) {
        client.db.addReactionRole(
          channel.guild.id,
          channel.id,
          message.id,
          roleConfig.roleId,
          roleConfig.emoji,
          roleConfig.label,
          roleConfig.style,
          'button'
        );
      }

      return message;
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('role_select')
        .setPlaceholder('Selecione seus cargos...')
        .setMinValues(1)
        .setMaxValues(config.roles.length);

      for (const roleConfig of config.roles) {
        selectMenu.addOptions({
          label: roleConfig.label,
          value: roleConfig.roleId,
          emoji: roleConfig.emoji,
          description: `Receber cargo ${roleConfig.label}`
        });
      }

      const row = new ActionRowBuilder().addComponents(selectMenu);
      const message = await channel.send({ embeds: [embed], components: [row] });

      for (const roleConfig of config.roles) {
        client.db.addReactionRole(
          channel.guild.id,
          channel.id,
          message.id,
          roleConfig.roleId,
          roleConfig.emoji,
          roleConfig.label,
          roleConfig.style,
          'select'
        );
      }

      return message;
    }
  },

  async handleButton(interaction, client, params) {
    const [action, roleId] = params;

    if (action === 'toggle') {
      const member = interaction.member;
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        return interaction.reply({ content: '❌ Cargo não encontrado.', ephemeral: true });
      }

      try {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          await interaction.reply({ content: `❌ Cargo **${role.name}** removido.`, ephemeral: true });
        } else {
          await member.roles.add(roleId);
          await interaction.reply({ content: `✅ Cargo **${role.name}** adicionado.`, ephemeral: true });
        }
      } catch (error) {
        console.error('Error toggling role:', error);
        await interaction.reply({ content: '❌ Erro ao alterar cargo.', ephemeral: true });
      }
    }
  },

  async handleSelectMenu(interaction, client, params) {
    const member = interaction.member;
    const selectedRoles = interaction.values;

    try {
      const addedRoles = [];
      const removedRoles = [];

      for (const roleId of selectedRoles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) continue;

        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          removedRoles.push(role.name);
        } else {
          await member.roles.add(roleId);
          addedRoles.push(role.name);
        }
      }

      let response = '';
      if (addedRoles.length > 0) response += `✅ Cargos adicionados: ${addedRoles.join(', ')}\n`;
      if (removedRoles.length > 0) response += `❌ Cargos removidos: ${removedRoles.join(', ')}`;

      await interaction.reply({ content: response || 'Nenhuma alteração feita.', ephemeral: true });
    } catch (error) {
      console.error('Error handling select menu:', error);
      await interaction.reply({ content: '❌ Erro ao alterar cargos.', ephemeral: true });
    }
  }
};
