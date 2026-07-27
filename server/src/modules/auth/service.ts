import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { generateSecret as genSecret, generateURI, verifySync } from 'otplib';
import { db } from '../../db/knex';
import { config } from '../../config';
import { AppError } from '../../middleware/error-handler';
import type { JwtPayload } from '../../middleware/auth';
import type { RegisterInput, LoginInput } from './validator';
import { logger } from '../../utils/logger';

function isSchemaError(e: any): boolean {
  return e?.message?.includes('does not exist') || false;
}

async function ensureTables() {
  try {
    if (!await db.schema.hasTable('user_sessions')) {
      await db.schema.createTable('user_sessions', (t: any) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        t.string('token_hash', 500);
        t.string('ip_address', 50);
        t.text('user_agent');
        t.timestamp('created_at').defaultTo(db.fn.now());
        t.timestamp('expires_at');
        t.boolean('is_active').defaultTo(true);
      });
      logger.info('[Auth] Created user_sessions table');
    }
    if (!await db.schema.hasTable('password_reset_tokens')) {
      await db.schema.createTable('password_reset_tokens', (t: any) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        t.string('token', 500).unique();
        t.timestamp('expires_at').notNullable();
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      logger.info('[Auth] Created password_reset_tokens table');
    }
    if (!await db.schema.hasTable('login_history')) {
      await db.schema.createTable('login_history', (t: any) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        t.string('ip_address', 50);
        t.text('user_agent');
        t.boolean('success').defaultTo(true);
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      logger.info('[Auth] Created login_history table');
    }
    const hasCol = await db.schema.hasColumn('users', 'failed_login_attempts');
    if (!hasCol) {
      await db.schema.alterTable('users', (t: any) => {
        t.integer('failed_login_attempts').defaultTo(0);
        t.timestamp('locked_until').nullable();
        t.string('totp_secret').nullable();
        t.boolean('totp_enabled').defaultTo(false);
        t.boolean('totp_verified').defaultTo(false);
        t.string('avatar_url', 1000).nullable();
      });
      logger.info('[Auth] Added missing columns to users table');
    }
  } catch(e: any) {
    logger.warn('[Auth] Could not auto-create tables:', e);
  }
}

function generateTokens(payload: { userId: string; email: string; role: string; clearance: string }) {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires as any,
  });

  const refreshToken = jwt.sign({ id: uuid() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires as any,
  });

  return { accessToken, refreshToken };
}

async function createSession(userId: string, accessToken: string, ip?: string, userAgent?: string) {
  await ensureTables();
  try {
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    await db('user_sessions').insert({
      id: uuid(),
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ip || null,
      user_agent: userAgent || null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
      is_active: true,
    });
  } catch (e: any) {
    if (isSchemaError(e)) {
      logger.warn('user_sessions table not available — skipping session creation');
      return;
    }
    throw e;
  }
}

export async function register(input: RegisterInput) {
  const existing = await db('users').where({ email: input.email.toLowerCase() }).first();
  if (existing) throw new AppError(409, 'Email already registered');

  const defaultRole = await db('roles').where({ name: 'VIEWER' }).first();
  if (!defaultRole) throw new AppError(500, 'Default role not found');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const userId = uuid();

  await db('users').insert({
    id: userId,
    email: input.email.toLowerCase(),
    password_hash: passwordHash,
    first_name: input.firstName,
    last_name: input.lastName,
    rank: input.rank || null,
    clearance: input.clearance || 'UNCLASSIFIED',
    role_id: defaultRole.id,
    is_active: true,
  });

  const tokens = generateTokens({
    userId,
    email: input.email.toLowerCase(),
    role: 'VIEWER',
    clearance: input.clearance || 'UNCLASSIFIED',
  });

  await db('refresh_tokens').insert({
    user_id: userId,
    token: tokens.refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { user: { id: userId, email: input.email.toLowerCase(), role: 'VIEWER' }, ...tokens };
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

async function recordLoginHistory(userId: string | null, ip: string, userAgent: string, success: boolean) {
  try {
    await db('login_history').insert({
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      success,
    });
  } catch (e: any) {
    if (isSchemaError(e)) return;
    throw e;
  }
}

export async function login(input: LoginInput, ip?: string, userAgent?: string) {
  await ensureTables();
  const user = await db('users')
    .select('users.*', 'roles.name as role_name')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .where({ 'users.email': input.email.toLowerCase() })
    .first();

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    await recordLoginHistory(user.id, ip || '', userAgent || '', false);
    throw new AppError(423, 'Account is locked due to multiple failed login attempts. Please try again later.');
  }

  if (!user) {
    await recordLoginHistory(null, ip || '', userAgent || '', false);
    throw new AppError(401, 'Invalid credentials');
  }
  if (!user.is_active) {
    await recordLoginHistory(user.id, ip || '', userAgent || '', false);
    throw new AppError(403, 'Account is disabled');
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    try {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const updateData: any = { failed_login_attempts: newAttempts };
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }
      await db('users').where({ id: user.id }).update(updateData);
    } catch (e: any) {
      if (!isSchemaError(e)) throw e;
    }
    await recordLoginHistory(user.id, ip || '', userAgent || '', false);
    throw new AppError(401, 'Invalid credentials');
  }

  try {
    await db('users').where({ id: user.id }).update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: db.fn.now(),
    });
  } catch (e: any) {
    if (!isSchemaError(e)) throw e;
  }

  if (user.totp_enabled) {
    const tempToken = jwt.sign(
      { userId: user.id, type: '2fa_temp' },
      config.jwt.accessSecret,
      { expiresIn: '5m' },
    );
    await recordLoginHistory(user.id, ip || '', userAgent || '', true);
    return { requires2FA: true, tempToken };
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role_name,
    clearance: user.clearance,
  });

  await createSession(user.id, tokens.accessToken, ip, userAgent);

  await db('refresh_tokens').insert({
    user_id: user.id,
    token: tokens.refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await recordLoginHistory(user.id, ip || '', userAgent || '', true);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      rank: user.rank,
      clearance: user.clearance,
      role: user.role_name,
    },
    ...tokens,
  };
}

