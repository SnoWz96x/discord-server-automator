const DEFAULT_CREATURES = [
  {
    key: 'voltkit',
    name: 'Voltkit',
    element: 'Spark',
    rarity: 'Common',
    description: 'A restless spark companion that stores static charge in its tail.',
    captureCostCoins: 80,
    captureCostCp: 8,
    successRate: 72
  },
  {
    key: 'mossprout',
    name: 'Mossprout',
    element: 'Wild',
    rarity: 'Common',
    description: 'A tiny forest drifter that grows stronger after long journeys.',
    captureCostCoins: 90,
    captureCostCp: 10,
    successRate: 68
  },
  {
    key: 'tideling',
    name: 'Tideling',
    element: 'Tide',
    rarity: 'Uncommon',
    description: 'A calm water spirit that appears near old ruins after rain.',
    captureCostCoins: 160,
    captureCostCp: 18,
    successRate: 55
  },
  {
    key: 'emberlynx',
    name: 'Emberlynx',
    element: 'Ember',
    rarity: 'Rare',
    description: 'A proud ember hunter known for glowing pawprints and sharp instincts.',
    captureCostCoins: 320,
    captureCostCp: 40,
    successRate: 34
  },
  {
    key: 'astralisk',
    name: 'Astralisk',
    element: 'Astral',
    rarity: 'Epic',
    description: 'A rare night wanderer with a crystalline crest and strange orbiting sparks.',
    captureCostCoins: 650,
    captureCostCp: 90,
    successRate: 18
  }
];

module.exports = {
  name: 'creatures',
  defaultCreatures: DEFAULT_CREATURES,

  init(client) {
    console.log('Creatures module initialized');
    for (const guild of client.guilds.cache.values()) {
      this.seedGuild(guild.id, client);
    }
  },

  seedGuild(guildId, client) {
    for (const creature of DEFAULT_CREATURES) {
      client.db.upsertCreature(guildId, creature);
    }
  },

  capture(userId, guildId, creatureKey, client) {
    const creature = client.db.getCreature(guildId, creatureKey);
    if (!creature) return { success: false, message: 'Criatura nao encontrada no bestiario.' };

    client.db.createUser(userId, guildId, '');
    const user = client.db.getUser(userId, guildId);
    const costCoins = creature.capture_cost_coins || 0;
    const costCp = creature.capture_cost_cp || 0;

    if ((user.coins || 0) < costCoins) {
      return { success: false, message: `PokeCoins insuficientes. Faltam ${costCoins - (user.coins || 0)}.` };
    }

    if ((user.cp || 0) < costCp) {
      return { success: false, message: `CP insuficiente. Faltam ${costCp - (user.cp || 0)}.` };
    }

    const roll = Math.floor(Math.random() * 100) + 1;
    const captured = roll <= creature.success_rate;

    const attempt = client.db.db.transaction(() => {
      client.db.removeCoins(userId, guildId, costCoins);
      client.db.removeCp(userId, guildId, costCp);
      if (captured) {
        client.db.addUserCreature(guildId, userId, creature.key);
      }
    });
    attempt();

    return {
      success: true,
      captured,
      roll,
      creature,
      costCoins,
      costCp
    };
  }
};
