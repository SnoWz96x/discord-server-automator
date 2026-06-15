# Oracle Always Free Deploy

This guide deploys the bot and dashboard to an Oracle Cloud Always Free Ubuntu VM.

Oracle Always Free is the recommended zero-cost target because a Discord bot needs a long-running process. Sleep-based free web hosts are a poor fit for gateway bots.

## What Will Run

- Discord bot: `discord-bot/index.js`
- Dashboard: `dashboard/server.js`
- Process manager: PM2
- Database: SQLite file at `roguepoke.db`
- Optional dashboard access: Discord OAuth2

## 1. Create The Free VM

In Oracle Cloud:

1. Open **Compute > Instances**.
2. Create an Ubuntu instance using an Always Free eligible shape.
3. Add your SSH public key.
4. Keep the boot volume modest, for example 50 GB.
5. Create or choose a Virtual Cloud Network.

Recommended shape:

```text
VM.Standard.A1.Flex
1 OCPU
6 GB RAM
```

That is more than enough for this project.

## 2. Open Network Access

For the bot itself, no inbound port is required.

For dashboard access, prefer one of these:

- keep it private and use SSH tunnel;
- expose it behind Nginx + HTTPS + Discord OAuth2.

Safer first deploy:

```bash
ssh -L 3000:127.0.0.1:3000 ubuntu@YOUR_VM_PUBLIC_IP
```

Then open this locally:

```text
http://127.0.0.1:3000
```

## 3. Bootstrap Ubuntu

SSH into the VM:

```bash
ssh ubuntu@YOUR_VM_PUBLIC_IP
```

Clone the repository:

```bash
git clone https://github.com/SnoWz96x/discord-server-automator.git
cd discord-server-automator
```

Install system dependencies:

```bash
sudo bash scripts/bootstrap-ubuntu.sh
```

Install project dependencies:

```bash
npm run install:all
```

## 4. Configure Environment

Create the production `.env`:

```bash
cp discord-bot/.env.example discord-bot/.env
nano discord-bot/.env
```

Required:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id_here
GUILD_ID=your_guild_id_here
OWNER_USER_ID=your_discord_user_id_here
DASHBOARD_HOST=127.0.0.1
DASHBOARD_PORT=3000
DASHBOARD_PUBLIC_URL=http://127.0.0.1:3000
DASHBOARD_SESSION_SECRET=use_a_long_random_value
```

If exposing the dashboard publicly, also set:

```env
DISCORD_CLIENT_SECRET=your_discord_application_client_secret
DISCORD_OAUTH_REDIRECT_URI=https://your-domain.com/api/auth/callback
DASHBOARD_PUBLIC_URL=https://your-domain.com
DASHBOARD_SECURE_COOKIE=true
```

Validate:

```bash
npm run check:env
npm run check:syntax
```

## 5. Start With PM2

Start bot and dashboard:

```bash
npm run prod:start
pm2 save
pm2 startup
```

PM2 will print a command. Run that command once with `sudo`.

Check status:

```bash
npm run prod:status
```

Live logs:

```bash
npm run prod:logs
```

## 6. Back Up SQLite

Manual backup:

```bash
npm run backup:db
```

Backups are written to:

```text
backups/
```

Keep 14 most recent backups by default.

Create a daily cron:

```bash
crontab -e
```

Add:

```cron
15 3 * * * cd /home/ubuntu/discord-server-automator && /usr/bin/npm run backup:db >> /home/ubuntu/discord-server-automator/backups/backup.log 2>&1
```

## 7. Update Production

```bash
cd ~/discord-server-automator
git pull
npm run install:all
npm run check:syntax
npm test
npm run prod:restart
```

## 8. Dashboard Security

Do not expose the dashboard publicly without:

- `DISCORD_CLIENT_SECRET`;
- `DASHBOARD_SESSION_SECRET`;
- `DISCORD_OAUTH_REDIRECT_URI`;
- HTTPS;
- `DASHBOARD_SECURE_COOKIE=true`.

For a private dashboard, use SSH tunnel instead of opening port 3000 to the internet.

## 9. Useful Commands

```bash
pm2 list
pm2 logs discord-server-automator-bot
pm2 logs discord-server-automator-dashboard
pm2 restart ecosystem.config.cjs --update-env
pm2 save
```

## 10. Recovery

If the VM restarts:

```bash
pm2 resurrect
```

If the bot is offline:

```bash
cd ~/discord-server-automator
npm run prod:status
npm run prod:logs
```

If the database is damaged, stop the apps, copy a backup over `roguepoke.db`, then restart:

```bash
pm2 stop ecosystem.config.cjs
cp backups/roguepoke-YYYY-MM-DDTHH-MM-SS-000Z.db roguepoke.db
pm2 start ecosystem.config.cjs
```
