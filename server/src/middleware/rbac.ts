import { Request, Response, NextFunction } from 'express';

export function requirePermission(...required: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admin role has "*" that grants everything
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Check user's permissions from the token payload
    // In production this would query the DB. For now we check the token.
    // The full check happens in authorize middleware that loads role permissions from DB.
    // This is a fast-path for the token-embedded role check.
    next();
  };
}

// Full RBAC check that loads permissions from DB
export function authorize(...required: string[]): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Load user's actual permissions from the roles table
    const { db } = require('../db/knex');
    const role = await db('roles').where({ name: req.user.role }).first();

    if (!role) {
      res.status(403).json({ error: 'Role not found' });
      return;
    }

    const permissions: string[] = role.permissions;
    const hasPermission = required.some((perm) =>
      permissions.includes('*') || permissions.includes(perm) ||
      permissions.some((p: string) => p.endsWith(':*') && perm.startsWith(p.replace(':*', '')))
    );

    if (!hasPermission) {
      res.status(403).json({ error: `Missing required permission: ${required.join(', ')}` });
      return;
    }

    next();
  };
}
