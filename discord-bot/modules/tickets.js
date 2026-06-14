const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  AttachmentBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  name: 'tickets',

  init() {
    console.log('Tickets module initialized');
  },

  async createPanel(channel, config) {
    const categories = Array.isArray(config.categories) ? config.categories : [];

    const embed = new EmbedBuilder()
      .setColor('#FF6B35')
      .setTitle('Suporte RoguePoke')
      .setDescription([
        'Precisa de ajuda? Abra um ticket.',
        '',
        '**Quando abrir um ticket:**',
        '- Bugs no jogo',
        '- Problemas com conta',
        '- Duvidas sobre gameplay',
        '- Sugestoes de melhoria',
        '- Denuncias',
        '',
        '**Tempo de resposta:** ate 24 horas',
        '**Privacidade:** apenas staff vera seu ticket'
      ].join('\n'))
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Selecione o tipo de suporte...')
      .addOptions(
        categories.slice(0, 25).map(cat => {
          const option = {
            label: cat.name,
            value: cat.name,
            description: `Abrir ticket de ${cat.name}`
          };
          if (cat.emoji) option.emoji = cat.emoji;
          return option;
        })
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    return channel.send({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction, client, params) {
    const [action] = params;

    if (action === 'close') return this.closeTicket(interaction, client);
    if (action === 'claim') return this.claimTicket(interaction, client);
    if (action === 'transcript') return this.exportTranscript(interaction, client);
  },

  async handleSelectMenu(interaction, client) {
    if (interaction.customId !== 'ticket_category') return;
    return this.createTicket(interaction, client, interaction.values[0]);
  },

  async createTicket(interaction, client, category) {
    const config = client.db.getTicketConfig(interaction.guild.id);
    if (!config || !config.enabled) {
      return interaction.reply({ content: 'Sistema de tickets desabilitado.', ephemeral: true });
    }

    const userTickets = client.db.getUserTickets(interaction.guild.id, interaction.user.id);
    if (userTickets.length >= 3) {
      return interaction.reply({ content: 'Voce ja tem 3 tickets abertos. Feche um antes de criar outro.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const parent = await this.resolveTicketCategory(interaction.guild, config.category_name);
      const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 32);

      const permissionOverwrites = [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ];

      for (const roleId of config.staff_roles) {
        if (interaction.guild.roles.cache.has(roleId)) {
          permissionOverwrites.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${safeName || interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: parent?.id ?? null,
        permissionOverwrites
      });

      client.db.createTicket(interaction.guild.id, ticketChannel.id, interaction.user.id, category);

      const categoryConfig = config.categories.find(c => c.name === category);
      const color = categoryConfig?.color || 0xFF6B35;
      const emoji = categoryConfig?.emoji || '[Ticket]';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Ticket - ${category}`)
        .setDescription([
          `Ola ${interaction.user}.`,
          '',
          'Descreva o problema com o maximo de contexto:',
          '- O que aconteceu?',
          '- Quando aconteceu?',
          '- Prints ou IDs ajudam?',
          '',
          'A staff pode clicar em **Atender** para assumir e **Transcript** para salvar o historico.'
        ].join('\n'))
        .setTimestamp();

      const closeBtn = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger);

      const claimBtn = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Atender')
        .setStyle(ButtonStyle.Success);

      const transcriptBtn = new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Transcript')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(closeBtn, claimBtn, transcriptBtn);

      await ticketChannel.send({ embeds: [embed], components: [row] });
      await interaction.editReply({ content: `Ticket criado em ${ticketChannel}` });

      console.log(`Ticket created: ${category} by ${interaction.user.tag} in ${interaction.guild.name}`);
    } catch (error) {
      console.error('Error creating ticket:', error);
      await interaction.editReply({ content: 'Erro ao criar ticket. Verifique minhas permissoes de canais/cargos.' });
    }
  },

  async resolveTicketCategory(guild, categoryName) {
    if (!categoryName) return null;

    const existing = guild.channels.cache.find(
      channel => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (existing) return existing;

    return guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory
    }).catch(() => null);
  },

  async closeTicket(interaction, client) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });
    }

    await interaction.deferReply();
    await this.exportTranscript(interaction, client, { silent: true });
    client.db.closeTicket(interaction.channel.id);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Ticket Fechado')
      .setDescription(`Ticket fechado por ${interaction.user}\n\nEste canal sera deletado em 10 segundos.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    setTimeout(async () => {
      await interaction.channel.delete().catch(error => console.error('Error deleting ticket channel:', error));
    }, 10000);
  },

  async claimTicket(interaction, client) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Ticket Atendido')
      .setDescription(`Ticket assumido por ${interaction.user}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async exportTranscript(interaction, client, options = {}) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) {
      if (!options.silent) {
        await interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });
      }
      return null;
    }

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const ordered = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const lines = [
      `# Transcript RoguePoke`,
      ``,
      `Ticket: ${interaction.channel.name}`,
      `Categoria: ${ticket.category}`,
      `Usuario: ${ticket.user_id}`,
      `Canal: ${interaction.channel.id}`,
      `Gerado em: ${new Date().toISOString()}`,
      ``,
      `---`,
      ``
    ];

    for (const message of ordered) {
      const author = `${message.author?.tag || message.author?.username || 'Unknown'} (${message.author?.id || 'unknown'})`;
      const content = message.content || '[sem texto]';
      const attachments = message.attachments.size
        ? `\nAnexos: ${message.attachments.map(attachment => attachment.url).join(', ')}`
        : '';
      lines.push(`[${message.createdAt.toISOString()}] ${author}: ${content}${attachments}`);
    }

    const buffer = Buffer.from(lines.join('\n'), 'utf8');
    const attachment = new AttachmentBuilder(buffer, {
      name: `transcript-${interaction.channel.id}.md`
    });

    const transcriptChannel = interaction.guild.channels.cache.find(channel => channel.name.endsWith('-ticket-transcripts'));
    if (transcriptChannel) {
      await transcriptChannel.send({
        content: `Transcript de ${interaction.channel} | usuario <@${ticket.user_id}> | categoria ${ticket.category}`,
        files: [attachment]
      });
    }

    if (!options.silent) {
      await interaction.reply({ content: 'Transcript salvo no canal de transcripts.', ephemeral: true });
    }

    return buffer;
  }
};
