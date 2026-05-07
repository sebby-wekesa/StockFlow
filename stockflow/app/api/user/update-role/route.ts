export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (typeof role !== "string") {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate role is a valid UserRole
    const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'WAREHOUSE', 'SALES', 'ACCOUNTANT', 'OPERATOR', 'PACKAGING', 'PENDING'];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update role in Prisma User table
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
