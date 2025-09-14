# Deployment Guide for AI-Enabled Node.js Project

## 1. Prerequisites
- Node.js and npm installed on the server
- `pm2` installed globally (`npm install -g pm2`)
- Your project files uploaded to the server

## 2. Install Dependencies
Navigate to your project directory and run:

```
npm install
```

## 3. Start the Server with PM2
Start your server in the background using pm2:

```
pm2 start server.js --name os-calculator
```

## 4. Enable Auto-Start on Boot
To ensure the server starts automatically after a reboot:

```
pm2 startup
pm2 save
```
- Follow any additional instructions shown by `pm2 startup` (it may provide a command to run for your OS).

## 5. Monitor and Manage the Server
- View running processes: `pm2 list`
- Restart: `pm2 restart os-calculator`
- Stop: `pm2 stop os-calculator`
- View logs: `pm2 logs os-calculator`

## 6. Production Tips
- Use a process manager like pm2 for reliability
- Secure your server (firewall, updates, etc.)
- Set up HTTPS if exposing to the internet

---

This guide ensures your AI features are always available when the site loads, both in development and production deployments.
