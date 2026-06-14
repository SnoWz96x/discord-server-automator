const Database = require('../database/database');
const economy = require('../modules/economy');
const activityRewards = require('../modules/activityRewards');
const creatures = require('../modules/creatures');

const db = new Database();
const guildId = `smoke-${Date.now()}`;
const userId = '100000000000000001';
const client = { db, modules: new Map() };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function seedShop() {
  db.upsertBadge({ key: 'smoke_badge', name: 'Smoke Badge', emoji: 'S', description: 'Smoke test badge.' });
  db.upsertShopItem(guildId, {
    key: 'smoke_item',
    name: 'Smoke Item',
    description: 'Smoke test item.',
    type: 'badge',
    priceCoins: 10,
    priceCp: 3,
    minLevel: 0,
    payload: {
      badge: { key: 'smoke_badge', name: 'Smoke Badge', emoji: 'S', description: 'Smoke test badge.' }
    }
  });
}

async function run() {
  db.createGuild(guildId, 'Smoke Guild');
  db.createUser(userId, guildId, 'SmokeUser');
  seedShop();

  db.addCoins(userId, guildId, 25);
  db.addCp(userId, guildId, 10);
  const buy = await economy.buy(userId, guildId, 'smoke_item', client);
  assert(buy.success, 'shop purchase should succeed');
  const afterBuy = db.getUser(userId, guildId);
  assert(afterBuy.coins === 15, 'shop purchase should spend coins');
  assert(afterBuy.cp === 7, 'shop purchase should spend CP');
  assert(db.getInventory(guildId, userId).length === 1, 'inventory should contain purchased item');
  assert(db.getUserBadges(guildId, userId).some(badge => badge.key === 'smoke_badge'), 'badge should be awarded');

  db.startVoiceSession(guildId, userId, 'voice-smoke');
  db.db.prepare('UPDATE voice_sessions SET joined_at = ? WHERE guild_id = ? AND user_id = ?')
    .run(new Date(Date.now() - 30 * 60000).toISOString(), guildId, userId);
  const reward = activityRewards.finishVoiceSession(guildId, userId, client);
  assert(reward.xp === 60, 'voice reward should grant expected XP');
  assert(reward.coins === 30, 'voice reward should grant expected coins');
  assert(reward.cp === 3, 'voice reward should grant expected CP');

  db.upsertCreature(guildId, {
    key: 'smoke_creature',
    name: 'Smoke Creature',
    element: 'Test',
    rarity: 'Common',
    captureCostCoins: 5,
    captureCostCp: 2,
    successRate: 100
  });
  const beforeCapture = db.getUser(userId, guildId);
  const capture = creatures.capture(userId, guildId, 'smoke_creature', client);
  assert(capture.success && capture.captured, 'capture should succeed');
  const afterCapture = db.getUser(userId, guildId);
  assert(beforeCapture.coins - afterCapture.coins === 5, 'capture should spend coins');
  assert(beforeCapture.cp - afterCapture.cp === 2, 'capture should spend CP');
  assert(db.getUserCreatures(guildId, userId).some(row => row.creature_key === 'smoke_creature'), 'collection should contain captured creature');

  console.log('Smoke tests passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
