-- 1. Drop existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update existing roles to uppercase
UPDATE public.profiles SET role = UPPER(role);

-- 3. Sync with Auth metadata to get correct roles from seeding
UPDATE public.profiles p
SET 
  role = COALESCE(UPPER(u.raw_user_meta_data->>'role'), p.role),
  department = u.raw_user_meta_data->>'department',
  branch_id = u.raw_user_meta_data->>'branch_id'
FROM auth.users u
WHERE p.id = u.id;

-- 4. Clean up any roles that might still be invalid (fallback to PENDING)
UPDATE public.profiles 
SET role = 'PENDING' 
WHERE role NOT IN ('PENDING', 'ADMIN', 'MANAGER', 'OPERATOR', 'SALES', 'PACKAGING', 'WAREHOUSE');

-- 5. Add the constraint back
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('PENDING', 'ADMIN', 'MANAGER', 'OPERATOR', 'SALES', 'PACKAGING', 'WAREHOUSE'));

-- 6. Set default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'PENDING';

-- 7. Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, department, branch_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(UPPER(new.raw_user_meta_data->>'role'), 'PENDING'),
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'branch_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
