-- Voyu CRM — SQL setup for the new features (run in Supabase → SQL Editor).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

-- Helper: roles allowed to write.
-- (Mirrors the app's canWrite(): admin / agente / financeiro.)

-- ============================================================
-- 1) CREDITS TABLE (airline credits / open tickets / vouchers)
-- ============================================================
create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.credits enable row level security;

-- Any signed-in, non-pending user can read.
drop policy if exists credits_select on public.credits;
create policy credits_select on public.credits for select
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role <> 'pending')
  );

-- Only write roles can insert/update/delete.
drop policy if exists credits_write on public.credits;
create policy credits_write on public.credits for all
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin','agente','financeiro'))
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin','agente','financeiro'))
  );

-- ============================================================
-- 2) STORAGE BUCKET for client documents (passport, visa, etc.)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Read: any signed-in, non-pending user.
drop policy if exists attachments_select on storage.objects;
create policy attachments_select on storage.objects for select
  using (
    bucket_id = 'attachments'
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role <> 'pending')
  );

-- Insert / update / delete: write roles only.
drop policy if exists attachments_insert on storage.objects;
create policy attachments_insert on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role in ('admin','agente','financeiro'))
  );

drop policy if exists attachments_update on storage.objects;
create policy attachments_update on storage.objects for update
  using (
    bucket_id = 'attachments'
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role in ('admin','agente','financeiro'))
  );

drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role in ('admin','agente','financeiro'))
  );
