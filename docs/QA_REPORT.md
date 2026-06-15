# QA Report

Last verified locally against the demo Discord guild.

## Automated Checks

```bash
npm test
```

Equivalent direct commands:

```bash
npm --prefix discord-bot run test:smoke
npm --prefix discord-bot run test:system
```

## Current Results

- Smoke tests: passing.
- System check: passing.
- Discord commands registered: 37.
- Discord channels detected: 50.
- User-facing roles detected after cleanup: 19.
- Managed bot role detected: 1.
- Shop items seeded: 4.
- Creatures seeded: 5.
- Badges seeded: 11.
- Dashboard health endpoint: online.

## Smoke Test Coverage

- SQLite initialization and migrations.
- Shop purchase.
- Coin spending.
- CP spending.
- Inventory write.
- Badge award.
- Voice reward calculation.
- Creature capture with resource spending.
- Moderation case migration and command syntax.
- Ticket schema migrations for priority, notes and transcript metadata.

## System Check Coverage

- Required slash commands exist.
- Required channels exist.
- Rules channel is locked.
- Mod logs channel is staff-only.
- Shop items have coin and CP prices.
- Creatures are seeded.
- Badges are seeded.

## Manual/Live Checks Performed

- Dashboard rendered through Playwright.
- Dashboard screenshots generated.
- Bot process online.
- Discord API responded.
- Server setup script applied successfully.
- Duplicate legacy roles removed.
- Ticket creation, modal intake and transcript flow tested previously with cleanup.
- Feedback forums configured as member post areas with staff-only status tags.

## Known Gaps

- Dashboard authentication is not implemented yet.
- Marketplace between users is not implemented yet.
- Creature evolution and scheduled events are not implemented yet.
