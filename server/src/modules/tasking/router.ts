import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// ── Tasking Assignments CRUD ──

router.get('/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, priority, task_type, search } = req.query;

    let query = db('tasking_assignments')
      .select(
        'tasking_assignments.*',
        'assignee.first_name as assigned_to_first', 'assignee.last_name as assigned_to_last',
        'assigner.first_name as assigned_by_first', 'assigner.last_name as assigned_by_last',
      )
      .leftJoin('users as assignee', 'tasking_assignments.assigned_to', 'assignee.id')
      .leftJoin('users as assigner', 'tasking_assignments.assigned_by', 'assigner.id');

    if (status) query = query.where('tasking_assignments.status', status);
    if (priority) query = query.where('tasking_assignments.priority', priority);
    if (task_type) query = query.where('tasking_assignments.task_type', task_type);
    if (search) query = query.where(function () {
      this.where('tasking_assignments.title', 'ilike', `%${search}%`)
        .orWhere('tasking_assignments.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('tasking_assignments.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('tasking_assignments')
      .select(
        'tasking_assignments.*',
        'assignee.first_name as assigned_to_first', 'assignee.last_name as assigned_to_last',
        'assigner.first_name as assigned_by_first', 'assigner.last_name as assigned_by_last',
      )
      .leftJoin('users as assignee', 'tasking_assignments.assigned_to', 'assignee.id')
      .leftJoin('users as assigner', 'tasking_assignments.assigned_by', 'assigner.id')
      .where('tasking_assignments.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Tasking assignment not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `TSK-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('tasking_assignments').insert({
      id: uuid(),
      reference_number: ref,
      assigned_by: req.user!.userId,
      ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('tasking_assignments')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Tasking assignment not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('tasking_assignments').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Tasking Workflows CRUD ──

router.get('/workflows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { is_active, search } = req.query;

    let query = db('tasking_workflows');

    if (is_active !== undefined) query = query.where('tasking_workflows.is_active', is_active === 'true');
    if (search) query = query.where(function () {
      this.where('tasking_workflows.name', 'ilike', `%${search}%`)
        .orWhere('tasking_workflows.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('name', 'asc').limit(limit).offset(offset),
      query.clone().clearSelect().count('tasking_workflows.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('tasking_workflows')
      .where('tasking_workflows.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/workflows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('tasking_workflows').insert({
      id: uuid(),
      ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('tasking_workflows')
      .where({ id: req.params.id }).update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('tasking_workflows').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
