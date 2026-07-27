import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { db } from '../../db/knex';
import { config } from '../../config';
import { AppError } from '../../middleware/error-handler';
import type { JwtPayload } from '../../middleware/auth';
import type { RegisterInput, LoginInput } from './validator';

function generateTokens(payload: { userId: string; email: string; role: string; clearance: string }) {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires as any,
  });

  const refreshToken = jwt.sign({ id: uuid() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires as any,
  });

  return { accessToken, refreshToken };
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

export async function login(input: LoginInput) {
  const user = await db('users')
    .select('users.*', 'roles.name as role_name')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .where({ 'users.email': input.email.toLowerCase() })
    .first();

  if (!user) throw new AppError(401, 'Invalid credentials');
  if (!user.is_active) throw new AppError(403, 'Account is disabled');

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

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

export async function logout(token: string) {
  await db('refresh_tokens').where({ token }).del();
}
