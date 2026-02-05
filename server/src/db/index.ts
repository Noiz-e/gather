/**
 * Database connection and pool management
 * Supports both Cloud SQL (via Unix socket) and direct PostgreSQL connections
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables before reading them
// Use explicit path to ensure .env is found regardless of cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const { Pool } = pg;

// Database configuration
interface DbConfig {
  host?: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  // Cloud SQL specific
  instanceConnectionName?: string;
}

function getDbConfig(): DbConfig {
  // Cloud SQL connection via Unix socket (for Cloud Run)
  const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
  
  if (instanceConnectionName) {
    // Running on Cloud Run with Cloud SQL
    return {
      host: `/cloudsql/${instanceConnectionName}`,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      instanceConnectionName,
    };
  }
  
  // Direct connection (local development or external PostgreSQL)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

// Create connection pool
const config = getDbConfig();

const poolConfig: pg.PoolConfig = {
  database: config.database,
  user: config.user,
  password: config.password,
  max: 10,  // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  // Enable SSL for Cloud SQL public IP connections
  ssl: config.instanceConnectionName ? false : {
    rejectUnauthorized: false,  // Allow self-signed certs (Cloud SQL uses Google-managed certs)
  },
};

// Set host configuration based on environment
if (config.instanceConnectionName) {
  // Cloud SQL Unix socket connection
  poolConfig.host = config.host;
} else {
  // Direct TCP connection
  poolConfig.host = config.host;
  poolConfig.port = config.port;
}

export const pool = new Pool(poolConfig);

// Log connection info (without password)
console.log('📊 Database config:', {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  cloudSql: !!config.instanceConnectionName,
});

// Error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

/**
 * Check if database is connected and ready
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Execute a query with parameters
 */
export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log('Slow query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Query error:', { text: text.substring(0, 100), error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    // Check if tables exist
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Database schema already exists');
      return;
    }
    
    console.log('🔨 Initializing database schema...');
    
    // Read and execute schema
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);
    
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all pool connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default {
  pool,
  query,
  getClient,
  transaction,
  checkConnection,
  initializeSchema,
  closePool,
};
