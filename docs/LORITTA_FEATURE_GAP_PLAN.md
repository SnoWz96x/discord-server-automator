# Loritta-Inspired Feature Gap Plan

This project should stay original, but Loritta is a useful benchmark for an all-in-one community bot: modular, multilingual, customizable, entertainment-focused and strong on moderation.

References reviewed:

- https://loritta.website/us/
- https://github.com/LorittaBot/Loritta
- https://top.gg/bot/297153970613387264

## What We Already Cover

- Server automation from a JSON blueprint.
- Verification, language roles and welcome flow.
- Moderation commands with case IDs.
- Tickets with modal intake, status, notes and transcripts.
- XP, levels, coins, CP, badges and collectible creatures.
- Dashboard for health, economy, moderation, tickets and AutoMod.
- Feedback forums with templates and status buttons.

## Priority 1 - Dashboard Parity

- Discord OAuth2 login with guild permission checks.
- Per-module settings pages instead of one long overview.
- Audit trail for every dashboard action.
- Case browser with filters, status, reason editing and exports.
- Ticket browser with status, priority, owner, transcript preview and SLA.
- AutoMod builder with punishment ladder and whitelist editor.

## Priority 2 - Community Engagement

- Custom profile cards with background, badges, title and favorite creature.
- Daily streaks and weekly streaks.
- Server ranking cards and seasonal leaderboards.
- Giveaways with requirements: role, level, messages, voice time and account age.
- Polls and suggestions with approval workflow.
- Starboard/highlight system for community content.

## Priority 3 - Economy And Game Loop

- Shop inventory categories: badges, profile cosmetics, boosts, creatures and rare items.
- Limited-time shop rotations.
- Item usage commands, not only purchase.
- Trading or marketplace between members.
- Creature evolution, rarity collection log and seasonal captures.
- Anti-farming rules for XP/coins/CP.

## Priority 4 - Moderation Depth

- Configurable punishment ladder per rule type.
- Appeals workflow for bans/timeouts.
- Trust score per user using account age, joins, warnings and AutoMod hits.
- Raid mode with join-rate detection.
- Mod note timeline per user.
- Scheduled moderation reports.

## Priority 5 - Customization

- Custom commands and auto-responses.
- Timed/repeating messages.
- Per-channel XP multipliers.
- Per-language announcement mirrors.
- Config import/export from dashboard.
- Theme settings for embeds and dashboard branding.

## Implementation Order

1. OAuth2 dashboard auth and module settings.
2. Case/ticket dashboard drill-down pages.
3. Profile card cosmetics and shop item usage.
4. Giveaways, polls and starboard.
5. Punishment ladder, appeals and raid mode.
6. Marketplace/trading and creature evolution.

## Product Rule

Every new module should have:

- slash commands;
- dashboard configuration;
- database persistence;
- audit log entries;
- smoke or integration tests;
- README/operations documentation.
