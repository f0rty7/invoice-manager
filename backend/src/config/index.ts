import { config } from 'dotenv';

config();

export const CONFIG = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_manager',
    dbName: process.env.MONGODB_DB_NAME || 'invoice_manager',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  },
};

