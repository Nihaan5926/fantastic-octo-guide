import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';

const router = Router();
router.use(authenticate);

// ─── USERS ───

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { role, active, search } = req.query;

    let query = db('users')
      .select('users.id', 'users.email', 'users.first_name', 'users.last_name', 'users.rank', 'users.clearance', 'users.is_active', 'users.last_login_at', 'users.created_at', 'roles.name as role_name')
      .leftJoin('roles', 'users.role_id', 'roles.id');

    if (role) query = query.where('roles.name', role);
    if (active !== undefined) query = query.where('users.is_active', active === 'true');
    if (search) query = query.where(function () {
      this.where('users.email', 'ilike', `%${search}%`)
        .orWhere('users.first_name', 'ilike', `%${search}%`)
        .orWhere('users.last_name', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('users.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('users.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db('users')
      .select('users.*', 'roles.name as role_name', 'roles.permissions')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where('users.id', req.params.id).first();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { password_hash, ...rest } = user;
    res.json(rest);
  } catch (e) { next(e); }
});

router.post('/users', auditLog('user:create', 'user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, roleName, clearance } = req.body;

    const existing = await db('users').where({ email: email?.toLowerCase() }).first();
    if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

    let roleId;
    if (roleName) {
      const role = await db('roles').where({ name: roleName }).first();
      if (role) roleId = role.id;
    }
    if (!roleId) {
      const defaultRole = await db('roles').where({ name: 'VIEWER' }).first();
      roleId = defaultRole?.id;
    }

    const hash = await bcrypt.hash(password || 'changeme123!', 12);
    const [user] = await db('users').insert({
      id: uuid(), email: email?.toLowerCase(),
      password_hash: hash, first_name: firstName,
      last_name: lastName, role_id: roleId, clearance: clearance || 'UNCLASSIFIED',
    }).returning('*');

    const { password_hash: _, ...rest } = user;
    eventBus.emit('entity:created', {
      entityType: 'user',
      entityId: user.id,
      title: `${user.first_name} ${user.last_name}`.trim() || user.email,
      userId: req.user!.userId,
    });
    res.status(201).json(rest);
  } catch (e) { next(e); }
});

router.put('/users/:id', auditLog('user:update', 'user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const update: any = { ...req.body, updated_at: db.fn.now() };
    delete update.id;
    delete update.email;

    // Map client field names to DB columns
    if (update.firstName) { update.first_name = update.firstName; delete update.firstName; }
    if (update.lastName) { update.last_name = update.lastName; delete update.lastName; }
    if (update.roleName) {
      const role = await db('roles').where({ name: update.roleName }).first();
      if (role) { update.role_id = role.id; }
      delete update.roleName;
    }
    delete update.role_name;
    delete update.permissions;

    if (update.password) {
      update.password_hash = await bcrypt.hash(update.password, 12);
      delete update.password;
    } else {
      delete update.password_hash;
      delete update.password;
    }

    const [user] = await db('users').where({ id: req.params.id }).update(update).returning('*');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { password_hash: _, ...rest } = user;
    eventBus.emit('entity:updated', {
      entityType: 'user',
      entityId: user.id,
      title: `${user.first_name} ${user.last_name}`.trim() || user.email,
      userId: req.user!.userId,
    });
    res.json(rest);
  } catch (e) { next(e); }
});

router.delete('/users/:id', auditLog('user:deactivate', 'user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('users').where({ id: req.params.id }).update({ is_active: false });
    eventBus.emit('entity:deleted', {
      entityType: 'user',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'User deactivated' });
  } catch (e) { next(e); }
});

router.delete('/users/:id/permanent', auditLog('user:delete', 'user'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    await db('users').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'user',
      entityId: req.params.id,
      title: `${user.first_name} ${user.last_name}`.trim() || user.email,
      userId: req.user!.userId,
    });
    res.json({ message: 'User permanently deleted' });
  } catch (e) { next(e); }
});

