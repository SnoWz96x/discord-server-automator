const { Events, ChannelType } = require('discord.js');

module.exports = {
  name: Events.ThreadCreate,
  once: false,
  async execute(thread, newlyCreated, client) {
    if (!newlyCreated || !thread.guild) return;
    if (thread.parent?.type !== ChannelType.GuildForum) return;
    if (!['bugs-and-ideas', 'sugest', 'reports'].some(key => thread.parent.name.toLowerCase().includes(key))) return;

    const ownerId = thread.ownerId;
    if (!ownerId) return;

    client.db.createUser(ownerId, thread.guild.id, '');
    const quests = client.modules.get('quests');
    if (quests) quests.record(client, thread.guild.id, ownerId, 'forum_post', 1);

    const forumTemplates = client.modules.get('forumTemplates');
    await thread.send({
      content: [
        'Obrigado por criar uma postagem organizada.',
        '',
        '**Template recomendado:**',
        '- Contexto:',
        '- Passos para reproduzir / proposta:',
        '- Resultado esperado:',
        '- Prints, links ou IDs:',
        '',
        'A staff pode usar os botoes abaixo para marcar o status.'
      ].join('\n'),
      components: forumTemplates ? [forumTemplates.actionRow()] : []
    }).catch(() => {});
  }
};
