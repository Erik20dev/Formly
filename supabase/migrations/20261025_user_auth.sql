
-- Formly user profiles and form ownership.
-- Prepare locally first. Do not run against production yet.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS profiles_status_idx
  ON public.profiles(status);

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS owner_id UUID
  REFERENCES public.profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS forms_owner_id_idx
  ON public.forms(owner_id);

-- Create regular profiles for existing Supabase Auth users.
-- This does not promote anyone to administrator.
INSERT INTO public.profiles (id, email)
SELECT id, email
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Existing forms retain their current data.
-- owner_id stays NULL until ownership is assigned deliberately.
