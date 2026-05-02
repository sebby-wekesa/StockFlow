export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-admin';
import { USER_ROLES, normalizeUserRole } from '@/lib/types';

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
    const normalizedRole = normalizeUserRole(role);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (typeof role !== "string" || !USER_ROLES.includes(role.toUpperCase() as typeof USER_ROLES[number])) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = supabaseServer() as any;
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Update role in profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ role: normalizedRole })
      .eq('id', userId);

    if (error) {
      console.error('Role update error:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
