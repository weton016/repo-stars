-- Add RLS policies for users table
-- Allow users to read and update their own data
CREATE POLICY "users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage all users (for upsert in callback)
CREATE POLICY "service role can manage users" ON public.users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

