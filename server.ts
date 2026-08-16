import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import authRoutes from './src/server/routes/auth';
import dashboardRoutes from './src/server/routes/dashboard';
import batchRoutes from './src/server/routes/batches';
import routineRoutes from './src/server/routes/routines';
import courseRoutes from './src/server/routes/courses';
import examRoutes from './src/server/routes/exams';
import announcementRoutes from './src/server/routes/announcements';
import noticeRoutes from './src/server/routes/notices';
import resourceRoutes from './src/server/routes/resources';
import adminRoutes from './src/server/routes/admin';
import facultyRoutes from './src/server/routes/faculty';
import notificationRoutes from './src/server/routes/notifications';
import profileRoutes from './src/server/routes/profile';
import supabaseRoutes from './src/server/routes/supabaseConfig';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/batches', batchRoutes);
  app.use('/api/routines', routineRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/notices', noticeRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/faculty', facultyRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/supabase', supabaseRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'SWE Portal', timestamp: new Date().toISOString() });
  });

  // API 404 catch-all: ensures /api/* requests NEVER fall through to HTML SPA fallback
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SWE Portal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
