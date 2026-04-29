import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-admin';

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get user profile from Supabase profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Profile fetch error:', error);
    redirect('/unauthorized');
  }

  // Strict check: If not sales or admin, redirect
  if (profile.role !== 'SALES' && profile.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}