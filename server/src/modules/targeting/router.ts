import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// ── Target Packages CRUD ──

router.get('/packages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, priority, search } = req.query;

    let query = db('target_packages')
      .select(
        'target_packages.*',
        'author.first_name as author_first', 'author.last_name as author_last',
        'approver.first_name as approved_by_first', 'approver.last_name as approved_by_last',
      )
      .leftJoin('users as author', 'target_packages.author_id', 'author.id')
      .leftJoin('users as approver', 'target_packages.approved_by', 'approver.id');

    if (status) query = query.where('target_packages.status', status);
    if (classification) query = query.where('target_packages.classification', classification);
    if (priority) query = query.where('target_packages.priority', priority);
    if (search) query = query.where(function () {
      this.where('target_packages.title', 'ilike', `%${search}%`)
        .orWhere('target_packages.target_name', 'ilike', `%${search}%`)
        .orWhere('target_packages.objective', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('target_packages.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/packages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('target_packages')
      .select(
        'target_packages.*',
        'author.first_name as author_first', 'author.last_name as author_last',
        'approver.first_name as approved_by_first', 'approver.last_name as approved_by_last',
      )
      .leftJoin('users as author', 'target_packages.author_id', 'author.id')
      .leftJoin('users as approver', 'target_packages.approved_by', 'approver.id')
      .where('target_packages.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Target package not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/packages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `TGT-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('target_packages').insert({
      id: uuid(),
      reference_number: ref,
      author_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'target_package',
      entityId: item.id,
      title: item.title || item.reference_number || 'New target package',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/packages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('target_packages')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Target package not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'target_package',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated target package',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/packages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('target_packages').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'target_package',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Target Nominations ──

router.get('/packages/:packageId/nominations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db('target_nominations')
      .select('target_nominations.*', 'nom.first_name as nominator_first', 'nom.last_name as nominator_last',
        'rev.first_name as reviewed_by_first', 'rev.last_name as reviewed_by_last')
      .leftJoin('users as nom', 'target_nominations.nominator_id', 'nom.id')
      .leftJoin('users as rev', 'target_nominations.reviewed_by', 'rev.id')
      .where('target_nominations.package_id', req.params.packageId)
      .orderBy('created_at', 'desc');
    res.json({ data: items });
  } catch (e) { next(e); }
});

router.post('/packages/:packageId/nominations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('target_nominations').insert({
      id: uuid(),
      package_id: req.params.packageId,
      nominator_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'target_nomination',
      entityId: item.id,
      title: item.target_name || 'New nomination',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/nominations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('target_nominations')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Nomination not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'target_nomination',
      entityId: item.id,
      title: item.target_name || 'Updated nomination',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/nominations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('target_nominations').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'target_nomination',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
