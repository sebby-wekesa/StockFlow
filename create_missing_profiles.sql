-- Insert profiles for existing auth users who don't have one
INSERT INTO public.profiles (id, email, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'operator') as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;