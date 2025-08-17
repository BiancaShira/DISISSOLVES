import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// MySQL connection configuration for XAMPP
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'disisolves',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const connection = mysql.createPool(dbConfig);
export const db = drizzle(connection, { schema, mode: 'default' });
