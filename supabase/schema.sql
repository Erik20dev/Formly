-- Run this in Supabase SQL Editor before using persistent storage.
create extension if not exists pgcrypto;

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  published boolean not null default false,
  welcome_text text not null default 'Hi! Let''s get started.',
  completion_text text not null default 'Thanks for your response!',
  accent_color text not null default '#4f46e5',
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists submissions_form_id_idx on public.submissions(form_id);
create index if not exists submissions_submitted_at_idx on public.submissions(submitted_at desc);

-- This MVP accesses tables from server routes using the service role key.
-- Never expose SUPABASE_SERVICE_ROLE_KEY in browser-side code.
