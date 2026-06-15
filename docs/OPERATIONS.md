# Operations Guide

This guide describes the daily operating routine for a server created with this toolkit.

## Staff Routine

- Check the moderation log channel.
- Review open tickets.
- Move sensitive reports into private tickets.
- Record moderation actions with objective reasons.
- Publish changelog notes when relevant changes ship.
- Review dashboard health before changing server structure.

## Local Dashboard

The dashboard runs at:

```text
http://127.0.0.1:3000
```

It shows:

- bot and Discord API health;
- registered commands and detected channels;
- users seen by the bot;
- open tickets;
- recent moderation activity;
- XP, coins and CP rankings;
- configured and awarded badges;
- shop and collectible creature status;
- admin actions for trusted operators;
- module settings for welcome, verification, languages, tickets, leveling, economy, shop, AutoMod, logs and forums.

If `DISCORD_CLIENT_SECRET` is configured, the dashboard requires Discord OAuth2 and only allows users with Administrator or Manage Server in the configured guild. Without OAuth2 variables it runs in local admin mode for development only.

## Safe Setup Flow

Before applying large structure changes, run:

```bash
npm run setup:server:dry
```

Apply the current blueprint:

```bash
npm run setup:server
```

Refresh official messages and panels:

```bash
cd discord-bot
node scripts/apply-server-structure.js --refresh-info --refresh-panels
```

Clean legacy duplicated roles:

```bash
npm run cleanup:roles
```
