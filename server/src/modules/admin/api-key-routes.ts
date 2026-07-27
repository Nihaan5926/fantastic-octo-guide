import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { db } from '../../db/knex';

const router = Router();

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

router.get('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    let query = db('api_keys').select('id', 'name', 'scopes', 'last_used_at', 'expires_at', 'is_active', 'created_at');
    if (!isAdmin) {
      query = query.where('user_id', req.user!.userId);
    }

    const keys = await query.orderBy('created_at', 'desc');
    res.json({ data: keys });
  } catch (e) { next(e); }
});

router.post('/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, scopes, expiresAt } = req.body;
    const rawKey = `ik_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = hashKey(rawKey);

    await db('api_keys').insert({
      id: uuid(),
      user_id: req.user!.userId,
      name: name || 'API Key',
      key_hash: keyHash,
      scopes: scopes || [],
      expires_at: expiresAt || null,
      is_active: true,
    });

    res.status(201).json({ key: rawKey, name: name || 'API Key', scopes: scopes || [] });
  } catch (e) { next(e); }
});

router.delete('/api-keys/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    let query = db('api_keys').where({ id: req.params.id });
    if (!isAdmin) {
      query = query.where({ user_id: req.user!.userId });
    }
    const deleted = await query.del();
    if (!deleted) { res.status(404).json({ error: 'API key not found' }); return; }
    res.json({ message: 'API key revoked' });
  } catch (e) { next(e); }
});

export default router;
