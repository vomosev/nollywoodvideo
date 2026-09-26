module.exports = {
  apps: [
    {
      name: 'nollywoodvideo',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/nollywoodvideo',
      env: {
        NODE_ENV: 'production',
        PORT: 4110
      }
    }
  ]
};