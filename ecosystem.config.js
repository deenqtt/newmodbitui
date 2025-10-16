module.exports = {
  apps: [
    {
      name: 'nexus-dashboard-production',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/Alfi/RnD/Development/newmodbitui',
      env: {
        NODE_ENV: 'production',
        PORT: 3501
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3501
      }
    }
  ]
};
