import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
  // Managed Postgres providers (Neon, etc.) require SSL — detected from the
  // connection string so plain local Postgres is unaffected.
  ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});
