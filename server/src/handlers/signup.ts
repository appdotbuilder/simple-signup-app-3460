import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignupInput, type SignupResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export const signup = async (input: SignupInput): Promise<SignupResponse> => {
  try {
    // Check if email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      return {
        success: false,
        message: 'Email address is already in use'
      };
    }

    // Hash the password using PBKDF2 with crypto
    const salt = randomBytes(32).toString('hex');
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';
    
    const hash = pbkdf2Sync(input.password, salt, iterations, keylen, digest).toString('hex');
    const password_hash = `${salt}:${hash}`;

    // Insert new user into database
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash
      })
      .returning()
      .execute();

    const newUser = result[0];

    // Return success response with user info (excluding password)
    return {
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at
      }
    };
  } catch (error) {
    console.error('Signup failed:', error);
    return {
      success: false,
      message: 'An error occurred during signup'
    };
  }
};