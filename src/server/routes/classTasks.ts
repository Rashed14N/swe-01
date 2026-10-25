import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import type { ClassTask } from '../../types';

const router = Router();

// GET /api/class-tasks (List class tasks/updates with filters)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId, courseCode, semester, batchId, search, limit } = req.query;
    let tasks = db.getClassTasks();

    if (courseId) {
      tasks = tasks.filter(t => t.courseId === courseId || t.courseCode.toLowerCase() === String(courseId).toLowerCase());
    }

    if (courseCode) {
      const codeNorm = String(courseCode).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      tasks = tasks.filter(t => t.courseCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === codeNorm);
    }

    if (semester) {
      const semNum = Number(semester);
      tasks = tasks.filter(t => t.semester === semNum);
    }

    if (batchId) {
      tasks = tasks.filter(t => !t.batchId || t.batchId === batchId);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.courseCode.toLowerCase().includes(q) ||
        t.courseTitle.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.facultyName && t.facultyName.toLowerCase().includes(q))
      );
    }

    // Sort by date descending (most recent first)
    tasks = [...tasks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));

    if (limit) {
      const l = parseInt(String(limit), 10);
      if (!isNaN(l) && l > 0) {
        tasks = tasks.slice(0, l);
      }
    }

    return res.json({ success: true, tasks, topics: tasks });
  } catch (err: any) {
    console.error('[ClassTasks GET Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch class tasks' });
  }
});

// GET /api/class-tasks/:id
router.get('/:id', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tasks = db.getClassTasks();
    const found = tasks.find(t => t.id === id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Class task not found' });
    }
    return res.json({ success: true, task: found, topic: found });
  } catch (err: any) {
    console.error('[ClassTask Detail Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch class task' });
  }
});

// POST /api/class-tasks (Add a new class task/update - CR & Admin)
router.post('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  // Check CR or Admin role
  const isCRorAdmin = req.user.role === 'ADMIN' || req.user.role === 'CR' || (req.user as any).isCR;
  if (!isCRorAdmin) {
    return res.status(403).json({ success: false, error: 'Only Class Representatives (CR) and Admins can post class tasks' });
  }

  try {
    const {
      courseId,
      courseCode,
      courseTitle,
      semester,
      batchId,
      date,
      dueDate,
      title,
      description,
      type,
      priority,
      facultyName,
      attachmentUrl,
      attachmentName,
      topic, // fallback if sent as topic
    } = req.body;

    const taskTitle = title || topic;
    if (!courseCode || !taskTitle) {
      return res.status(400).json({ success: false, error: 'Course code and task title are required' });
    }

    const newTask: ClassTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      courseId: courseId || `course-${courseCode.replace(/\s+/g, '-').toLowerCase()}`,
      courseCode: String(courseCode).trim().toUpperCase(),
      courseTitle: courseTitle || 'Academic Course',
      semester: Number(semester) || req.user.currentSemester || 5,
      batchId: batchId || req.user.batchId || 'batch-9',
      date: date || new Date().toISOString().split('T')[0],
      dueDate: dueDate ? String(dueDate).trim() : undefined,
      title: String(taskTitle).trim(),
      description: description ? String(description).trim() : '',
      type: type || 'TASK',
      priority: priority || 'NORMAL',
      facultyName: facultyName ? String(facultyName).trim() : undefined,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      createdBy: req.user.id,
      createdByName: req.user.name || 'CR / Class Representative',
      createdAt: new Date().toISOString(),
    };

    db.addClassTask(newTask);

    return res.status(201).json({
      success: true,
      message: 'Class task posted successfully',
      task: newTask,
      topic: newTask,
    });
  } catch (err: any) {
    console.error('[ClassTask Create Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to create class task' });
  }
});

// PUT /api/class-tasks/:id (Update existing class task)
router.put('/:id', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const isCRorAdmin = req.user.role === 'ADMIN' || req.user.role === 'CR' || (req.user as any).isCR;
  if (!isCRorAdmin) {
    return res.status(403).json({ success: false, error: 'Only Class Representatives (CR) and Admins can edit class tasks' });
  }

  try {
    const { id } = req.params;
    const existing = db.getClassTasks().find(t => t.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Class task not found' });
    }

    const updated = db.updateClassTask(id, req.body);

    return res.json({
      success: true,
      message: 'Class task updated successfully',
      task: updated,
      topic: updated,
    });
  } catch (err: any) {
    console.error('[ClassTask Update Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update class task' });
  }
});

// DELETE /api/class-tasks/:id
router.delete('/:id', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const isCRorAdmin = req.user.role === 'ADMIN' || req.user.role === 'CR' || (req.user as any).isCR;
  if (!isCRorAdmin) {
    return res.status(403).json({ success: false, error: 'Only Class Representatives (CR) and Admins can delete class tasks' });
  }

  try {
    const { id } = req.params;
    const existing = db.getClassTasks().find(t => t.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Class task not found' });
    }

    db.deleteClassTask(id);

    return res.json({
      success: true,
      message: 'Class task deleted successfully',
    });
  } catch (err: any) {
    console.error('[ClassTask Delete Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete class task' });
  }
});

export default router;
