import { Router, Response } from 'express';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import {
  getAllKnowledgeItems,
  addCustomKnowledgeItem,
  updateCustomKnowledgeItem,
  deleteCustomKnowledgeItem,
  resetKnowledgeBaseDefaults,
  searchAcademicKnowledge,
  KnowledgeItem,
} from '../knowledgeBase';

const router = Router();

// ==============================================================================
// 1. GET /api/knowledge-base - List all snippets (Admins & Authenticated Users)
// ==============================================================================
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, search } = req.query as { category?: string; search?: string };
    let items = getAllKnowledgeItems();

    if (category && category !== 'ALL') {
      items = items.filter((it) => it.category === category);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.summary.toLowerCase().includes(q) ||
          it.details.toLowerCase().includes(q) ||
          it.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    }

    const total = items.length;
    const customCount = items.filter((it) => it.isCustom).length;
    const builtInCount = total - customCount;

    return res.json({
      success: true,
      data: items,
      stats: {
        total,
        custom: customCount,
        builtIn: builtInCount,
      },
    });
  } catch (err: any) {
    console.error('Error fetching knowledge base items:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: err?.message || 'Failed to fetch knowledge base' },
    });
  }
});

// ==============================================================================
// 2. POST /api/knowledge-base/test - Test Chatbot Query Retrieval
// ==============================================================================
router.post('/test', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query } = req.body as { query?: string };
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query is required for testing' });
    }

    const matches = searchAcademicKnowledge(query.trim(), 3);
    return res.json({
      success: true,
      query: query.trim(),
      matchCount: matches.length,
      bestMatch: matches[0] || null,
      topMatches: matches,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Test failed' });
  }
});

// ==============================================================================
// 3. POST /api/knowledge-base - Create New Custom Knowledge Snippet (Admin Only)
// ==============================================================================
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category, keywords, summary, details, actionPath, actionLabel } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Snippet title is required' },
      });
    }

    if (!summary || !String(summary).trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Chatbot summary answer is required' },
      });
    }

    const rawKeywords = keywords || [];
    const normalizedKeywords: string[] = Array.isArray(rawKeywords)
      ? rawKeywords.map((k: any) => String(k).trim()).filter(Boolean)
      : String(rawKeywords)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);

    if (normalizedKeywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one trigger keyword is required' },
      });
    }

    const newItem = addCustomKnowledgeItem({
      title: String(title).trim(),
      category: category || 'GENERAL_POLICY',
      keywords: normalizedKeywords,
      summary: String(summary).trim(),
      details: details ? String(details).trim() : String(summary).trim(),
      actionPath: actionPath ? String(actionPath).trim() : '/faq',
      actionLabel: actionLabel ? String(actionLabel).trim() : 'View Info',
    });

    return res.status(201).json({
      success: true,
      message: 'Custom knowledge snippet added successfully',
      data: newItem,
    });
  } catch (err: any) {
    console.error('Error adding knowledge snippet:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: err?.message || 'Failed to create snippet' },
    });
  }
});

// ==============================================================================
// 4. PUT /api/knowledge-base/:id - Update Snippet (Admin Only)
// ==============================================================================
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, category, keywords, summary, details, actionPath, actionLabel } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Snippet ID is required' });
    }

    const updates: Partial<KnowledgeItem> = {};
    if (title !== undefined) updates.title = String(title).trim();
    if (category !== undefined) updates.category = category;
    if (summary !== undefined) updates.summary = String(summary).trim();
    if (details !== undefined) updates.details = String(details).trim();
    if (actionPath !== undefined) updates.actionPath = String(actionPath).trim();
    if (actionLabel !== undefined) updates.actionLabel = String(actionLabel).trim();
    if (keywords !== undefined) {
      updates.keywords = Array.isArray(keywords)
        ? keywords.map((k: any) => String(k).trim()).filter(Boolean)
        : String(keywords)
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
    }

    const updated = updateCustomKnowledgeItem(id, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Knowledge snippet not found' },
      });
    }

    return res.json({
      success: true,
      message: 'Knowledge snippet updated successfully',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating knowledge snippet:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: err?.message || 'Failed to update snippet' },
    });
  }
});

// ==============================================================================
// 5. DELETE /api/knowledge-base/:id - Delete / Hide Snippet (Admin Only)
// ==============================================================================
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Snippet ID is required' });
    }

    const success = deleteCustomKnowledgeItem(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Knowledge snippet not found or already deleted' },
      });
    }

    return res.json({
      success: true,
      message: 'Knowledge snippet deleted successfully',
      id,
    });
  } catch (err: any) {
    console.error('Error deleting knowledge snippet:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: err?.message || 'Failed to delete snippet' },
    });
  }
});

// ==============================================================================
// 6. POST /api/knowledge-base/reset - Restore Defaults (Admin Only)
// ==============================================================================
router.post('/reset', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    resetKnowledgeBaseDefaults();
    return res.json({
      success: true,
      message: 'Knowledge base reset to original institutional presets',
      data: getAllKnowledgeItems(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to reset' });
  }
});

export default router;
