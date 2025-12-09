import { database } from '../db/connection';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '@pdf-invoice/shared';
import { ObjectId } from 'mongodb';

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const existingUser = await database.users.findOne({ username: data.username });
    
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
    const existingAdmin = await database.users.findOne({ username: 'admin' });
    
    if (!existingAdmin) {
      const hashedPassword = await hashPassword('admin123');
      
      const admin: Omit<User, '_id'> = {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
      };

      await database.users.insertOne(admin as User);
      console.log('✅ Admin user created (username: admin, password: admin123)');
    }
  }
}

export const authService = new AuthService();

