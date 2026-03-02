-- Fix RLS policy for repositories table
-- The existing policy might not have WITH CHECK clause for INSERT operations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "users can manage own repos" ON public.repositories;

-- Create a more explicit policy that handles both USING and WITH CHECK
-- This ensures INSERT operations work correctly
CREATE POLICY "users can manage own repos" ON public.repositories
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

