import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL ?? '',
  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
})
export const db = drizzle(pool, { schema, mode: 'default' })
