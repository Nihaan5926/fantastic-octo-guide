import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import { convertEmptyToNull } from '../../utils/validators';

const router = Router();
router.use(authenticate);


router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = convertEmptyToNull(req.body);
  }
  next();
});

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

// ── Coverage Gaps ──

router.get('/gaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requirements = await db('collection_requirements')
      .select(
        'collection_requirements.*',
        'users.first_name as requester_first',
        'users.last_name as requester_last',
      )
      .leftJoin('users', 'collection_requirements.requester_id', 'users.id');

    const assets = await db('collection_assets').select('*');

    const gaps = requirements.filter((req: any) => {
      const discipline = req.intelligence_discipline;
      const hasAsset = assets.some((asset: any) => {
        if (discipline === 'GEOINT' && (asset.asset_type === 'SATELLITE' || asset.asset_type === 'DRONE')) return true;
        if (discipline === 'SIGINT' && (asset.asset_type === 'AIRCRAFT' || asset.asset_type === 'CYBER')) return true;
        if (discipline === 'HUMINT' && asset.asset_type === 'HUMAN') return true;
        if (discipline === 'OSINT' && asset.asset_type === 'CYBER') return true;
        return false;
      });
      return !hasAsset;
    });

    res.json({ data: gaps, total: gaps.length });
  } catch (e) { next(e); }
});

// ── PIRs ──

router.get('/pirs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let query = db('collection_pirs')
      .select(
        'collection_pirs.*',
        'req.title as requirement_title',
        'req.reference_number as requirement_ref',
        'users.first_name as requester_first',
        'users.last_name as requester_last',
      )
      .leftJoin('collection_requirements as req', 'collection_pirs.requirement_id', 'req.id')
      .leftJoin('users', 'collection_pirs.created_by', 'users.id');

    const [items, total] = await Promise.all([
      query.clone().orderBy('collection_pirs.priority', 'asc').limit(limit).offset(offset),
      query.clone().clearSelect().count('collection_pirs.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/pirs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requirement_id, title, priority, description } = req.body;
    if (!requirement_id || !title) {
      res.status(400).json({ error: 'requirement_id and title are required' });
      return;
    }
    const ref = `PIR-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('collection_pirs').insert({
      id: uuid(),
      reference_number: ref,
      requirement_id,
      title,
      priority: priority || 'MEDIUM',
      status: 'ACTIVE',
      description: description || null,
      created_by: req.user!.userId,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'collection_pir',
      entityId: item.id,
      title: item.title,
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/pirs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('collection_pirs')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'PIR not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/pirs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('collection_pirs').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
