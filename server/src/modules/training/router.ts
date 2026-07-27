import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// ── Courses ──────────────────────────────────────────────────────────────────

router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { course_type, is_required, search } = req.query;

    let query = db('training_courses').select('*');

    if (course_type) query = query.where('course_type', course_type);
    if (is_required !== undefined) query = query.where('is_required', is_required === 'true');
    if (search) query = query.where(function () {
      this.where('title', 'ilike', `%${search}%`)
        .orWhere('description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('training_courses').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    const enrollments = await db('training_enrollments')
      .select('training_enrollments.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'training_enrollments.user_id', 'users.id')
      .where('training_enrollments.course_id', req.params.id);

    res.json({ ...item, enrollments });
  } catch (e) { next(e); }
});

router.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('training_courses').insert({ id: uuid(), ...req.body }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'training_course',
      entityId: item.id,
      title: item.title || 'New course',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('training_courses')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'training_course',
      entityId: item.id,
      title: item.title || 'Updated course',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('training_courses').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'training_course',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Enrollments ──────────────────────────────────────────────────────────────

router.get('/enrollments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { course_id, user_id, status } = req.query;

    let query = db('training_enrollments')
      .select(
        'training_enrollments.*',
        'users.first_name',
        'users.last_name',
        'training_courses.title as course_title',
      )
      .leftJoin('users', 'training_enrollments.user_id', 'users.id')
      .leftJoin('training_courses', 'training_enrollments.course_id', 'training_courses.id');

    if (course_id) query = query.where('training_enrollments.course_id', course_id);
    if (user_id) query = query.where('training_enrollments.user_id', user_id);
    if (status) query = query.where('training_enrollments.status', status);

    const [items, total] = await Promise.all([
      query.clone().orderBy('training_enrollments.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('training_enrollments.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/enrollments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('training_enrollments').insert({
      id: uuid(), ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'training_enrollment',
      entityId: item.id,
      title: item.status || 'New enrollment',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/enrollments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('training_enrollments')
      .where({ id: req.params.id })
      .update({ ...req.body })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'training_enrollment',
      entityId: item.id,
      title: item.status || 'Updated enrollment',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/enrollments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('training_enrollments').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'training_enrollment',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── After Action Reports ─────────────────────────────────────────────────────

router.get('/aar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    let query = db('after_action_reports')
      .select('after_action_reports.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'after_action_reports.author_id', 'users.id');

    if (search) query = query.where(function () {
      this.where('after_action_reports.title', 'ilike', `%${search}%`)
        .orWhere('after_action_reports.exercise_name', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('after_action_reports.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('after_action_reports.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/aar/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('after_action_reports')
      .select('after_action_reports.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'after_action_reports.author_id', 'users.id')
      .where('after_action_reports.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/aar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('after_action_reports').insert({
      id: uuid(), ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'after_action_report',
      entityId: item.id,
      title: item.title || 'New AAR',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/aar/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('after_action_reports')
      .where({ id: req.params.id })
      .update({ ...req.body })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'after_action_report',
      entityId: item.id,
      title: item.title || 'Updated AAR',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/aar/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('after_action_reports').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'after_action_report',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
