import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

router.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, priority, search } = req.query;

    let query = db('legal_reviews')
      .select(
        'legal_reviews.*',
        'req.first_name as requester_first',
        'req.last_name as requester_last',
        'asg.first_name as assignee_first',
        'asg.last_name as assignee_last',
      )
      .leftJoin('users as req', 'legal_reviews.requested_by', 'req.id')
      .leftJoin('users as asg', 'legal_reviews.assigned_to', 'asg.id');

    if (status) query = query.where('legal_reviews.status', status);
    if (classification) query = query.where('legal_reviews.classification', classification);
    if (priority) query = query.where('legal_reviews.priority', priority);
    if (search) query = query.where(function () {
      this.where('legal_reviews.title', 'ilike', `%${search}%`)
        .orWhere('legal_reviews.reference_number', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('legal_reviews.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('legal_reviews.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('legal_reviews')
      .select(
        'legal_reviews.*',
        'req.first_name as requester_first',
        'req.last_name as requester_last',
        'asg.first_name as assignee_first',
        'asg.last_name as assignee_last',
      )
      .leftJoin('users as req', 'legal_reviews.requested_by', 'req.id')
      .leftJoin('users as asg', 'legal_reviews.assigned_to', 'asg.id')
      .where('legal_reviews.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Review not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `LR-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('legal_reviews').insert({
      id: uuid(),
      reference_number: ref,
      ...req.body,
      requested_by: req.user!.userId,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('legal_reviews').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Review not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('legal_reviews').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/compliance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, check_type, search } = req.query;

    let query = db('compliance_checks')
      .select('compliance_checks.*', 'users.first_name as checker_first', 'users.last_name as checker_last')
      .leftJoin('users', 'compliance_checks.checked_by', 'users.id');

    if (status) query = query.where('compliance_checks.status', status);
    if (check_type) query = query.where('compliance_checks.check_type', check_type);
    if (search) query = query.where(function () {
      this.where('compliance_checks.title', 'ilike', `%${search}%`)
        .orWhere('compliance_checks.regulation', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('compliance_checks.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('compliance_checks.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/compliance/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('compliance_checks')
      .select('compliance_checks.*', 'users.first_name as checker_first', 'users.last_name as checker_last')
      .leftJoin('users', 'compliance_checks.checked_by', 'users.id')
      .where('compliance_checks.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Compliance check not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/compliance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('compliance_checks').insert({
      id: uuid(), checked_by: req.user!.userId, ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/compliance/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('compliance_checks').where({ id: req.params.id })
      .update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Compliance check not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/compliance/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('compliance_checks').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
