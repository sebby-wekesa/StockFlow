-- Update existing rows to uppercase to avoid constraint violation
UPDATE public.profiles SET role = UPPER(role);

-- Update role constraints to match app's uppercase roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('PENDING', 'ADMIN', 'MANAGER', 'OPERATOR', 'SALES', 'PACKAGING', 'WAREHOUSE'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'PENDING';

-- Update the handle_new_user function default
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
