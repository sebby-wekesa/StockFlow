import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Client } from 'pg';

config({ path: path.join(process.cwd(), '.env') });

async function runSQL() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: tsx run-sql.ts <sql-file>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: false });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('SQL executed successfully');
  } catch (error) {
    console.error('Error executing SQL:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSQL();