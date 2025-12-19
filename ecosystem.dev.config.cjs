module.exports = {
  apps: [
    {
      name: "infectionx-backend-dev",
      script: "dist/server.js",
      cwd: "/var/www/infectionx_dev",
      
      // Dev environment variables
      env: {
        NODE_ENV: "development",
        PORT: 3002
      },

      // Optional — auto reload on changes
      watch: true,
      ignore_watch: ["node_modules", "logs"]
    }
  ]
};

