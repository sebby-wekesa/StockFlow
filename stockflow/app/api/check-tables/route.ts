import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check what tables exist in public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    // Check if User table exists and its structure
    const userTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'User'
      );
    `;

    let userColumns = [];
    if (userTableExists[0].exists) {
      userColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'User'
        ORDER BY column_name;
      `;
    }

    return NextResponse.json({
      tables: tables.map((t: any) => t.table_name),
      userTableExists: userTableExists[0].exists,
      userColumns: userColumns
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({ error: 'Database check failed', details: error.message }, { status: 500 });
  }
}