export async function completeLogin2fa(tempToken: string, totpCode: string, ip?: string, userAgent?: string) {
  let payload: any;
  try {
    payload = jwt.verify(tempToken, config.jwt.accessSecret);
  } catch {
    throw new AppError(401, 'Invalid or expired temporary token');
  }

  if (payload.type !== '2fa_temp') {
    throw new AppError(401, 'Invalid temporary token');
  }

  const user = await db('users')
    .select('users.*', 'roles.name as role_name')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .where({ 'users.id': payload.userId })
    .first();

  if (!user || !user.is_active) throw new AppError(403, 'Account unavailable');
  if (!user.totp_enabled || !user.totp_secret) throw new AppError(400, '2FA not configured');

  const validTotpResult = verifySync({ secret: user.totp_secret, token: totpCode });
  if (!validTotpResult.valid) throw new AppError(401, 'Invalid 2FA code');

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role_name,
    clearance: user.clearance,
  });

  await createSession(user.id, tokens.accessToken, ip, userAgent);

  await db('refresh_tokens').insert({
    user_id: user.id,
    token: tokens.refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now() });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      rank: user.rank,
      clearance: user.clearance,
      role: user.role_name,
    },
    ...tokens,
  };
}

export async function refreshToken(token: string) {
  try {
    jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await db('refresh_tokens').where({ token }).first();
  if (!stored) throw new AppError(401, 'Refresh token not found');
  if (new Date(stored.expires_at) < new Date()) {
    await db('refresh_tokens').where({ id: stored.id }).del();
    throw new AppError(401, 'Refresh token expired');
  }

  const user = await db('users')
    .select('users.*', 'roles.name as role_name')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .where({ 'users.id': stored.user_id })
    .first();

  if (!user || !user.is_active) throw new AppError(403, 'Account unavailable');

  await db('refresh_tokens').where({ id: stored.id }).del();

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role_name,
    clearance: user.clearance,
  });

  await db('refresh_tokens').insert({
    user_id: user.id,
    token: tokens.refreshToken,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      rank: user.rank,
      clearance: user.clearance,
      role: user.role_name,
    },
    ...tokens,
  };
}

export async function getProfile(userId: string) {
  const user = await db('users')
    .select('users.*', 'roles.name as role_name', 'roles.permissions')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .where('users.id', userId)
    .first();

  if (!user) throw new AppError(404, 'User not found');

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    rank: user.rank,
    clearance: user.clearance,
    role: user.role_name,
    permissions: user.permissions,
    metadata: user.metadata || {},
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    totpEnabled: user.totp_enabled || false,
    avatarUrl: user.avatar_url || null,
  };
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string; rank?: string; clearance?: string; password?: string; metadata?: Record<string, any> }): Promise<any> {
  const updateData: any = { updated_at: db.fn.now() };

  if (data.firstName !== undefined) updateData.first_name = data.firstName;
  if (data.lastName !== undefined) updateData.last_name = data.lastName;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase();
  if (data.rank !== undefined) updateData.rank = data.rank;
  if (data.clearance !== undefined) updateData.clearance = data.clearance;
  if (data.password !== undefined) {
    updateData.password_hash = await bcrypt.hash(data.password, 12);
  }
  if (data.metadata !== undefined) {
    updateData.metadata = data.metadata;
  }

  const [user] = await db('users').where({ id: userId }).update(updateData).returning('*');
  if (!user) throw new AppError(404, 'User not found');

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    rank: user.rank,
    clearance: user.clearance,
    metadata: user.metadata || {},
  };
}

