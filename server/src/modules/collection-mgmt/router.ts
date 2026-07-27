import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// ── Collection Requirements CRUD ──

router.get('/requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, intelligence_discipline, priority, search } = req.query;

    let query = db('collection_requirements')
      .select(
        'collection_requirements.*',
        'users.first_name as requester_first', 'users.last_name as requester_last',
      )
      .leftJoin('users', 'collection_requirements.requester_id', 'users.id');

    if (status) query = query.where('collection_requirements.status', status);
    if (intelligence_discipline) query = query.where('collection_requirements.intelligence_discipline', intelligence_discipline);
    if (priority) query = query.where('collection_requirements.priority', priority);
    if (search) query = query.where(function () {
      this.where('collection_requirements.title', 'ilike', `%${search}%`)
        .orWhere('collection_requirements.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('collection_requirements.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/requirements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('collection_requirements')
      .select(
        'collection_requirements.*',
        'users.first_name as requester_first', 'users.last_name as requester_last',
      )
      .leftJoin('users', 'collection_requirements.requester_id', 'users.id')
      .where('collection_requirements.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Collection requirement not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `CR-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('collection_requirements').insert({
      id: uuid(),
      reference_number: ref,
      requester_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'collection_requirement',
      entityId: item.id,
      title: item.title || item.reference_number || 'New requirement',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/requirements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('collection_requirements')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Collection requirement not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'collection_requirement',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated requirement',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/requirements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('collection_requirements').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'collection_requirement',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Collection Assets CRUD ──

router.get('/assets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, asset_type, search } = req.query;

    let query = db('collection_assets')
      .select(
        'collection_assets.*',
        'users.first_name as handler_first', 'users.last_name as handler_last',
      )
      .leftJoin('users', 'collection_assets.handler_id', 'users.id');

    if (status) query = query.where('collection_assets.status', status);
    if (asset_type) query = query.where('collection_assets.asset_type', asset_type);
    if (search) query = query.where(function () {
      this.where('collection_assets.name', 'ilike', `%${search}%`)
        .orWhere('collection_assets.capability', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('name', 'asc').limit(limit).offset(offset),
      query.clone().clearSelect().count('collection_assets.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('collection_assets')
      .select(
        'collection_assets.*',
        'users.first_name as handler_first', 'users.last_name as handler_last',
      )
      .leftJoin('users', 'collection_assets.handler_id', 'users.id')
      .where('collection_assets.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Collection asset not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/assets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('collection_assets').insert({
      id: uuid(),
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'collection_asset',
      entityId: item.id,
      title: item.name || 'New asset',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('collection_assets')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Collection asset not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'collection_asset',
      entityId: item.id,
      title: item.name || 'Updated asset',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/assets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('collection_assets').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'collection_asset',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
