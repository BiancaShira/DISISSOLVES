import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// MySQL connection - will use DATABASE_URL if available, otherwise default XAMPP settings
let connection;

if (process.env.DATABASE_URL) {
  // Parse MySQL URL format: mysql://user:password@host:port/database
  connection = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Default XAMPP/MySQL local connection
  connection = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'disisolves',
    connectionLimit: 10,
  });
}

export const db = drizzle(connection, { schema, mode: 'default' });