export async function logout(token: string, userId?: string) {
  if (token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db('user_sessions').where({ token_hash: tokenHash }).update({ is_active: false });
    } catch (e: any) {
      if (!isSchemaError(e)) throw e;
    }
  }
  if (userId) {
    const stored = await db('refresh_tokens').where({ user_id: userId }).first();
    if (stored) {
      await db('refresh_tokens').where({ token: stored.token }).del();
    }
  }
  await db('refresh_tokens').where({ token }).del();
}

// ─── TOTP / Two-Factor ───

export async function setupTOTP(userId: string) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError(404, 'User not found');

  if (user.totp_enabled && user.totp_verified) {
    throw new AppError(400, '2FA is already enabled');
  }

  const secret = genSecret();
  const otpauthUrl = generateURI({ secret, label: user.email, issuer: 'IntelPlatform' });

  try {
    await db('users').where({ id: userId }).update({
      totp_secret: secret,
      totp_verified: false,
    });
  } catch (e: any) {
    if (isSchemaError(e)) {
      throw new AppError(500, 'TOTP columns not available. Please run database migrations.');
    }
    throw e;
  }

  return { secret, otpauthUrl };
}

export async function enableTOTP(userId: string, token: string) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError(404, 'User not found');
  if (!user.totp_secret) throw new AppError(400, 'TOTP not set up. Call /2fa/setup first.');

  const result = verifySync({ secret: user.totp_secret, token });
  if (!result.valid) throw new AppError(400, 'Invalid verification code');

  try {
    await db('users').where({ id: userId }).update({
      totp_verified: true,
      totp_enabled: true,
    });
  } catch (e: any) {
    if (isSchemaError(e)) {
      throw new AppError(500, 'TOTP columns not available. Please run database migrations.');
    }
    throw e;
  }

  return { message: '2FA enabled successfully' };
}

export async function disableTOTP(userId: string) {
  try {
    await db('users').where({ id: userId }).update({
      totp_secret: null,
      totp_enabled: false,
      totp_verified: false,
    });
  } catch (e: any) {
    if (isSchemaError(e)) {
      logger.warn('TOTP columns not available — skipping disable');
      return { message: '2FA disabled' };
    }
    throw e;
  }

  return { message: '2FA disabled' };
}

export async function verifyTOTP(userId: string, token: string) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError(404, 'User not found');
  if (!user.totp_secret) throw new AppError(400, 'TOTP not configured');

  const result = verifySync({ secret: user.totp_secret, token });
  return { valid: result.valid };
}

// ─── Session Management ───

export async function getActiveSessions(userId: string, currentToken?: string) {
  await ensureTables();
  try {
    let currentHash: string | null = null;
    if (currentToken) {
      currentHash = crypto.createHash('sha256').update(currentToken).digest('hex');
    }

    const sessions = await db('user_sessions')
      .where({ user_id: userId, is_active: true })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc');

    return sessions.map((s: any) => ({
      id: s.id,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_current: currentHash ? s.token_hash === currentHash : false,
    }));
  } catch (e: any) {
    if (isSchemaError(e)) return [];
    throw e;
  }
}

export async function revokeSession(userId: string, sessionId: string) {
  try {
    const session = await db('user_sessions')
      .where({ id: sessionId, user_id: userId })
      .first();
    if (!session) throw new AppError(404, 'Session not found');

    await db('user_sessions').where({ id: sessionId }).update({ is_active: false });
    return { message: 'Session revoked' };
  } catch (e: any) {
    if (isSchemaError(e)) throw new AppError(404, 'Session not found');
    throw e;
  }
}

export async function revokeOtherSessions(userId: string, currentToken: string) {
  try {
    const currentHash = crypto.createHash('sha256').update(currentToken).digest('hex');

    await db('user_sessions')
      .where({ user_id: userId, is_active: true })
      .whereNot({ token_hash: currentHash })
      .update({ is_active: false });

    return { message: 'All other sessions revoked' };
  } catch (e: any) {
    if (isSchemaError(e)) return { message: 'All other sessions revoked' };
    throw e;
  }
}

