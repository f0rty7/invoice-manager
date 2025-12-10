import { MongoClient, Db, Collection, Document } from 'mongodb';
import { CONFIG } from '../config';
import type { User, Invoice } from '@pdf-invoice/shared';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(CONFIG.mongodb.uri);
      await this.client.connect();
      this.db = this.client.db(CONFIG.mongodb.dbName);
      
      console.log('✅ Connected to MongoDB');
      
      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Users collection indexes
      await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });

      // Invoices collection indexes - compound unique key for order_no + invoice_no
      await this.db.collection('invoices').createIndex(
        { order_no: 1, invoice_no: 1 }, 
        { unique: true }
      );
      await this.db.collection('invoices').createIndex({ user_id: 1, date: -1 });
      await this.db.collection('invoices').createIndex({ 'items.category': 1, date: -1 });
      await this.db.collection('invoices').createIndex({ items_total: 1 });
      await this.db.collection('invoices').createIndex({ created_at: -1 });

      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('⚠️ Error creating indexes:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('✅ Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Database client not connected');
    }
    return this.client;
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  get users(): Collection<User> {
    return this.collection<User>('users');
  }

  get invoices(): Collection<Invoice> {
    return this.collection<Invoice>('invoices');
  }
}

export const database = new Database();

