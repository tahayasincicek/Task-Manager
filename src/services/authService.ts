import bcrypt from 'bcrypt';
import { UserRole, ValidationError } from '../types';

export const SALT_ROUNDS = 10;

const EMAIL_MAX_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;

export function isValidEmail(input: string): boolean {
  if (input.length === 0 || input.length > EMAIL_MAX_LENGTH) return false;
  const at = input.indexOf('@');
  if (at <= 0 || at !== input.lastIndexOf('@')) return false;
  const local = input.slice(0, at);
  const domain = input.slice(at + 1);
  if (local.length === 0 || local.length > LOCAL_MAX_LENGTH) return false;
  if (domain.length === 0) return false;
  for (const ch of input) {
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') return false;
  }
  const dot = domain.indexOf('.');
  if (dot <= 0 || dot === domain.length - 1) return false;
  return true;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export function validateRegisterInput(input: Partial<RegisterInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.username || input.username.trim().length === 0) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (input.username.trim().length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
  } else if (input.username.trim().length > 50) {
    errors.push({ field: 'username', message: 'Username must be at most 50 characters' });
  }

  if (!input.email || input.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(input.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!input.password || input.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (input.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }

  return errors;
}

export function validateLoginInput(input: Partial<LoginInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.username || input.username.trim().length === 0) {
    errors.push({ field: 'username', message: 'Username is required' });
  }
  if (!input.password || input.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function canAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  if (requiredRole === 'user') return true;
  return userRole === 'admin';
}
