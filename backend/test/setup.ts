// Load test environment variables before any tests run
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test file
config({ path: resolve(__dirname, '..', '.env.test') });

// Override DATABASE_URL to ensure localhost connection
process.env.DATABASE_URL =
  'postgresql://authuser:securepassword123@localhost:5432/auth_db';
