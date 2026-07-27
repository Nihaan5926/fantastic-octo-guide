import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// GEOINT Features
router.get('/features', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { feature_type, classification, search } = req.query;

    let query = db('geoint_features')
      .select('geoint_features.*', 'users.first_name as analyst_first', 'users.last_name as analyst_last')
      .leftJoin('users', 'geoint_features.analyst_id', 'users.id');

    if (feature_type) query = query.where('geoint_features.feature_type', feature_type);
    if (classification) query = query.where('geoint_features.classification', classification);
    if (search) query = query.where(function () {
      this.where('geoint_features.title', 'ilike', `%${search}%`)
        .orWhere('geoint_features.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('geoint_features.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('geoint_features.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/features/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('geoint_features')
      .select('geoint_features.*', 'users.first_name as analyst_first', 'users.last_name as analyst_last')
      .leftJoin('users', 'geoint_features.analyst_id', 'users.id')
      .where('geoint_features.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Feature not found' }); return; }
    const annotations = await db('geoint_annotations').where({ feature_id: req.params.id }).orderBy('created_at', 'desc');
    res.json({ ...item, annotations });
  } catch (e) { next(e); }
});

router.post('/features', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('geoint_features').insert({
      id: uuid(),
      analyst_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'geoint_feature',
      entityId: item.id,
      title: item.title || 'New feature',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/features/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('geoint_features')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Feature not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'geoint_feature',
      entityId: item.id,
      title: item.title || 'Updated feature',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/features/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('geoint_features').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'geoint_feature',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// GEOINT Annotations
router.get('/features/:id/annotations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db('geoint_annotations')
        .select('geoint_annotations.*', 'users.first_name as author_first', 'users.last_name as author_last')
        .leftJoin('users', 'geoint_annotations.author_id', 'users.id')
        .where('geoint_annotations.feature_id', req.params.id)
        .orderBy('geoint_annotations.created_at', 'desc')
        .limit(limit).offset(offset),
      db('geoint_annotations').where({ feature_id: req.params.id }).count('id').first()
        .then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/features/:id/annotations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feature = await db('geoint_features').where({ id: req.params.id }).first();
    if (!feature) { res.status(404).json({ error: 'Feature not found' }); return; }

    const [item] = await db('geoint_annotations').insert({
      id: uuid(),
      feature_id: req.params.id,
      author_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'geoint_annotation',
      entityId: item.id,
      title: item.text || 'New annotation',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/annotations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('geoint_annotations')
      .where({ id: req.params.id }).update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Annotation not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'geoint_annotation',
      entityId: item.id,
      title: item.text || 'Updated annotation',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/annotations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('geoint_annotations').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'geoint_annotation',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
