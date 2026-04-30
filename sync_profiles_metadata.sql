-- Sync existing profiles with auth metadata
UPDATE public.profiles p
SET 
  role = COALESCE(u.raw_user_meta_data->>'role', p.role),
  department = u.raw_user_meta_data->>'department',
  branch_id = u.raw_user_meta_data->>'branch_id'
FROM auth.users u
WHERE p.id = u.id;
