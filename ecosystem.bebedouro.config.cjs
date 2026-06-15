const path = require('path');

module.exports = {
  apps: [
    {
      name: 'bebedouro-bot',
      cwd: path.join(__dirname, 'discord-bot'),
      script: 'index.js',
      node_args: ['-r', 'dotenv/config'],
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: path.join(__dirname, 'discord-bot', '.env.bebedouro')
      }
    }
  ]
};
