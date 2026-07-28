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

router.get('/partners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, partner_type, search } = req.query;

    let query = db('external_partners').select('*');

    if (status) query = query.where('status', status);
    if (partner_type) query = query.where('partner_type', partner_type);
    if (search) query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`)
        .orWhere('organization', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/partners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('external_partners').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Partner not found' }); return; }

    const agreements = await db('mou_agreements').where({ partner_id: req.params.id });
    const contactLogs = await db('partner_contact_logs')
      .select('partner_contact_logs.*', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'partner_contact_logs.contactor_id', 'users.id')
      .where('partner_contact_logs.partner_id', req.params.id)
      .orderBy('contact_date', 'desc');

    res.json({ ...item, agreements, contactLogs });
  } catch (e) { next(e); }
});

router.post('/partners', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('external_partners').insert({
      id: uuid(), ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'external_partner',
      entityId: item.id,
      title: item.name || item.organization || 'New partner',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/partners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('external_partners').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Partner not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'external_partner',
      entityId: item.id,
      title: item.name || item.organization || 'Updated partner',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/partners/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('external_partners').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'external_partner',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/agreements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, agreement_type, classification, search } = req.query;

    let query = db('mou_agreements')
      .select('mou_agreements.*', 'external_partners.name as partner_name')
      .leftJoin('external_partners', 'mou_agreements.partner_id', 'external_partners.id');

    if (status) query = query.where('mou_agreements.status', status);
    if (agreement_type) query = query.where('mou_agreements.agreement_type', agreement_type);
    if (classification) query = query.where('mou_agreements.classification', classification);
    if (search) query = query.where(function () {
      this.where('mou_agreements.title', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('mou_agreements.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('mou_agreements.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/agreements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('mou_agreements')
      .select('mou_agreements.*', 'external_partners.name as partner_name')
      .leftJoin('external_partners', 'mou_agreements.partner_id', 'external_partners.id')
      .where('mou_agreements.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Agreement not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/agreements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mou_agreements').insert({
      id: uuid(), ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'mou_agreement',
      entityId: item.id,
      title: item.title || 'New agreement',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/agreements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mou_agreements').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Agreement not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'mou_agreement',
      entityId: item.id,
      title: item.title || 'Updated agreement',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/agreements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('mou_agreements').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'mou_agreement',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/contact-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db('partner_contact_logs')
        .select('partner_contact_logs.*', 'ep.name as partner_name', 'users.first_name as contactor_first', 'users.last_name as contactor_last')
        .leftJoin('external_partners as ep', 'partner_contact_logs.partner_id', 'ep.id')
        .leftJoin('users', 'partner_contact_logs.contactor_id', 'users.id')
        .orderBy('partner_contact_logs.contact_date', 'desc')
        .limit(limit).offset(offset),
      db('partner_contact_logs').count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/contact-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('partner_contact_logs').insert({
      id: uuid(), contactor_id: req.user!.userId, ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'partner_contact_log',
      entityId: item.id,
      title: item.subject || 'New contact log',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.get('/partners/:id/contact-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await db('partner_contact_logs')
      .select('partner_contact_logs.*', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'partner_contact_logs.contactor_id', 'users.id')
      .where('partner_contact_logs.partner_id', req.params.id)
      .orderBy('contact_date', 'desc');
    res.json({ data: logs });
  } catch (e) { next(e); }
});

router.delete('/contact-logs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('partner_contact_logs').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'partner_contact_log',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
