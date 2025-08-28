import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CheckEmailInput, type CheckEmailResponse } from '../schema';

export async function checkEmailAvailability(input: CheckEmailInput): Promise<CheckEmailResponse> {
  try {
    // Query the database to check if email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    // If user exists, email is not available
    if (existingUser.length > 0) {
      return {
        available: false,
        message: 'Email is already registered'
      };
    }

    // Email is available for registration
    return {
      available: true,
      message: 'Email is available'
    };
  } catch (error) {
    console.error('Email availability check failed:', error);
    throw error;
  }
}