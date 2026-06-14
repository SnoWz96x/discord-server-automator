# Security Policy

## Supported Versions

This project is in early open source development. Security fixes target the latest `main` branch.

## Secrets

Never commit:

- `discord-bot/.env`
- Discord bot tokens
- SQLite production databases
- logs
- PID files
- private screenshots with user data

The included `.gitignore` blocks the common local secret and runtime files.

## Dashboard Warning

The dashboard can execute moderation actions and mutate XP, community currency, CP and badges.

Keep it bound to `127.0.0.1` unless you add authentication such as Discord OAuth2, session protection and HTTPS.

## Reporting Issues

If you find a vulnerability, open a private issue or contact the maintainer directly. Include:

- affected module;
- reproduction steps;
- expected impact;
- suggested fix if available.
