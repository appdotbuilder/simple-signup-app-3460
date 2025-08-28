import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignupInput } from '../schema';
import { signup } from '../handlers/signup';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync } from 'crypto';

// Helper function to verify password hash
const verifyPassword = (password: string, storedHash: string): boolean => {
  const [salt, hash] = storedHash.split(':');
  const iterations = 100000;
  const keylen = 64;
  const digest = 'sha512';
  
  const verifyHash = pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  return hash === verifyHash;
};

// Test input
const testInput: SignupInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  confirmPassword: 'securepassword123'
};

describe('signup', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user successfully', async () => {
    const result = await signup(testInput);

    // Verify response structure
    expect(result.success).toBe(true);
    expect(result.message).toEqual('User created successfully');
    expect(result.user).toBeDefined();
    expect(result.user?.email).toEqual('test@example.com');
    expect(result.user?.id).toBeDefined();
    expect(result.user?.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database with hashed password', async () => {
    const result = await signup(testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user!.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('securepassword123'); // Password should be hashed
    expect(savedUser.created_at).toBeInstanceOf(Date);

    // Verify password was properly hashed
    const isValidPassword = verifyPassword('securepassword123', savedUser.password_hash);
    expect(isValidPassword).toBe(true);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await signup(testInput);

    // Try to create second user with same email
    const duplicateInput: SignupInput = {
      email: 'test@example.com',
      password: 'differentpassword456',
      confirmPassword: 'differentpassword456'
    };

    const result = await signup(duplicateInput);

    // Should return error response
    expect(result.success).toBe(false);
    expect(result.message).toEqual('Email address is already in use');
    expect(result.user).toBeUndefined();

    // Verify only one user exists in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users).toHaveLength(1);
  });

  it('should handle different email formats correctly', async () => {
    const emailVariations = [
      'user@domain.com',
      'user.name@domain.com',
      'user+tag@domain.com',
      'USER@DOMAIN.COM'
    ];

    for (const email of emailVariations) {
      const input: SignupInput = {
        email: email,
        password: 'password123',
        confirmPassword: 'password123'
      };

      const result = await signup(input);
      
      expect(result.success).toBe(true);
      expect(result.user?.email).toEqual(email);
    }

    // Verify all users were created
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(4);
  });

  it('should use proper password hashing with PBKDF2', async () => {
    const result = await signup(testInput);

    // Get the saved user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user!.id))
      .execute();

    const savedUser = users[0];

    // Verify hash format (salt:hash format)
    expect(savedUser.password_hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
    expect(savedUser.password_hash.split(':')).toHaveLength(2);
    
    // Verify password can be validated
    const isValid = verifyPassword('securepassword123', savedUser.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = verifyPassword('wrongpassword', savedUser.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should handle case-sensitive email uniqueness', async () => {
    // Create user with lowercase email
    await signup({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    });

    // Try to create user with uppercase email
    const result = await signup({
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
      confirmPassword: 'password123'
    });

    // Should succeed as emails are case-sensitive in this implementation
    expect(result.success).toBe(true);

    // Verify both users exist
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.email)).toContain('test@example.com');
    expect(allUsers.map(u => u.email)).toContain('TEST@EXAMPLE.COM');
  });
});