import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

router.get('/budgets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, fiscal_year, category, search } = req.query;

    let query = db('program_budgets')
      .select('program_budgets.*', 'users.first_name as manager_first', 'users.last_name as manager_last')
      .leftJoin('users', 'program_budgets.manager_id', 'users.id');

    if (status) query = query.where('program_budgets.status', status);
    if (fiscal_year) query = query.where('program_budgets.fiscal_year', fiscal_year);
    if (category) query = query.where('program_budgets.category', category);
    if (search) query = query.where(function () {
      this.where('program_budgets.program_name', 'ilike', `%${search}%`)
        .orWhere('program_budgets.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('program_budgets.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('program_budgets.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/budgets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('program_budgets')
      .select('program_budgets.*', 'users.first_name as manager_first', 'users.last_name as manager_last')
      .leftJoin('users', 'program_budgets.manager_id', 'users.id')
      .where('program_budgets.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Budget not found' }); return; }

    const contracts = await db('contracts')
      .select('contracts.*', 'users.first_name as officer_first', 'users.last_name as officer_last')
      .leftJoin('users', 'contracts.contracting_officer_id', 'users.id')
      .where('contracts.program_id', req.params.id);

    res.json({ ...item, contracts });
  } catch (e) { next(e); }
});

router.post('/budgets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `BGT-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('program_budgets').insert({
      id: uuid(),
      reference_number: ref,
      ...req.body,
      manager_id: req.user!.userId,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'budget',
      entityId: item.id,
      title: item.program_name || item.reference_number || 'New budget',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/budgets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('program_budgets').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Budget not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'budget',
      entityId: item.id,
      title: item.program_name || item.reference_number || 'Updated budget',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/budgets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('program_budgets').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'budget',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Line Items ───────────────────────────────────────────────────────────────

router.get('/budgets/:id/line-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db('budget_line_items')
      .where({ budget_id: req.params.id })
      .orderBy('created_at', 'asc');
    res.json({ data: items });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.json({ data: [] }); return; }
    next(e);
  }
});

router.post('/budgets/:id/line-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, category, amount } = req.body;
    const [item] = await db('budget_line_items').insert({
      id: uuid(),
      budget_id: req.params.id,
      description,
      category,
      amount: amount || 0,
    }).returning('*');
    res.status(201).json(item);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(400).json({ error: 'Budget line items not available. Please run database migrations.' }); return; }
    next(e);
  }
});

router.put('/budgets/:id/line-items/:lid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, category, amount } = req.body;
    const [item] = await db('budget_line_items')
      .where({ id: req.params.lid, budget_id: req.params.id })
      .update({ description, category, amount })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Line item not found' }); return; }
    res.json(item);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(404).json({ error: 'Line item not found' }); return; }
    next(e);
  }
});

router.delete('/budgets/:id/line-items/:lid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('budget_line_items').where({ id: req.params.lid, budget_id: req.params.id }).del();
    res.json({ message: 'Line item deleted' });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.json({ message: 'Line item deleted' }); return; }
    next(e);
  }
});

router.get('/contracts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, contract_type, vendor_name, search } = req.query;

    let query = db('contracts')
      .select(
        'contracts.*',
        'users.first_name as officer_first',
        'users.last_name as officer_last',
        'program_budgets.program_name',
      )
      .leftJoin('users', 'contracts.contracting_officer_id', 'users.id')
      .leftJoin('program_budgets', 'contracts.program_id', 'program_budgets.id');

    if (status) query = query.where('contracts.status', status);
    if (contract_type) query = query.where('contracts.contract_type', contract_type);
    if (vendor_name) query = query.where('contracts.vendor_name', 'ilike', `%${vendor_name}%`);
    if (search) query = query.where(function () {
      this.where('contracts.description', 'ilike', `%${search}%`)
        .orWhere('contracts.vendor_name', 'ilike', `%${search}%`)
        .orWhere('contracts.reference_number', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('contracts.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('contracts.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/contracts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('contracts')
      .select(
        'contracts.*',
        'users.first_name as officer_first',
        'users.last_name as officer_last',
        'program_budgets.program_name',
      )
      .leftJoin('users', 'contracts.contracting_officer_id', 'users.id')
      .leftJoin('program_budgets', 'contracts.program_id', 'program_budgets.id')
      .where('contracts.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Contract not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/contracts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `CTR-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('contracts').insert({
      id: uuid(),
      reference_number: ref,
      ...req.body,
      contracting_officer_id: req.user!.userId,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'contract',
      entityId: item.id,
      title: item.reference_number || item.vendor_name || 'New contract',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/contracts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('contracts').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Contract not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'contract',
      entityId: item.id,
      title: item.reference_number || item.vendor_name || 'Updated contract',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/contracts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('contracts').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'contract',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
