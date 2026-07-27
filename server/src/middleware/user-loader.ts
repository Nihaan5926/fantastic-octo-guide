import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';

export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }
  try {
    const userRecord = await db('users')
      .select('users.*', 'roles.name as role_name', 'roles.permissions')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where('users.id', req.user.userId)
      .first();

    if (userRecord) {
      req.user = {
        userId: userRecord.id,
        email: userRecord.email,
        role: userRecord.role_name,
        clearance: userRecord.clearance,
      };
    }
  } catch {
    // continue without enrichment
  }
  next();
}
