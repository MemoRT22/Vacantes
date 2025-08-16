/*
  # Create public vacancies view and RLS policies

  1. New Views
    - `vacancies_public` - Public view exposing only necessary columns for public access

  2. Security
    - Enable RLS on vacancies table
    - Add policy for anonymous users to read active vacancies only
    - Add policy for managers to read assigned vacancies
    - Add policy for RH to read all vacancies

  3. Indexes
    - Add index for public queries on (type, is_active)
    - Add index for position search if needed
*/

-- Create public view for vacancies
CREATE OR REPLACE VIEW public.vacancies_public AS
SELECT 
  id, 
  position, 
  type, 
  is_active, 
  created_at,
  objetivos,
  funciones,
  escolaridad,
  experiencia_minima,
  conocimientos_tecnicos,
  habilidades
FROM public.vacancies;

-- Enable RLS on vacancies table if not already enabled
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "anon_read_active_vacancies" ON public.vacancies;
DROP POLICY IF EXISTS "manager_read_assigned" ON public.vacancies;
DROP POLICY IF EXISTS "rh_read_all" ON public.vacancies;

-- Anonymous users: only see active vacancies
CREATE POLICY "anon_read_active_vacancies"
ON public.vacancies FOR SELECT TO anon
USING (is_active = true);

-- Authenticated managers: see assigned vacancies
CREATE POLICY "manager_read_assigned"
ON public.vacancies FOR SELECT TO authenticated
USING (manager_id = auth.uid());

-- Authenticated RH: see all vacancies
CREATE POLICY "rh_read_all"
ON public.vacancies FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.staff_users s
  WHERE s.id = auth.uid() AND s.role = 'RH'
));

-- Add indexes for public queries
CREATE INDEX IF NOT EXISTS idx_vacancies_public_active 
ON public.vacancies (type, is_active) 
WHERE is_active = true;

-- Add index for position search (using pg_trgm for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_vacancies_position_search 
ON public.vacancies USING gin (position gin_trgm_ops);