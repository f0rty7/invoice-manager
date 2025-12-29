import { config } from 'dotenv';

config();

const envBool = (v: string | undefined, def = false): boolean => {
  if (v == null) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
};

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
  invoiceImport: {
    enabled: envBool(process.env.INVOICE_IMPORT_ENABLED, false),
    dir: (process.env.INVOICE_IMPORT_DIR || '').trim(),
    username: (process.env.INVOICE_IMPORT_USERNAME || 'admin').trim(),
    blocking: envBool(process.env.INVOICE_IMPORT_BLOCKING, false),
  },
};

