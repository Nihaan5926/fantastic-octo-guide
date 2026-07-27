import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  rank: z.string().max(100).optional().nullable(),
  clearance: z.string().max(50).optional().default('UNCLASSIFIED'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const totpTokenSchema = z.object({
  token: z.string().length(6),
});

export const login2faSchema = z.object({
  tempToken: z.string().min(1),
  totpCode: z.string().length(6),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TotpTokenInput = z.infer<typeof totpTokenSchema>;
export type Login2faInput = z.infer<typeof login2faSchema>;
