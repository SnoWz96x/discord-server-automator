# Loritta-Inspired Feature Gap Plan

This project should stay original, but Loritta is a useful benchmark for an all-in-one Discord bot: modular, multilingual, customizable, entertainment-focused and strong on server operations.

The goal is not to clone Loritta's identity. The goal is to learn from the product patterns that work well and adapt them to Discord Server Automator.

## References Reviewed

- https://loritta.website/us/
- https://loritta.website/us/commands
- https://loritta.website/us/developers/docs/reference
- https://loritta.website/us/developers/docs/create-guild-giveaway
- https://loritta.website/extras/faq-loritta/sonhos
- https://loritta.website/extras/faq-loritta/profile-customization
- https://loritta.website/br/daily
- https://github.com/LorittaBot/Loritta
- https://discord.bots.gg/bots/297153970613387264

## Product Principles To Borrow

- **One clear personality:** the bot should feel memorable and coherent, not a bundle of random commands.
- **Modules everywhere:** every major feature can be enabled, disabled and configured per server.
- **Dashboard-first operations:** complex configuration belongs in a web dashboard, not only slash commands.
- **Economy as a loop:** earn currency, spend on visible/social rewards, repeat daily/weekly.
- **Social proof:** profiles, rankings, public receipts, starboards and giveaways make activity visible.
- **Localization:** Portuguese-first is important, but multilingual servers need proper English and Spanish surfaces too.
- **Safe fun:** fun/social commands should not undermine moderation or create spam.

## Current Coverage

- Server automation from JSON blueprint.
- Verification, language roles and welcome flow.
- Moderation commands with case IDs.
- Tickets with modal intake, status, notes and transcripts.
- XP, levels, coins, CP, badges and collectible creatures.
- Dashboard for health, economy, moderation, tickets, logs, AutoMod, OAuth2 access control and module settings.
- Feedback forums with templates and status buttons.
- Shop catalog channel, private purchase flow and public purchase history.

## Feature Gap Matrix

