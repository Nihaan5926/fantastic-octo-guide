import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// SIGINT Intercepts
router.get('/intercepts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { signal_type, classification, status, search } = req.query;

    let query = db('sigint_intercepts')
      .select('sigint_intercepts.*', 'users.first_name as analyst_first', 'users.last_name as analyst_last')
      .leftJoin('users', 'sigint_intercepts.analyst_id', 'users.id');

    if (signal_type) query = query.where('sigint_intercepts.signal_type', signal_type);
    if (classification) query = query.where('sigint_intercepts.classification', classification);
    if (status) query = query.where('sigint_intercepts.status', status);
    if (search) query = query.where(function () {
      this.where('sigint_intercepts.title', 'ilike', `%${search}%`)
        .orWhere('sigint_intercepts.content', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('sigint_intercepts.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('sigint_intercepts.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/intercepts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('sigint_intercepts')
      .select('sigint_intercepts.*', 'users.first_name as analyst_first', 'users.last_name as analyst_last')
      .leftJoin('users', 'sigint_intercepts.analyst_id', 'users.id')
      .where('sigint_intercepts.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Intercept not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/intercepts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `SIG-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('sigint_intercepts').insert({
      id: uuid(),
      reference_number: ref,
      analyst_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/intercepts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('sigint_intercepts')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Intercept not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/intercepts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('sigint_intercepts').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// SIGINT Emitters
router.get('/emitters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { emitter_type, status, search } = req.query;

    let query = db('sigint_emitters').select('*');

    if (emitter_type) query = query.where('emitter_type', emitter_type);
    if (status) query = query.where('status', status);
    if (search) query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/emitters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('sigint_emitters').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Emitter not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/emitters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('sigint_emitters').insert({ id: uuid(), ...req.body }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/emitters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('sigint_emitters')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Emitter not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/emitters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('sigint_emitters').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