// ─── Admin session management ───

export async function getSessionsForAdmin(userId: string) {
  try {
    const sessions = await db('user_sessions')
      .where({ user_id: userId, is_active: true })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc');

    return sessions.map((s: any) => ({
      id: s.id,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      created_at: s.created_at,
      expires_at: s.expires_at,
      is_current: false,
    }));
  } catch (e: any) {
    if (isSchemaError(e)) return [];
    throw e;
  }
}

export async function generateResetToken(email: string) {
  await ensureTables();
  const user = await db('users').where({ email: email.toLowerCase() }).first();
  if (!user) return;

  try {
    await db('password_reset_tokens').where({ user_id: user.id }).del();

    const token = uuid();
    await db('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });

    return token;
  } catch (e: any) {
    if (isSchemaError(e)) {
      logger.warn('password_reset_tokens table not available');
      return;
    }
    throw e;
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const record = await db('password_reset_tokens').where({ token }).first();
    if (!record) throw new AppError(400, 'Invalid or expired reset token');
    if (new Date(record.expires_at) < new Date()) {
      await db('password_reset_tokens').where({ id: record.id }).del();
      throw new AppError(400, 'Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db('users').where({ id: record.user_id }).update({
      password_hash: passwordHash,
      updated_at: db.fn.now(),
    });

    try {
      await db('users').where({ id: record.user_id }).update({
        failed_login_attempts: 0,
        locked_until: null,
      });
    } catch (e: any) {
      if (!isSchemaError(e)) throw e;
    }

    await db('password_reset_tokens').where({ id: record.id }).del();
  } catch (e: any) {
    if (isSchemaError(e)) throw new AppError(400, 'Password reset is currently unavailable. Please contact an administrator.');
    throw e;
  }
}

export async function getLoginHistory(userId: string) {
  try {
    const history = await db('login_history')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(20)
      .select('id', 'ip_address', 'user_agent', 'success', 'created_at');

    return history.map((entry) => ({
      id: entry.id,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
      success: entry.success,
      createdAt: entry.created_at,
    }));
  } catch (e: any) {
    if (isSchemaError(e)) return [];
    throw e;
  }
}

export async function getUserActivity(userId: string) {
  const auditRows = await db('audit_logs')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(50)
    .select('id', 'action', 'entity_type', 'entity_id', 'changes', 'created_at');

  const feedRows = await db('activity_feed')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(50)
    .select('id', 'action', 'entity_type', 'entity_id', 'changes', 'created_at');

  const merged = [
    ...auditRows.map((r) => ({ ...r, source: 'audit' as const })),
    ...feedRows.map((r) => ({ ...r, source: 'feed' as const })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  return merged.map((entry) => ({
    id: entry.id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    changes: entry.changes,
    source: entry.source,
    createdAt: entry.created_at,
  }));
}

export async function deleteAccount(userId: string, password: string) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError(401, 'Invalid password');

  await db('users').where({ id: userId }).update({
    email: `deleted-${userId.slice(0, 8)}@anonymized.local`,
    password_hash: '',
    first_name: 'Deleted',
    last_name: 'User',
    rank: null,
    is_active: false,
    metadata: JSON.stringify({ deletedAt: new Date().toISOString(), reason: 'user_requested' }),
    avatar_url: null,
  });

  try {
    await db('user_sessions').where({ user_id: userId }).del();
  } catch (e: any) {
    if (!isSchemaError(e)) throw e;
  }
  await db('refresh_tokens').where({ user_id: userId }).del();
}

export async function exportUserData(userId: string) {
  const user = await db('users')
    .select('id', 'email', 'first_name', 'last_name', 'rank', 'clearance', 'metadata', 'last_login_at', 'created_at')
    .where({ id: userId })
    .first();

  const tableQueries: Array<{ key: string; query: () => Promise<any[]> }> = [
    { key: 'reports', query: () => db('reports').where('author_id', userId).select('*') },
    { key: 'cases', query: () => db('cases').where('author_id', userId).select('*') },
    { key: 'evidence', query: () => db('evidence').where('author_id', userId).select('*') },
    { key: 'comments', query: () => db('entity_comments').where('author_id', userId).select('*') },
    { key: 'attachments', query: () => db('entity_attachments').where('uploaded_by', userId).select('*') },
    { key: 'activity', query: () => db('activity_feed').where('user_id', userId).select('*') },
  ];

  const data: Record<string, any> = { user };

  for (const tq of tableQueries) {
    data[tq.key] = await tq.query();
  }

  return { exportedAt: new Date().toISOString(), userId, ...data };
}
