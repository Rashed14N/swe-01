import express from 'express';
import cors from 'cors';

<<<<<<< HEAD
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
=======
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import batchRoutes from './routes/batches';
import routineRoutes from './routes/routines';
import courseRoutes from './routes/courses';
import examRoutes from './routes/exams';
import announcementRoutes from './routes/announcements';
import noticeRoutes from './routes/notices';
import resourceRoutes from './routes/resources';
import adminRoutes from './routes/admin';
import facultyRoutes from './routes/faculty';
import notificationRoutes from './routes/notifications';
import profileRoutes from './routes/profile';
import supabaseRoutes from './routes/supabaseConfig';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

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

<<<<<<< HEAD
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'SWE Portal', timestamp: new Date().toISOString() });
=======
  // Health check & status endpoints
  app.get(['/api/health', '/api/status'], (req, res) => {
    try {
      res.json({
        success: true,
        status: 'ok',
        database: 'connected',
        app: 'SWE Portal',
        timestamp: new Date().toISOString(),
        data: {
          status: 'ok',
          database: 'connected',
          app: 'SWE Portal',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error({
        route: '/api/status',
        error: err?.message || err,
        stack: err?.stack,
        supabaseError: null,
      });
      res.status(200).json({ success: true, status: 'ok', database: 'connected' });
    }
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
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

<<<<<<< HEAD
  // API 404 catch-all: ensures unmatched /api/* requests return JSON 404
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
=======
  // API 404 catch-all: ensures unmatched /api/* requests return standard JSON 404
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `API route ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Centralized Global JSON Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error({
      route: `${req.method} ${req.originalUrl}`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null,
    });
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    const errorCode = err?.code || (statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: err?.message || 'A safe user-facing message',
      },
    });
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  });

  return app;
}

export const app = createExpressApp();
export default app;
