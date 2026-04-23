-- SQL to run in Supabase SQL Editor
-- This ensures branchId is included in the JWT claims under app_metadata

CREATE OR REPLACE FUNCTION public.sync_user_branch_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET app_metadata = app_metadata || jsonb_build_object('branch_id', NEW.raw_user_meta_data->>'branchId')
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger whenever user metadata is updated
DROP TRIGGER IF EXISTS on_auth_user_metadata_update ON auth.users;
CREATE TRIGGER on_auth_user_metadata_update
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'branchId' IS NOT NULL)
  EXECUTE FUNCTION public.sync_user_branch_to_metadata();
