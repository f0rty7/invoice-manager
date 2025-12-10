import { database } from '../db/connection';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '@pdf-invoice/shared';
import { ObjectId } from 'mongodb';

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const existingUser = await database.users.findOne(
      { username: data.username },
      { projection: { _id: 1 } }
    );
    
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await hashPassword(data.password);
    
    const user: Omit<User, '_id'> = {
      username: data.username,
      password: hashedPassword,
      email: data.email,
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await database.users.insertOne(user as User);
    
    const token = generateToken({
      userId: result.insertedId.toString(),
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: result.insertedId.toString(),
        username: user.username,
        role: user.role,
      },
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = await database.users.findOne({ username: data.username });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(data.password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({
      userId: user._id!.toString(),
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user._id!.toString(),
        username: user.username,
        role: user.role,
      },
    };
  }

  async initializeAdminUser(): Promise<void> {
    const hashedPassword = await hashPassword('admin123');
    
    // Use atomic upsert to avoid race conditions on concurrent server startups
    const result = await database.users.updateOne(
      { username: 'admin' },
      {
        $setOnInsert: {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          created_at: new Date(),
          updated_at: new Date(),
        }
      },
      { upsert: true }
    );

    // Only log if we actually created a new admin user
    if (result.upsertedCount > 0) {
      console.log('✅ Admin user created (username: admin, password: admin123)');
    }
  }
}

export const authService = new AuthService();

