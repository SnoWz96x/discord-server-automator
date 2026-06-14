const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  AttachmentBuilder,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
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
        categories.slice(0, 25).map((cat, index) => {
          const option = {
            label: cat.name,
            value: String(index),
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
    if (action === 'reopen') return this.reopenTicket(interaction, client);
    if (action === 'delete') return this.deleteTicket(interaction, client);
    if (action === 'note') return this.showNoteModal(interaction, client);
  },

  async handleSelectMenu(interaction, client) {
    if (interaction.customId !== 'ticket_category') return;
    return this.showTicketModal(interaction, client, interaction.values[0]);
  },

  async showTicketModal(interaction, client, categoryIndex) {
    const config = client.db.getTicketConfig(interaction.guild.id);
    if (!config || !config.enabled) {
      return interaction.reply({ content: 'Sistema de tickets desabilitado.', ephemeral: true });
    }

    const category = config.categories[Number(categoryIndex)]?.name;
    if (!category) {
      return interaction.reply({ content: 'Categoria de ticket invalida.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket_intake_${categoryIndex}`)
      .setTitle(`Ticket: ${category}`.slice(0, 45));

    const summary = new TextInputBuilder()
      .setCustomId('summary')
      .setLabel('O que aconteceu?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(900)
      .setPlaceholder('Descreva o problema ou pedido com contexto.');

    const when = new TextInputBuilder()
      .setCustomId('when')
      .setLabel('Quando aconteceu?')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(120)
      .setPlaceholder('Ex.: hoje as 15h, depois da ultima atualizacao...');

    const evidence = new TextInputBuilder()
      .setCustomId('evidence')
      .setLabel('Prints, links, IDs ou passos ajudam?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(900)
      .setPlaceholder('Cole IDs, links ou passos para reproduzir. Prints podem ser enviados depois no ticket.');

    const priority = new TextInputBuilder()
      .setCustomId('priority')
      .setLabel('Prioridade: baixa, normal, alta ou urgente')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(20)
      .setPlaceholder('normal');

    modal.addComponents(
      new ActionRowBuilder().addComponents(summary),
      new ActionRowBuilder().addComponents(when),
      new ActionRowBuilder().addComponents(evidence),
      new ActionRowBuilder().addComponents(priority)
    );

    return interaction.showModal(modal);
  },

  async handleModalSubmit(interaction, client) {
    if (!interaction.customId.startsWith('ticket_intake_')) return;

    const categoryIndex = interaction.customId.replace('ticket_intake_', '');
    const config = client.db.getTicketConfig(interaction.guild.id);
    const category = config?.categories?.[Number(categoryIndex)]?.name;
    if (!category) {
      return interaction.reply({ content: 'Categoria de ticket invalida.', ephemeral: true });
    }

    return this.createTicket(interaction, client, category, {
      summary: interaction.fields.getTextInputValue('summary'),
      when: interaction.fields.getTextInputValue('when') || 'Nao informado',
      evidence: interaction.fields.getTextInputValue('evidence') || 'Nao informado',
      priority: normalizePriority(interaction.fields.getTextInputValue('priority'))
    });
  },

  async createTicket(interaction, client, category, intake = null) {
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

      const ticket = client.db.createTicket(interaction.guild.id, ticketChannel.id, interaction.user.id, category, {
        priority: intake?.priority || 'normal',
        subject: intake?.summary?.slice(0, 120) || category,
        intake
      });

      const categoryConfig = config.categories.find(c => c.name === category);
      const color = categoryConfig?.color || 0xFF6B35;
      const emoji = categoryConfig?.emoji || '[Ticket]';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Ticket - ${category}`)
        .setDescription([
          `Ola ${interaction.user}.`,
          `Ticket interno: **#${ticket.id}**`,
          `Prioridade: **${priorityLabel(ticket.priority)}**`,
          '',
          '**Resumo inicial:**',
          intake?.summary || 'Nao informado',
          '',
          `**Quando aconteceu?** ${intake?.when || 'Nao informado'}`,
          `**Prints, links, IDs ou passos:** ${intake?.evidence || 'Nao informado'}`,
          '',
          'A staff pode clicar em **Atender** para assumir e **Transcript** para salvar o historico.',
          'Voce tambem pode enviar prints e detalhes adicionais neste canal.'
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

      const noteBtn = new ButtonBuilder()
        .setCustomId('ticket_note')
        .setLabel('Nota Staff')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(claimBtn, transcriptBtn, noteBtn, closeBtn);

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

    if (ticket.status === 'closed') {
      return interaction.reply({ content: 'Este ticket ja esta fechado.', ephemeral: true });
    }

    await interaction.deferReply();
    await this.exportTranscript(interaction, client, { silent: true });
    client.db.closeTicket(interaction.channel.id, interaction.user.id, 'Fechado pela staff');

    await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: false,
      CreatePublicThreads: false,
      SendMessagesInThreads: false
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Ticket Fechado')
      .setDescription(`Ticket fechado por ${interaction.user}.\n\nO canal foi bloqueado para o usuario. Use **Reabrir** para devolver acesso ou **Apagar** para remover o canal.`)
      .setTimestamp();

    const reopenBtn = new ButtonBuilder()
      .setCustomId('ticket_reopen')
      .setLabel('Reabrir')
      .setStyle(ButtonStyle.Success);

    const deleteBtn = new ButtonBuilder()
      .setCustomId('ticket_delete')
      .setLabel('Apagar')
      .setStyle(ButtonStyle.Danger);

    await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(reopenBtn, deleteBtn)] });
  },

  async claimTicket(interaction, client) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });
    }

    client.db.claimTicket(interaction.channel.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Ticket Atendido')
      .setDescription(`Ticket assumido por ${interaction.user}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async reopenTicket(interaction, client) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });

    client.db.reopenTicket(interaction.channel.id);
    await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('Ticket Reaberto')
      .setDescription(`Ticket reaberto por ${interaction.user}.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async deleteTicket(interaction, client) {
    const ticket = client.db.getTicket(interaction.channel.id);
    if (!ticket) return interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });

    await interaction.reply({ content: 'Apagando ticket em 5 segundos...', ephemeral: true });
    setTimeout(async () => {
      await interaction.channel.delete('Ticket deleted by staff').catch(error => console.error('Error deleting ticket channel:', error));
    }, 5000);
  },

  async showNoteModal(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('ticket_note_modal')
      .setTitle('Nota interna do ticket');

    const note = new TextInputBuilder()
      .setCustomId('note')
      .setLabel('Nota visivel apenas para staff/logs')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(note));
    return interaction.showModal(modal);
  },

  async handleTicketNoteModal(interaction, client) {
    const note = interaction.fields.getTextInputValue('note');
    const saved = client.db.addTicketNote(interaction.guild.id, interaction.channel.id, interaction.user.id, note);
    if (!saved) return interaction.reply({ content: 'Este nao e um canal de ticket.', ephemeral: true });

    await interaction.reply({ content: `Nota interna adicionada (#${saved.id}).`, ephemeral: true });
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
      `Status: ${ticket.status}`,
      `Prioridade: ${ticket.priority || 'normal'}`,
      `Atendente: ${ticket.claimed_by || 'nao atribuido'}`,
      `Usuario: ${ticket.user_id}`,
      `Canal: ${interaction.channel.name} (${interaction.channel.id})`,
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

    const notes = client.db.getTicketNotes(interaction.channel.id);
    if (notes.length) {
      lines.push('', '---', '', '## Notas internas', '');
      for (const note of notes) {
        lines.push(`[${note.created_at}] ${note.author_id}: ${note.note}`);
      }
    }

    const buffer = Buffer.from(lines.join('\n'), 'utf8');
    const attachment = new AttachmentBuilder(buffer, {
      name: `transcript-${interaction.channel.id}.md`
    });
    const htmlAttachment = new AttachmentBuilder(this.buildHtmlTranscript(interaction, ticket, ordered, notes), {
      name: `transcript-${interaction.channel.id}.html`
    });

    const transcriptChannel = interaction.guild.channels.cache.find(channel => channel.name.endsWith('-ticket-transcripts'));
    if (transcriptChannel) {
      await transcriptChannel.send({
        content: `Transcript de #${interaction.channel.name} (${interaction.channel.id}) | usuario <@${ticket.user_id}> | categoria ${ticket.category}`,
        files: [attachment, htmlAttachment]
      });
    }

    if (!options.silent) {
      await interaction.reply({ content: 'Transcript salvo no canal de transcripts.', ephemeral: true });
    }

    return buffer;
  },

  buildHtmlTranscript(interaction, ticket, messages, notes) {
    const rows = messages.map(message => {
      const author = escapeHtml(message.author?.tag || message.author?.username || 'Unknown');
      const content = escapeHtml(message.content || '[sem texto]');
      const time = escapeHtml(message.createdAt.toISOString());
      const attachments = message.attachments.size
        ? `<div class="attachments">${message.attachments.map(attachment => `<a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.name || attachment.url)}</a>`).join(' ')}</div>`
        : '';
      return `<article><time>${time}</time><strong>${author}</strong><p>${content}</p>${attachments}</article>`;
    }).join('');

    const noteRows = notes.map(note => `<li><strong>${escapeHtml(note.author_id)}</strong>: ${escapeHtml(note.note)} <small>${escapeHtml(note.created_at)}</small></li>`).join('');

    return Buffer.from(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Transcript ${escapeHtml(interaction.channel.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #111318; color: #f4f6fb; margin: 0; padding: 32px; }
    header { border-bottom: 1px solid #2f3440; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { margin: 0 0 8px; }
    .meta { color: #b5bdca; line-height: 1.6; }
    article { background: #1b1f2a; border: 1px solid #2f3440; border-radius: 8px; padding: 14px; margin: 12px 0; }
    time { display: block; color: #8c95a6; font-size: 12px; margin-bottom: 6px; }
    p { white-space: pre-wrap; }
    a { color: #8ab4ff; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <header>
    <h1>Transcript ${escapeHtml(interaction.channel.name)}</h1>
    <div class="meta">
      Categoria: ${escapeHtml(ticket.category)}<br>
      Status: ${escapeHtml(ticket.status)}<br>
      Prioridade: ${escapeHtml(ticket.priority || 'normal')}<br>
      Usuario: ${escapeHtml(ticket.user_id)}
    </div>
  </header>
  <main>${rows}</main>
  <section>
    <h2>Notas internas</h2>
    <ul>${noteRows || '<li>Nenhuma nota interna.</li>'}</ul>
  </section>
</body>
</html>`, 'utf8');
  }
};

function normalizePriority(value) {
  const normalized = String(value || 'normal').trim().toLowerCase();
  return ['baixa', 'normal', 'alta', 'urgente'].includes(normalized) ? normalized : 'normal';
}

function priorityLabel(priority) {
  const labels = {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente'
  };
  return labels[priority] || labels.normal;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
