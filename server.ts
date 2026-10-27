import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app } from './src/server/app';

// Ignore HMR and WebSocket errors per runtime environment constraints
process.on('uncaughtException', (err: any) => {
  if (
    (err?.code === 'EADDRINUSE' && (err?.port === 24678 || err?.message?.includes('24678'))) ||
    err?.message?.includes('WebSocket') ||
    err?.message?.includes('ws')
  ) {
    console.warn('Ignored transient WebSocket/HMR error:', err?.message || err);
    return;
  }
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('Unhandled Rejection:', reason);
});

async function startServer() {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const cliPort = portIndex !== -1 && args[portIndex + 1] ? Number(args[portIndex + 1]) : null;
  const hostIndex = args.indexOf('--host');
  const cliHost = hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1] : null;

  const PORT = cliPort || Number(process.env.PORT) || 3000;
  const HOST = cliHost || process.env.HOST || '0.0.0.0';

  const httpServer = http.createServer(app);

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`🚀 SWE Portal Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

