export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    // Get current user from Supabase session
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabaseServer().auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'WAREHOUSE', 'SALES', 'PACKAGING'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update role in profiles table
    const { error } = await supabaseServer()
      .from('profiles')
      .update({ role })
      .eq('id', user.id);

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