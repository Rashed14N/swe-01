import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.ts';
import dashboardRoutes from './routes/dashboard.ts';
import batchRoutes from './routes/batches.ts';
import routineRoutes from './routes/routines.ts';
import courseRoutes from './routes/courses.ts';
import examRoutes from './routes/exams.ts';
import announcementRoutes from './routes/announcements.ts';
import noticeRoutes from './routes/notices.ts';
import resourceRoutes from './routes/resources.ts';
import adminRoutes from './routes/admin.ts';
import facultyRoutes from './routes/faculty.ts';
import notificationRoutes from './routes/notifications.ts';
import profileRoutes from './routes/profile.ts';
import supabaseRoutes from './routes/supabaseConfig.ts';

export function createExpressApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Request logger for diagnostic debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[HTTP ${req.method}] ${req.url}`);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'SWE Portal', timestamp: new Date().toISOString() });
  });

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

  // API 404 catch-all: ensures unmatched /api/* requests return JSON 404
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  return app;
}

export const app = createExpressApp();
export default app;
