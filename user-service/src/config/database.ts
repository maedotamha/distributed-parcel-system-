
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded (explicit path to be safe)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

const dbUrl = process.env.DATABASE_URL || "postgresql://delivery_user:YourStrongPassword123@localhost:5435/user_service_db";

const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
