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

// CI Investigations
router.get('/investigations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, investigation_type, search } = req.query;

    let query = db('ci_investigations')
      .select('ci_investigations.*',
        'lead.first_name as lead_first', 'lead.last_name as lead_last')
      .leftJoin({ lead: 'users' }, 'ci_investigations.lead_investigator_id', 'lead.id');

    if (status) query = query.where('ci_investigations.status', status);
    if (classification) query = query.where('ci_investigations.classification', classification);
    if (investigation_type) query = query.where('ci_investigations.investigation_type', investigation_type);
    if (search) query = query.where(function () {
      this.where('ci_investigations.title', 'ilike', `%${search}%`)
        .orWhere('ci_investigations.subject', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('ci_investigations.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('ci_investigations.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/investigations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('ci_investigations')
      .select('ci_investigations.*',
        'lead.first_name as lead_first', 'lead.last_name as lead_last')
      .leftJoin({ lead: 'users' }, 'ci_investigations.lead_investigator_id', 'lead.id')
      .where('ci_investigations.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Investigation not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/investigations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `CI-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('ci_investigations').insert({
      id: uuid(),
      reference_number: ref,
      lead_investigator_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'ci_investigation',
      entityId: item.id,
      title: item.title || item.reference_number || 'New investigation',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/investigations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('ci_investigations')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Investigation not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'ci_investigation',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated investigation',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/investigations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('ci_investigations').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'ci_investigation',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// CI Foreign Agents
router.get('/foreign-agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, threat_level, nationality, search } = req.query;

    let query = db('ci_foreign_agents').select('*');

    if (status) query = query.where('status', status);
    if (threat_level) query = query.where('threat_level', threat_level);
    if (nationality) query = query.where('nationality', nationality);
    if (search) query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`)
        .orWhere('description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/foreign-agents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('ci_foreign_agents').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Foreign agent not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/foreign-agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('ci_foreign_agents').insert({ id: uuid(), ...req.body }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'ci_foreign_agent',
      entityId: item.id,
      title: item.name || 'New foreign agent',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/foreign-agents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('ci_foreign_agents')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Foreign agent not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'ci_foreign_agent',
      entityId: item.id,
      title: item.name || 'Updated foreign agent',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/foreign-agents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('ci_foreign_agents').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'ci_foreign_agent',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// CI Insider Threats
router.get('/insider-threats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, risk_level, search } = req.query;

    let query = db('ci_insider_threats')
      .select('ci_insider_threats.*',
        'reporter.first_name as reporter_first', 'reporter.last_name as reporter_last',
        'subject_user.first_name as subject_first', 'subject_user.last_name as subject_last')
      .leftJoin({ reporter: 'users' }, 'ci_insider_threats.reported_by', 'reporter.id')
      .leftJoin({ subject_user: 'users' }, 'ci_insider_threats.user_id', 'subject_user.id');

    if (status) query = query.where('ci_insider_threats.status', status);
    if (risk_level) query = query.where('ci_insider_threats.risk_level', risk_level);
    if (search) query = query.where('ci_insider_threats.description', 'ilike', `%${search}%`);

    const [items, total] = await Promise.all([
      query.clone().orderBy('ci_insider_threats.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('ci_insider_threats.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/insider-threats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('ci_insider_threats')
      .select('ci_insider_threats.*',
        'reporter.first_name as reporter_first', 'reporter.last_name as reporter_last',
        'subject_user.first_name as subject_first', 'subject_user.last_name as subject_last')
      .leftJoin({ reporter: 'users' }, 'ci_insider_threats.reported_by', 'reporter.id')
      .leftJoin({ subject_user: 'users' }, 'ci_insider_threats.user_id', 'subject_user.id')
      .where('ci_insider_threats.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Insider threat not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/insider-threats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('ci_insider_threats').insert({
      id: uuid(),
      reported_by: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'ci_insider_threat',
      entityId: item.id,
      title: item.description || 'New insider threat',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/insider-threats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('ci_insider_threats')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Insider threat not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'ci_insider_threat',
      entityId: item.id,
      title: item.description || 'Updated insider threat',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/insider-threats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('ci_insider_threats').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'ci_insider_threat',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
