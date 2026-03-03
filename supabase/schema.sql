-- ============================================
-- ContentBrain Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually enabled by default)
create extension if not exists "pgcrypto";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  linkedin_connected boolean default false,
  linkedin_access_token text,  -- TODO: Consider using Supabase Vault for encryption
  linkedin_token_expires_at timestamptz,
  linkedin_profile_url text,
  linkedin_headline text,
  linkedin_profile_picture text,
  linkedin_sub text,  -- LinkedIn's unique user identifier (OpenID 'sub' claim)
  subscription_plan text default 'free' check (subscription_plan in ('free', 'pro', 'team')),
  stripe_customer_id text,
  ai_generations_this_month integer default 0,
  ai_generations_reset_at timestamptz default now(),
  last_posts_fetched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- LINKEDIN_POSTS TABLE
-- ============================================
create table if not exists public.linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  linkedin_post_id text,
  content text not null,
  post_type text default 'text' check (post_type in ('text', 'image', 'carousel', 'document', 'video', 'poll', 'article')),
  likes_count integer default 0,
  comments_count integer default 0,
  reposts_count integer default 0,
  impressions integer default 0,
  engagement_rate numeric default 0,
  posted_at timestamptz,
  hashtags text[],
  created_at timestamptz default now()
);

-- RLS for linkedin_posts
alter table public.linkedin_posts enable row level security;

create policy "Users can view own posts"
  on public.linkedin_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert own posts"
  on public.linkedin_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.linkedin_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.linkedin_posts for delete
  using (auth.uid() = user_id);

-- ============================================
-- BRAND_BRAIN_PROFILES TABLE
-- ============================================
create table if not exists public.brand_brain_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  analysis jsonb,
  posts_analyzed integer default 0,
  last_analyzed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for brand_brain_profiles
alter table public.brand_brain_profiles enable row level security;

create policy "Users can view own brand brain"
  on public.brand_brain_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own brand brain"
  on public.brand_brain_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own brand brain"
  on public.brand_brain_profiles for update
  using (auth.uid() = user_id);

-- ============================================
-- DRAFTS TABLE
-- ============================================
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  post_type text default 'text' check (post_type in ('text', 'image', 'carousel', 'document', 'video', 'poll', 'article')),
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  linkedin_post_id text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for drafts
alter table public.drafts enable row level security;

create policy "Users can view own drafts"
  on public.drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert own drafts"
  on public.drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own drafts"
  on public.drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete own drafts"
  on public.drafts for delete
  using (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_linkedin_posts_user_id on public.linkedin_posts(user_id);
create index if not exists idx_linkedin_posts_posted_at on public.linkedin_posts(posted_at desc);
create index if not exists idx_drafts_user_id on public.drafts(user_id);
create index if not exists idx_drafts_status on public.drafts(status);
create index if not exists idx_drafts_scheduled_at on public.drafts(scheduled_at);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger brand_brain_profiles_updated_at
  before update on public.brand_brain_profiles
  for each row execute procedure public.update_updated_at();

create trigger drafts_updated_at
  before update on public.drafts
  for each row execute procedure public.update_updated_at();
