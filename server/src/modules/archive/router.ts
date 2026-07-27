import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

router.get('/records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, entity_type, search } = req.query;

    let query = db('archive_records')
      .select('archive_records.*', 'users.first_name as archiver_first', 'users.last_name as archiver_last')
      .leftJoin('users', 'archive_records.archived_by', 'users.id');

    if (status) query = query.where('archive_records.status', status);
    if (classification) query = query.where('archive_records.classification', classification);
    if (entity_type) query = query.where('archive_records.entity_type', entity_type);
    if (search) query = query.where(function () {
      this.where('archive_records.title', 'ilike', `%${search}%`)
        .orWhere('archive_records.reference_number', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('archive_records.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('archive_records.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/records/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('archive_records')
      .select('archive_records.*', 'users.first_name as archiver_first', 'users.last_name as archiver_last')
      .leftJoin('users', 'archive_records.archived_by', 'users.id')
      .where('archive_records.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Record not found' }); return; }

    const declassificationRequests = await db('declassification_requests')
      .select(
        'declassification_requests.*',
        'req.first_name as requester_first',
        'req.last_name as requester_last',
        'rev.first_name as reviewer_first',
        'rev.last_name as reviewer_last',
      )
      .leftJoin('users as req', 'declassification_requests.requested_by', 'req.id')
      .leftJoin('users as rev', 'declassification_requests.reviewed_by', 'rev.id')
      .where('declassification_requests.record_id', req.params.id);

    res.json({ ...item, declassificationRequests });
  } catch (e) { next(e); }
});

router.post('/records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `ARC-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('archive_records').insert({
      id: uuid(),
      reference_number: ref,
      ...req.body,
      archived_by: req.user!.userId,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'archive_record',
      entityId: item.id,
      title: item.title || item.reference_number || 'New record',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/records/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('archive_records').where({ id: req.params.id })
      .update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Record not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'archive_record',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated record',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/records/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('archive_records').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'archive_record',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/declassification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    let query = db('declassification_requests')
      .select(
        'declassification_requests.*',
        'req.first_name as requester_first',
        'req.last_name as requester_last',
        'rev.first_name as reviewer_first',
        'rev.last_name as reviewer_last',
        'archive_records.title as record_title',
      )
      .leftJoin('users as req', 'declassification_requests.requested_by', 'req.id')
      .leftJoin('users as rev', 'declassification_requests.reviewed_by', 'rev.id')
      .leftJoin('archive_records', 'declassification_requests.record_id', 'archive_records.id');

    if (status) query = query.where('declassification_requests.status', status);
    if (search) query = query.where(function () {
      this.where('declassification_requests.reason', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('declassification_requests.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('declassification_requests.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/declassification/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('declassification_requests')
      .select(
        'declassification_requests.*',
        'req.first_name as requester_first',
        'req.last_name as requester_last',
        'rev.first_name as reviewer_first',
        'rev.last_name as reviewer_last',
        'archive_records.title as record_title',
      )
      .leftJoin('users as req', 'declassification_requests.requested_by', 'req.id')
      .leftJoin('users as rev', 'declassification_requests.reviewed_by', 'rev.id')
      .leftJoin('archive_records', 'declassification_requests.record_id', 'archive_records.id')
      .where('declassification_requests.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Request not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/declassification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('declassification_requests').insert({
      id: uuid(), requested_by: req.user!.userId, ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'declassification_request',
      entityId: item.id,
      title: item.reason || 'New declassification request',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/declassification/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('declassification_requests').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Request not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'declassification_request',
      entityId: item.id,
      title: item.reason || 'Updated declassification request',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/declassification/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('declassification_requests').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'declassification_request',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
