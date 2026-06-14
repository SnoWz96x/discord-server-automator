const { AuditLogEvent, Events } = require('discord.js');

const ACTION_LABELS = {
  [AuditLogEvent.MemberKick]: 'Moderacao: expulsao',
  [AuditLogEvent.MemberBanAdd]: 'Moderacao: banimento',
  [AuditLogEvent.MemberBanRemove]: 'Moderacao: desbanimento',
  [AuditLogEvent.MemberUpdate]: 'Membro atualizado',
  [AuditLogEvent.MemberRoleUpdate]: 'Cargos de membro alterados',
  [AuditLogEvent.MemberMove]: 'Membro movido em voz',
  [AuditLogEvent.MemberDisconnect]: 'Membro desconectado da voz',
  [AuditLogEvent.MemberPrune]: 'Limpeza de membros',
  [AuditLogEvent.ChannelCreate]: 'Canal criado',
  [AuditLogEvent.ChannelUpdate]: 'Canal atualizado',
  [AuditLogEvent.ChannelDelete]: 'Canal apagado',
  [AuditLogEvent.RoleCreate]: 'Cargo criado',
  [AuditLogEvent.RoleUpdate]: 'Cargo atualizado',
  [AuditLogEvent.RoleDelete]: 'Cargo apagado',
  [AuditLogEvent.MessageDelete]: 'Mensagem apagada por moderacao',
  [AuditLogEvent.MessageBulkDelete]: 'Mensagens apagadas em massa',
  [AuditLogEvent.AutoModerationBlockMessage]: 'AutoMod: mensagem bloqueada',
  [AuditLogEvent.AutoModerationFlagToChannel]: 'AutoMod: alerta enviado',
  [AuditLogEvent.AutoModerationUserCommunicationDisabled]: 'AutoMod: timeout aplicado'
};

module.exports = {
  name: Events.GuildAuditLogEntryCreate,
  once: false,
  async execute(auditLogEntry, guild, client) {
    const modlogs = client.modules.get('modlogs');
    if (!modlogs) return;

    const title = ACTION_LABELS[auditLogEntry.action] || `Audit log: ${auditLogEntry.action}`;
    const target = auditLogEntry.target
      ? `${auditLogEntry.target.tag || auditLogEntry.target.name || auditLogEntry.target.id || 'Alvo'} (${auditLogEntry.target.id || 'sem id'})`
      : 'Nao informado';
    const executor = auditLogEntry.executor
      ? `${auditLogEntry.executor.tag || auditLogEntry.executor.username} (${auditLogEntry.executor.id})`
      : 'Nao informado';
    const changes = auditLogEntry.changes?.length
      ? auditLogEntry.changes
          .slice(0, 6)
          .map(change => `- ${change.key}: ${formatValue(change.old)} -> ${formatValue(change.new)}`)
          .join('\n')
      : 'Sem detalhes extras';

    const embed = modlogs.baseEmbed(title, colorForAction(auditLogEntry.action))
      .addFields(
        { name: 'Executor', value: executor, inline: false },
        { name: 'Alvo', value: target, inline: false },
        { name: 'Motivo', value: auditLogEntry.reason || 'Nao informado', inline: false },
        { name: 'Detalhes', value: changes.slice(0, 1024), inline: false }
      );

    await modlogs.send(guild, embed);
  }
};

function formatValue(value) {
  if (value == null) return 'vazio';
  if (Array.isArray(value)) return `[${value.length} item(s)]`;
  if (typeof value === 'object') return value.name || value.id || JSON.stringify(value).slice(0, 80);
  return String(value).slice(0, 80);
}

function colorForAction(action) {
  if ([AuditLogEvent.MemberBanAdd, AuditLogEvent.MemberKick, AuditLogEvent.MessageDelete, AuditLogEvent.MessageBulkDelete].includes(action)) {
    return 0xED4245;
  }
  if ([AuditLogEvent.ChannelCreate, AuditLogEvent.RoleCreate].includes(action)) return 0x57F287;
  if ([AuditLogEvent.ChannelDelete, AuditLogEvent.RoleDelete].includes(action)) return 0xFEE75C;
  return 0x5865F2;
}
