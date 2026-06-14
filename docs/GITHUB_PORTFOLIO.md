# GitHub Portfolio Notes

Use this checklist to publish this repository as a portfolio-grade open source project.

## Repository Positioning

Suggested name:

```text
discord-server-automator
```

Short description:

```text
Config-driven Discord server automation toolkit with moderation, tickets, XP, economy, shop, badges, collectible creatures and a local operations dashboard.
```

The included RoguePoke setup is a demo blueprint. The repository itself is meant to automate any professional Discord community by editing the JSON blueprint and labels.

## Suggested Topics

- discord-bot
- discord-js
- moderation-bot
- ticket-system
- server-automation
- sqlite
- express
- dashboard
- open-source
- community-management
- gamification

## README Highlights

- Real dashboard screenshots.
- Server setup from a configurable blueprint.
- Role, category, channel and permission automation.
- Verification, language selection and ticket panels.
- XP, economy, shop and badge systems.
- Collectible creature mechanics as an optional gamification module.
- Smoke and system checks through `npm test`.

## Before Publishing

- Confirm `.env` is not tracked.
- Confirm local SQLite databases are not tracked.
- Confirm logs and `.pid` files are not tracked.
- Run `npm test`.
- Refresh screenshots with `npm run screenshots`.
- Check `git status --short` from inside this folder.
- Publish only the `roguepoke-discord/` directory contents, not the parent workspace.

## First Publish Commands

```bash
git init
git add .
git commit -m "Initial open source release"
git branch -M main
git remote add origin https://github.com/<user-or-org>/discord-server-automator.git
git push -u origin main
```

## Pinned Repository Text

Discord Server Automator is a production-minded toolkit for launching and operating Discord communities: server setup automation, moderation, tickets, XP, economy, shop, badges, collectible creatures and a local admin dashboard.
