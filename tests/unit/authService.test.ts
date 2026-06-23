import { describe, it, expect } from 'vitest';
import {
  validateRegisterInput,
  validateLoginInput,
  isAdmin,
  canAccess,
} from '../../src/services/authService';

describe('Auth Validation', () => {
  it('1. validateRegisterInput: all empty → multiple errors', () => {
    const errors = validateRegisterInput({});
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('2. validateRegisterInput: invalid email format → error', () => {
    const errors = validateRegisterInput({ username: 'user', email: 'not-an-email', password: '123456' });
    expect(errors.some(e => e.field === 'email')).toBe(true);
  });

  it('3. validateRegisterInput: short password → error', () => {
    const errors = validateRegisterInput({ username: 'user', email: 'a@b.com', password: '123' });
    expect(errors.some(e => e.field === 'password')).toBe(true);
  });

  it('4. validateRegisterInput: valid input → no errors', () => {
    const errors = validateRegisterInput({ username: 'validuser', email: 'valid@email.com', password: 'securepass' });
    expect(errors.length).toBe(0);
  });

  it('5. validateLoginInput: empty fields → errors', () => {
    const errors = validateLoginInput({});
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('6. isAdmin: returns true for admin role', () => {
    expect(isAdmin('admin')).toBe(true);
  });

  it('7. isAdmin: returns false for user role', () => {
    expect(isAdmin('user')).toBe(false);
  });

  it('8. canAccess: user can access user-level endpoints', () => {
    expect(canAccess('user', 'user')).toBe(true);
  });

  it('9. canAccess: user cannot access admin-only endpoints', () => {
    expect(canAccess('user', 'admin')).toBe(false);
  });

  it('10. canAccess: admin can access admin-only endpoints', () => {
    expect(canAccess('admin', 'admin')).toBe(true);
  });
});
