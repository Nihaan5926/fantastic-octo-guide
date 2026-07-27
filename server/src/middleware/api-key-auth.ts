import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/knex';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    next();
    return;
  }

  try {
    const keyHash = hashKey(apiKey);
    const keyRecord = await db('api_keys')
      .select('api_keys.*', 'users.email', 'users.first_name', 'users.last_name', 'roles.name as role_name')
      .leftJoin('users', 'api_keys.user_id', 'users.id')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where({ key_hash: keyHash, is_active: true })
      .where(function () {
        this.whereNull('api_keys.expires_at').orWhere('api_keys.expires_at', '>=', db.fn.now());
      })
      .first();

    if (!keyRecord) {
      res.status(401).json({ error: 'Invalid or expired API key' });
      return;
    }

    await db('api_keys').where({ id: keyRecord.id }).update({ last_used_at: db.fn.now() });

    req.user = {
      userId: keyRecord.user_id,
      email: keyRecord.email,
      role: keyRecord.role_name,
      clearance: keyRecord.clearance || 'UNCLASSIFIED',
    };

    next();
  } catch (e: any) {
    next(e);
  }
}
