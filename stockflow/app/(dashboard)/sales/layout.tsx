import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-admin';

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await supabaseServer().auth.getUser();

  if (!user) redirect('/login');

  // For now, using Prisma-based auth since that's the current system
  // In a full Supabase migration, this would query the profiles table
  const dbUser = await import('@/lib/db-user').then(m => m.getUserFromId(user.id));

  // Strict check: If not sales or admin, redirect
  if (dbUser?.role !== 'SALES' && dbUser?.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}