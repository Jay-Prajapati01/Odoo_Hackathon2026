import { signupSchema, changePasswordSchema, resetPasswordSchema } from '../../src/modules/auth/validators/auth.validator';

describe('Authentication validators', () => {
  it('rejects weak passwords (too short, no special char)', () => {
    const result = signupSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects passwords missing uppercase/number/special', () => {
    const result = signupSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'passwordonly',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a strong password', () => {
    const result = signupSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Str0ng@Pass',
    });
    expect(result.success).toBe(true);
  });

  it('ignores role selection in signup (always Employee)', () => {
    const result = signupSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Str0ng@Pass',
      role: 'Admin',
    });
    expect(result.success).toBe(true);
    // role is stripped and never influences registration
    expect(result.success && !('role' in (result.data as Record<string, unknown>))).toBe(true);
  });

  it('requires matching new/confirm password on change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Old@1234',
      newPassword: 'New@1234',
      confirmPassword: 'Different@1',
    });
    expect(result.success).toBe(false);
  });

  it('requires matching token password on reset', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc',
      password: 'New@1234',
      confirmPassword: 'New@9999',
    });
    expect(result.success).toBe(false);
  });
});
