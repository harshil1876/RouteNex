-- =====================================================================
-- RouteNex Cloud Supabase Migration: Auth, Multi-Tenancy & Row-Level Security
-- Links auth.users(id) to organizations, workspaces, and cloud_api_keys
-- =====================================================================

-- 1. Create cloud_users table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.cloud_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('owner', 'admin', 'developer', 'billing', 'readonly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY DEFAULT ('org_' || substr(md5(random()::text), 1, 12)),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'developer' CHECK (plan IN ('developer', 'team', 'enterprise')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create organization members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('owner', 'admin', 'developer', 'billing', 'readonly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_id, user_id)
);

-- 4. Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY DEFAULT ('ws_' || substr(md5(random()::text), 1, 12)),
  org_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  budget_monthly_usd NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  current_month_spend_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create cloud API keys table (hashed with SHA-256)
CREATE TABLE IF NOT EXISTS public.cloud_api_keys (
  key_hash TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["chat:write", "models:read"]'::jsonb,
  allowed_models JSONB,
  current_month_spend_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  spend_cap_usd NUMERIC(10, 2),
  rate_limit_rpm INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'rate_limited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ
);

-- 6. Spend Accounting Log
CREATE TABLE IF NOT EXISTS public.spend_accounting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  tokens_saved INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
  status_code INTEGER NOT NULL DEFAULT 200,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Cloud Audit Logs
CREATE TABLE IF NOT EXISTS public.cloud_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.cloud_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own user profile
CREATE POLICY "Users can manage own profile" ON public.cloud_users
  FOR ALL USING (auth.uid() = id);

-- Policy: Organization members can view organizations they belong to
CREATE POLICY "Org members can view organizations" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = organizations.id
        AND organization_members.user_id = auth.uid()
    ) OR owner_id = auth.uid()
  );

-- Policy: Organization owners can update organization details
CREATE POLICY "Org owners can update organizations" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- Policy: Org members can view workspaces
CREATE POLICY "Org members can view workspaces" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = workspaces.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Policy: Org admins and owners can manage workspaces
CREATE POLICY "Org admins can manage workspaces" ON public.workspaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.org_id = workspaces.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Policy: Org members can view API keys
CREATE POLICY "Org members can view API keys" ON public.cloud_api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      JOIN public.organization_members ON organization_members.org_id = workspaces.org_id
      WHERE workspaces.id = cloud_api_keys.workspace_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Policy: Org admins can manage API keys
CREATE POLICY "Org admins can manage API keys" ON public.cloud_api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      JOIN public.organization_members ON organization_members.org_id = workspaces.org_id
      WHERE workspaces.id = cloud_api_keys.workspace_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Policy: Org members can view spend accounting
CREATE POLICY "Org members can view spend" ON public.spend_accounting
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspaces
      JOIN public.organization_members ON organization_members.org_id = workspaces.org_id
      WHERE workspaces.id = spend_accounting.workspace_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Automatically create cloud_users record and default organization on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id TEXT;
  new_ws_id TEXT;
BEGIN
  INSERT INTO public.cloud_users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  new_org_id := 'org_' || substr(md5(random()::text), 1, 12);
  INSERT INTO public.organizations (id, name, slug, plan, owner_id)
  VALUES (
    new_org_id,
    COALESCE(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1) || '''s Org'),
    split_part(new.email, '@', 1) || '-' || substr(md5(random()::text), 1, 6),
    'developer',
    new.id
  );

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, new.id, 'owner');

  new_ws_id := 'ws_' || substr(md5(random()::text), 1, 12);
  INSERT INTO public.workspaces (id, org_id, name, environment, budget_monthly_usd)
  VALUES (new_ws_id, new_org_id, 'Production', 'production', 100.00);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
