# RoguePoke Bot Install

The main installation guide now lives in the repository root:

- [../README.md](../README.md)
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
- [../docs/OPERATIONS.md](../docs/OPERATIONS.md)

Quick start:

```bash
cd discord-bot
npm install
cp .env.example .env
npm run setup:server:dry
npm start
```

Run checks:

```bash
npm run test:smoke
npm run test:system
```

Never commit `.env`, bot tokens, local databases, logs or PID files.
