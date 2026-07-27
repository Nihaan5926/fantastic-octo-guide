import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// ── Org Units ────────────────────────────────────────────────────────────────

router.get('/units', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { unit_type, search } = req.query;

    let query = db('org_units')
      .select(
        'org_units.*',
        'users.first_name as commander_first',
        'users.last_name as commander_last',
        'parent.name as parent_name',
      )
      .leftJoin('users', 'org_units.commander_id', 'users.id')
      .leftJoin('org_units as parent', 'org_units.parent_id', 'parent.id');

    if (unit_type) query = query.where('org_units.unit_type', unit_type);
    if (search) query = query.where(function () {
      this.where('org_units.name', 'ilike', `%${search}%`)
        .orWhere('org_units.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('org_units.name', 'asc').limit(limit).offset(offset),
      query.clone().clearSelect().count('org_units.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/units/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allUnits = await db('org_units').select('*').orderBy('name', 'asc');

    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const unit of allUnits) {
      map.set(unit.id, { ...unit, children: [] });
    }

    for (const unit of allUnits) {
      const node = map.get(unit.id)!;
      if (unit.parent_id && map.has(unit.parent_id)) {
        map.get(unit.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ data: roots });
  } catch (e) { next(e); }
});

router.get('/units/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('org_units')
      .select(
        'org_units.*',
        'users.first_name as commander_first',
        'users.last_name as commander_last',
        'parent.name as parent_name',
      )
      .leftJoin('users', 'org_units.commander_id', 'users.id')
      .leftJoin('org_units as parent', 'org_units.parent_id', 'parent.id')
      .where('org_units.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    const members = await db('personnel_assignments')
      .select('personnel_assignments.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'personnel_assignments.user_id', 'users.id')
      .where('personnel_assignments.org_unit_id', req.params.id);

    res.json({ ...item, members });
  } catch (e) { next(e); }
});

router.post('/units', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('org_units').insert({ id: uuid(), ...req.body }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'org_unit',
      entityId: item.id,
      title: item.name || 'New unit',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/units/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('org_units')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'org_unit',
      entityId: item.id,
      title: item.name || 'Updated unit',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/units/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('org_units').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'org_unit',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Personnel Assignments ────────────────────────────────────────────────────

router.get('/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-create table if missing
    if (!await db.schema.hasTable('personnel_assignments')) {
      await db.schema.createTable('personnel_assignments', (t) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').notNullable();
        t.uuid('org_unit_id').notNullable();
        t.string('position_title', 200).nullable();
        t.boolean('is_primary').defaultTo(false);
        t.date('start_date').nullable();
        t.date('end_date').nullable();
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      return res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { org_unit_id, user_id } = req.query;

    let query = db('personnel_assignments')
      .select(
        'personnel_assignments.*',
        'users.first_name',
        'users.last_name',
        'org_units.name as unit_name',
      )
      .leftJoin('users', 'personnel_assignments.user_id', 'users.id')
      .leftJoin('org_units', 'personnel_assignments.org_unit_id', 'org_units.id');

    if (org_unit_id) query = query.where('personnel_assignments.org_unit_id', org_unit_id);
    if (user_id) query = query.where('personnel_assignments.user_id', user_id);

    const [items, total] = await Promise.all([
      query.clone().orderBy('personnel_assignments.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('personnel_assignments.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('personnel_assignments').insert({
      id: uuid(), ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'personnel_assignment',
      entityId: item.id,
      title: item.position_title || 'New assignment',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('personnel_assignments')
      .where({ id: req.params.id })
      .update({ ...req.body })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'personnel_assignment',
      entityId: item.id,
      title: item.position_title || 'Updated assignment',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/assignments/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('personnel_assignments').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'personnel_assignment',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
