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

  const isDev = process.env.NODE_ENV !== 'production';
  const PORT = cliPort || (isDev ? 3000 : (Number(process.env.PORT) || 3000));
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

  let retries = 0;
  const maxRetries = 10;

  const listenWithRetry = () => {
    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 SWE Portal Server running on http://${HOST}:${PORT}`);
    });
  };

  httpServer.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE' && retries < maxRetries) {
      retries++;
      console.warn(`Port ${PORT} in use, retrying in 500ms (${retries}/${maxRetries})...`);
      setTimeout(() => {
        httpServer.close();
        listenWithRetry();
      }, 500);
      return;
    }
    console.error('HTTP Server Error:', err);
  });

  const shutdown = () => {
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  listenWithRetry();
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

