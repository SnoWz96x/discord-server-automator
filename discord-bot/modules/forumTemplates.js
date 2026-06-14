const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const statusMap = {
  review: ['Investigando', 'Em analise'],
  approved: ['Aprovada', 'Aprovado'],
  resolved: ['Resolvido', 'Fechado'],
  duplicate: ['Duplicado']
};

module.exports = {
  name: 'forumTemplates',

  init() {
    console.log('Forum templates module initialized');
  },

  actionRow() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('forum_status_review').setLabel('Em analise').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('forum_status_approved').setLabel('Aprovado').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('forum_status_resolved').setLabel('Resolvido').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('forum_status_duplicate').setLabel('Duplicado').setStyle(ButtonStyle.Danger)
    );
  },

  async handleButton(interaction) {
    const status = interaction.customId.replace('forum_status_', '');
    const wantedNames = statusMap[status];
    if (!wantedNames || !interaction.channel?.isThread()) {
      return interaction.reply({ content: 'Acao de forum invalida.', ephemeral: true });
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageThreads)) {
      return interaction.reply({ content: 'Apenas staff pode alterar status de postagens.', ephemeral: true });
    }

    const parent = interaction.channel.parent;
    const tag = parent?.availableTags?.find(item => wantedNames.includes(item.name));
    if (!tag) {
      return interaction.reply({ content: 'Tag de status nao encontrada neste forum.', ephemeral: true });
    }

    const current = interaction.channel.appliedTags || [];
    const statusTagIds = parent.availableTags
      .filter(item => Object.values(statusMap).flat().includes(item.name))
      .map(item => item.id);
    const nextTags = [...new Set([...current.filter(id => !statusTagIds.includes(id)), tag.id])];

    await interaction.channel.setAppliedTags(nextTags, `Forum status changed by ${interaction.user.tag}`);
    await interaction.reply({ content: `Status atualizado para **${tag.name}**.`, ephemeral: true });
  }
};
