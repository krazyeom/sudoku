module.exports = {
  apps: [
    {
      name: 'sudoku',
      cwd: __dirname,
      script: './server.mjs',
      interpreter: '/home/krazyeom/.nvm/versions/node/v20.19.6/bin/node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: 6767,
      },
      max_memory_restart: '512M',
    },
  ],
};
