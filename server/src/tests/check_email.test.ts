import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CheckEmailInput } from '../schema';
import { checkEmailAvailability } from '../handlers/check_email';

// Test inputs
const availableEmailInput: CheckEmailInput = {
  email: 'available@example.com'
};

const unavailableEmailInput: CheckEmailInput = {
  email: 'taken@example.com'
};

describe('checkEmailAvailability', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return available true for new email', async () => {
    const result = await checkEmailAvailability(availableEmailInput);

    expect(result.available).toBe(true);
    expect(result.message).toBe('Email is available');
  });

  it('should return available false for existing email', async () => {
    // First, create a user with the email
    await db.insert(usersTable)
      .values({
        email: unavailableEmailInput.email,
        password_hash: 'hashed_password'
      })
      .execute();

    const result = await checkEmailAvailability(unavailableEmailInput);

    expect(result.available).toBe(false);
    expect(result.message).toBe('Email is already registered');
  });

  it('should handle case sensitivity correctly', async () => {
    // Create user with lowercase email
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .execute();

    // Check uppercase version - should be treated as different
    const uppercaseResult = await checkEmailAvailability({
      email: 'TEST@EXAMPLE.COM'
    });

    expect(uppercaseResult.available).toBe(true);
    expect(uppercaseResult.message).toBe('Email is available');

    // Check exact match - should be unavailable
    const exactResult = await checkEmailAvailability({
      email: 'test@example.com'
    });

    expect(exactResult.available).toBe(false);
    expect(exactResult.message).toBe('Email is already registered');
  });

  it('should handle special characters in email', async () => {
    const specialEmailInput: CheckEmailInput = {
      email: 'user+test@example.com'
    };

    // First check - should be available
    const firstResult = await checkEmailAvailability(specialEmailInput);
    expect(firstResult.available).toBe(true);

    // Create user with special character email
    await db.insert(usersTable)
      .values({
        email: specialEmailInput.email,
        password_hash: 'hashed_password'
      })
      .execute();

    // Second check - should be unavailable
    const secondResult = await checkEmailAvailability(specialEmailInput);
    expect(secondResult.available).toBe(false);
    expect(secondResult.message).toBe('Email is already registered');
  });

  it('should verify database state after checking available email', async () => {
    await checkEmailAvailability(availableEmailInput);

    // Verify that checking availability doesn't create any user records
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(0);
  });

  it('should verify database state after checking unavailable email', async () => {
    // Create initial user
    await db.insert(usersTable)
      .values({
        email: unavailableEmailInput.email,
        password_hash: 'hashed_password'
      })
      .execute();

    await checkEmailAvailability(unavailableEmailInput);

    // Verify that checking availability doesn't modify existing records
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(1);
    expect(allUsers[0].email).toBe(unavailableEmailInput.email);
    expect(allUsers[0].password_hash).toBe('hashed_password');
  });
});