// ─── ROLES ───

router.get('/roles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await db('roles').select('*').orderBy('name');
    const rolesWithCounts = await Promise.all(roles.map(async (role: any) => {
      const count = await db('users').where({ role_id: role.id }).count('id').first().then((r: any) => parseInt(r.count, 10));
      return { ...role, userCount: count };
    }));
    res.json({ data: rolesWithCounts });
  } catch (e) { next(e); }
});

router.get('/roles/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await db('roles').where({ id: req.params.id }).first();
    if (!role) { res.status(404).json({ error: 'Role not found' }); return; }
    res.json(role);
  } catch (e) { next(e); }
});

router.post('/roles', auditLog('role:create', 'role'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [role] = await db('roles').insert({
      id: uuid(), name: req.body.name, description: req.body.description,
      permissions: JSON.stringify(req.body.permissions || []),
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'role',
      entityId: role.id,
      title: role.name,
      userId: req.user!.userId,
    });
    res.status(201).json(role);
  } catch (e) { next(e); }
});

router.put('/roles/:id', auditLog('role:update', 'role'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const update: any = {};
    if (req.body.name) update.name = req.body.name;
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.permissions) update.permissions = JSON.stringify(req.body.permissions);
    const [role] = await db('roles').where({ id: req.params.id }).update(update).returning('*');
    if (!role) { res.status(404).json({ error: 'Role not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'role',
      entityId: role.id,
      title: role.name,
      userId: req.user!.userId,
    });
    res.json(role);
  } catch (e) { next(e); }
});

router.delete('/roles/:id', auditLog('role:delete', 'role'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usersWithRole = await db('users').where({ role_id: req.params.id }).first();
    if (usersWithRole) { res.status(400).json({ error: 'Cannot delete role assigned to users' }); return; }
    await db('roles').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'role',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Role deleted' });
  } catch (e) { next(e); }
});

// ─── AUDIT LOGS ───

router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const { action, userId, entityType, startDate, endDate } = req.query;

    let query = db('audit_logs')
      .select('audit_logs.*', 'users.email as user_email', 'users.first_name as user_first', 'users.last_name as user_last')
      .leftJoin('users', 'audit_logs.user_id', 'users.id');

    if (action) query = query.where('audit_logs.action', action);
    if (userId) query = query.where('audit_logs.user_id', userId);
    if (entityType) query = query.where('audit_logs.entity_type', entityType);
    if (startDate) query = query.whereRaw("audit_logs.created_at >= ?", [startDate as string]);
    if (endDate) query = query.whereRaw("audit_logs.created_at <= ?", [endDate as string]);

    const [items, total] = await Promise.all([
      query.clone().orderBy('audit_logs.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('audit_logs.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

// ─── STATS ───

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [userCount, roleCount, logCount] = await Promise.all([
      db('users').count('id').first().then((r: any) => parseInt(r.count, 10)),
      db('roles').count('id').first().then((r: any) => parseInt(r.count, 10)),
      db('audit_logs').count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);
    res.json({ users: userCount, roles: roleCount, auditLogs: logCount });
  } catch (e) { next(e); }
});

// ─── USER SESSIONS (admin) ───

router.get('/users/:id/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getSessionsForAdmin } = await import('../auth/service');
    const sessions = await getSessionsForAdmin(req.params.id);
    res.json({ data: sessions });
  } catch (e) { next(e); }
});

router.delete('/users/:userId/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { revokeSession } = await import('../auth/service');
    const result = await revokeSession(req.params.userId, req.params.sessionId);
    res.json(result);
  } catch (e) { next(e); }
});

// ─── HEALTH ───

router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dbStatus = await db.raw('SELECT 1').then(() => 'connected').catch(() => 'disconnected');
    res.json({
      db: dbStatus,
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      modules: 30,
    });
  } catch (e) { next(e); }
});

export default router;
