const path = require('path');

module.exports = {
  apps: [
    {
      name: 'discord-server-automator-bot',
      cwd: path.join(__dirname, 'discord-bot'),
      script: 'index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'discord-server-automator-dashboard',
      cwd: path.join(__dirname, 'dashboard'),
      script: 'server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
