import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import {
  initSupabase,
  getSupabaseStatus,
  testSupabaseConnectionDetails,
  syncAllLocalToSupabase,
} from '../supabaseSync';

const router = Router();

// GET /api/supabase/config
router.get('/config', (req, res) => {
  try {
    const status = getSupabaseStatus();
    let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

    const configPath = path.join(process.cwd(), 'data', 'supabase-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.url) url = parsed.url;
        if (parsed.key) key = parsed.key;
      } catch {}
    }

    const configured = Boolean(
      url && key && 
      url.startsWith('https://') && 
      !url.includes('placeholder') && 
      !key.includes('placeholder')
    );

    res.json({
      configured,
      url: configured ? url : '',
      key: configured ? key : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supabase/status
router.get('/status', async (req, res) => {
  try {
    const status = getSupabaseStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supabase/test
router.get('/test', async (req, res) => {
  try {
    const details = await testSupabaseConnectionDetails();
    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/supabase/config
router.post('/config', async (req, res) => {
  try {
    const { url, key } = req.body;
    if (!url || !key) {
      return res.status(400).json({ error: 'Both Supabase URL and Anon/Publishable Key are required.' });
    }

    const initResult = initSupabase(url, key);
    if (!initResult.success) {
      return res.status(400).json({ error: initResult.message });
    }

    // Run connection test immediately
    const testResult = await testSupabaseConnectionDetails();

    res.json({
      success: true,
      message: 'Supabase configured successfully on server!',
      testResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/supabase/sync-all
router.post('/sync-all', async (req, res) => {
  try {
    const data = db.getData();
    const result = await syncAllLocalToSupabase(data);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/supabase/schema
router.get('/schema', (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.json({ sql });
    } else {
      res.status(404).json({ error: 'supabase_schema.sql not found on server' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