| Area | Loritta-like capability | Current status | What to implement | Priority |
| --- | --- | --- | --- | --- |
| Dashboard | Discord OAuth2 login and server permission checks | Implemented for configured guild | Add multi-guild selector for installations managing more than one server | P1 |
| Dashboard | Per-module settings pages | Partial | Connect persisted module settings directly into each runtime module behavior | P0 |
| Dashboard | Audit trail for every action | Partial | Add before/after payload display and dashboard audit browser | P0 |
| Moderation | Punishment ladder | Missing | Configure progressive warn -> timeout -> kick/ban by rule type | P0 |
| Moderation | Case browser and mod history | Partial | Add dashboard case details, filters, reason editing, status, export and appeal state | P0 |
| Moderation | Appeals | Missing | Add appeal form, review queue, decision log and optional Discord forum/thread integration | P1 |
| Moderation | Anti-raid mode | Missing | Join-rate detection, account-age checks, quarantine role and lockdown controls | P1 |
| AutoMod | Visual rule builder | Partial | Dashboard builder for spam, caps, links, invites, words, whitelist and punishment action | P0 |
| AutoMod | Review queue | Missing | Store blocked messages, allow approve/ignore/escalate from dashboard | P1 |
| Tickets | SLA and ownership | Partial | Add due time, escalation, reassignment, dashboard queue and staff performance stats | P1 |
| Tickets | Rich transcripts | Partial | Add searchable transcript viewer in dashboard with HTML preview and attachments index | P1 |
| Economy | Central currency identity | Partial | Rename/brand coins/CP consistently, document earning and spending loop | P0 |
| Economy | Daily/streak system | Partial | Add streaks, streak freeze, weekly bonus and dashboard tuning | P0 |
| Economy | Public transaction history | Done | Keep catalog clean, private command responses and public locked purchase receipts | Done |
| Economy | User transaction statement | Missing | Add `/statement` and dashboard user economy timeline | P1 |
| Economy | Pay/transfer between users | Missing | Add `/pay`, transfer limits, tax, anti-abuse and transaction log | P1 |
| Shop | Rotating shop | Missing | Add scheduled item rotations, rarity, stock, expiration and featured items | P1 |
| Shop | Item usage | Partial | Add `/use` for profile effects, boosts, consumables and creature items | P1 |
| Profiles | Visual profile card | Partial | Generate profile image/card with XP, badges, title, background and favorite creature | P0 |
| Profiles | Profile cosmetics | Partial | Backgrounds, titles, badges display slots, frames and effects | P1 |
| Social | Reputation | Missing | Add `/rep`, cooldowns, leaderboard and abuse controls | P1 |
| Social | Relationship/friend modules | Missing | Optional fun/social module: friends, parties, clans or squads | P2 |
| Fun | Meme/minigame commands | Missing | Add safe minigames tied lightly to economy with cooldowns | P2 |
| Giveaways | Giveaways with requirements | Missing | Role, level, account age, message/voice activity, winner reroll and audit log | P0 |
| Polls | Polls and suggestions | Partial | Native poll command, suggestion lifecycle and dashboard moderation | P1 |
| Community | Starboard/highlights | Missing | Starboard channel, thresholds, ignored channels and staff controls | P1 |
| Utility | Reminders | Missing | `/remind`, recurring reminders and dashboard list | P2 |
| Utility | Timed/repeating messages | Missing | Scheduled announcements with channel, interval, language and preview | P1 |
| Customization | Custom commands/tags | Missing | Trigger-response tags, variables, permissions and dashboard editor | P0 |
| Customization | Embed builder | Missing | Dashboard embed builder for official messages, panels and announcements | P1 |
| Localization | Multilingual responses | Partial | Per-user/per-server language, command copy in PT/EN/ES and translated embeds | P1 |
| Open source | Plugin/module architecture | Partial | Formal module manifest: commands, events, settings, migrations and docs | P1 |

## Recommended Implementation Order

1. **Wire module settings into runtime behavior**
   - Use persisted dashboard settings inside bot modules.
   - Add before/after audit views.
   - Add per-module validation.

2. **Profile and economy loop**
   - Visual profile card.
   - Daily streaks.
   - Transaction statement.
   - Item usage for profile cosmetics.

3. **Custom commands and giveaways**
   - Tags/custom commands.
   - Giveaway module with requirements.
   - Public giveaway log.

4. **Moderation and AutoMod depth**
   - Punishment ladder.
   - AutoMod visual builder.
   - Review queue.
   - Appeals.

5. **Community engagement**
   - Starboard.
   - Polls.
   - Suggestion lifecycle.
   - Scheduled/repeating messages.

6. **Creature/game expansion**
   - Creature evolution.
   - Seasonal captures.
   - Trading/marketplace.
   - Safe minigames.

## Economy Channel Pattern

Use three different surfaces instead of mixing everything in one channel:

- **Catalog channel:** locked, contains official shop copy and item highlights.
- **Private command responses:** `/shop`, `/buy`, `/inventory`, `/balance` and `/badges` avoid polluting the catalog.
- **Public purchase history:** locked for members, visible to verified users, receives automatic purchase receipts.

This mirrors the product idea behind Loritta's economy: a central currency, clear ways to earn it, desirable cosmetic/progression spending and social proof without turning the shop channel into chat noise.

## Module Acceptance Checklist

Every new module should ship with:

- slash commands;
- dashboard configuration;
- database persistence;
- audit log entries;
- permission model;
- localization-ready copy;
- smoke or integration tests;
- README/operations documentation;
- server blueprint integration when it creates channels, roles or panels.

## Next Concrete Build Target

The best next implementation target is **wiring module settings into runtime behavior**, because the dashboard now stores the settings safely. After that, build **visual profile cards + streaks**, because those are the most visible Loritta-like improvements for normal members.
