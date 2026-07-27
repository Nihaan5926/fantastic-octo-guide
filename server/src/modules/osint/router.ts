import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

router.get('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let query = db('osint_collection_tasks').select('*');
    if (status) query = query.where('status', status);

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('osint_collection_tasks').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('osint_collection_tasks').insert({
      id: uuid(), created_by: req.user!.userId, ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'osint_task',
      entityId: item.id,
      title: item.title || 'New OSINT task',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('osint_collection_tasks').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'osint_task',
      entityId: item.id,
      title: item.title || 'Updated OSINT task',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('osint_collection_tasks').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'osint_task',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.post('/tasks/:id/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await db('osint_collection_tasks').where({ id: req.params.id }).first();
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    await db('osint_collection_tasks').where({ id: req.params.id }).update({
      status: 'RUNNING', last_run_at: db.fn.now(),
    });

    // Simulate collecting items (in production, this would trigger a real scraper)
    const sampleResults = [
      { title: 'Sample result from news source', url: 'https://example.com/article-1', content_snippet: 'Relevant intelligence data...' },
    ];

    for (const result of sampleResults) {
      await db('osint_collected_items').insert({
        id: uuid(), task_id: req.params.id, title: result.title, url: result.url,
        content_snippet: result.content_snippet, source_type: 'NEWS',
      });
    }

    await db('osint_collection_tasks').where({ id: req.params.id }).update({
      status: 'COMPLETED',
      results_count: db.raw('(SELECT COUNT(*) FROM osint_collected_items WHERE task_id = ?)', [req.params.id]),
    });

    res.json({ message: 'Task completed', resultsCollected: sampleResults.length });
  } catch (e) { next(e); }
});

router.get('/tasks/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db('osint_collected_items').where({ task_id: req.params.id }).orderBy('created_at', 'desc').limit(limit).offset(offset),
      db('osint_collected_items').where({ task_id: req.params.id }).count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

export default router;
