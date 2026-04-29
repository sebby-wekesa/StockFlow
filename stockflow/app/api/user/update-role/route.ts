import { NextRequest, NextResponse } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-admin';
import { getUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    // For now, using Prisma-based auth since that's the current system
    // In a full Supabase migration, this would update the profiles table
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'WAREHOUSE', 'SALES', 'PACKAGING'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update role in database (using Prisma for now)
    const { updateUserRole } = await import('@/app/actions/users');
    await updateUserRole(user.id, role);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}