-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Update the handle_new_user function to include metadata for new columns if provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, department, branch_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'operator'),
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'branch_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
