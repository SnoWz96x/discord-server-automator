const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'];
const STATUSES = ['open', 'pending', 'closed'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gerenciar o ticket atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Atualizar o status do ticket')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Novo status')
            .setRequired(true)
            .addChoices(
              { name: 'Aberto', value: 'open' },
              { name: 'Em atendimento', value: 'pending' },
              { name: 'Fechado', value: 'closed' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('priority')
        .setDescription('Atualizar a prioridade do ticket')
        .addStringOption(option =>
          option
            .setName('priority')
            .setDescription('Nova prioridade')
            .setRequired(true)
            .addChoices(
              { name: 'Baixa', value: 'baixa' },
              { name: 'Normal', value: 'normal' },
              { name: 'Alta', value: 'alta' },
              { name: 'Urgente', value: 'urgente' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('Transferir o ticket para outra categoria logica')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Categoria de atendimento')
            .setRequired(true)
            .addChoices(
              { name: 'Bug Report', value: 'Bug Report' },
              { name: 'Conta e Acesso', value: 'Conta e Acesso' },
              { name: 'Gameplay', value: 'Gameplay' },
              { name: 'Sugestao', value: 'Sugestao' },
              { name: 'Denuncia', value: 'Denuncia' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('note')
        .setDescription('Adicionar nota interna de staff ao ticket')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Nota interna')
            .setRequired(true)
            .setMaxLength(900)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Ver resumo operacional do ticket atual')
    ),

  async execute(interaction, client) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Este canal nao esta vinculado a um ticket ativo.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      const status = interaction.options.getString('status');
      if (!STATUSES.includes(status)) {
        return interaction.reply({ content: 'Status invalido.', ephemeral: true });
      }

      if (status === 'closed') {
        client.db.closeTicket(interaction.channel.id, interaction.user.id, 'Fechado via /ticket status');
      } else if (ticket.status === 'closed' && status === 'open') {
        client.db.reopenTicket(interaction.channel.id);
      } else {
        client.db.updateTicketStatus(interaction.channel.id, status);
      }

      return announce(interaction, client, `Status atualizado para **${statusLabel(status)}**.`);
    }

    if (subcommand === 'priority') {
      const priority = interaction.options.getString('priority');
      if (!PRIORITIES.includes(priority)) {
        return interaction.reply({ content: 'Prioridade invalida.', ephemeral: true });
      }

      client.db.updateTicketPriority(interaction.channel.id, priority);
      return announce(interaction, client, `Prioridade atualizada para **${priorityLabel(priority)}**.`);
    }

    if (subcommand === 'category') {
      const category = interaction.options.getString('category');
      client.db.updateTicketCategory(interaction.channel.id, category);
      await interaction.channel.setTopic(`Ticket ${ticket.id} | Categoria: ${category}`).catch(() => {});
      return announce(interaction, client, `Ticket transferido para **${category}**.`);
    }

    if (subcommand === 'note') {
      const note = interaction.options.getString('text');
      client.db.addTicketNote(interaction.guild.id, interaction.channel.id, interaction.user.id, note);
      return interaction.reply({ content: 'Nota interna salva no ticket.', ephemeral: true });
    }

    return interaction.reply({ embeds: [buildTicketEmbed(client, interaction.channel.id)], ephemeral: true });
  }
};

async function announce(interaction, client, description) {
  const embed = buildTicketEmbed(client, interaction.channel.id)
    .setDescription(description);

  await interaction.reply({ embeds: [embed] });
}

function buildTicketEmbed(client, channelId) {
  const ticket = client.db.getTicket(channelId);
  const notes = client.db.getTicketNotes(channelId);

  return new EmbedBuilder()
    .setColor(ticket.priority === 'urgente' ? '#ED4245' : ticket.priority === 'alta' ? '#FEE75C' : '#57F287')
    .setTitle(`Ticket #${ticket.id}`)
    .addFields(
      { name: 'Categoria', value: ticket.category || 'Nao informada', inline: true },
      { name: 'Status', value: statusLabel(ticket.status), inline: true },
      { name: 'Prioridade', value: priorityLabel(ticket.priority), inline: true },
      { name: 'Autor', value: `<@${ticket.user_id}>`, inline: true },
      { name: 'Atendente', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Nao assumido', inline: true },
      { name: 'Notas internas', value: String(notes.length), inline: true }
    )
    .setTimestamp();
}

function statusLabel(status) {
  return {
    open: 'Aberto',
    pending: 'Em atendimento',
    closed: 'Fechado'
  }[status] || status;
}

function priorityLabel(priority) {
  return {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente'
  }[priority] || priority || 'Normal';
}
