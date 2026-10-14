-- ============================================================================
-- RouteNex Cloud — Multi-Tenant PostgreSQL Schema
-- Architecture Specification: Cloud SaaS Platform Database
-- ============================================================================

-- 1. Organizations (Top-level SaaS Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'developer' CHECK (plan IN ('developer', 'team', 'enterprise')),
    monthly_budget_usd DECIMAL(10, 2) DEFAULT 100.00,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cloud Users (SSO / OAuth Authenticated Accounts)
CREATE TABLE IF NOT EXISTS cloud_users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    github_id VARCHAR(100) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Organization Memberships (RBAC)
CREATE TABLE IF NOT EXISTS organization_members (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES cloud_users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'developer' CHECK (role IN ('owner', 'admin', 'developer', 'auditor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- 4. Workspaces (Sub-projects or Environments within an Org)
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_budget_usd DECIMAL(10, 2) DEFAULT 50.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, slug)
);

-- 5. Cloud Virtual API Keys (Scoped to Workspaces with Spend Limits)
CREATE TABLE IF NOT EXISTS cloud_api_keys (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of secret key (never stored plaintext)
    key_prefix VARCHAR(16) NOT NULL,     -- e.g. "rn-cloud-prod-"
    name VARCHAR(100) NOT NULL,
    monthly_spend_limit_usd DECIMAL(10, 2) DEFAULT 25.00,
    current_month_spend_usd DECIMAL(10, 4) DEFAULT 0.0000,
    rate_limit_rpm INTEGER DEFAULT 300,
    allowed_models JSONB DEFAULT '[]'::jsonb, -- Empty array allows all routed models
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Spend Accounting & Usage History (Aggregated Billing)
CREATE TABLE IF NOT EXISTS spend_accounting (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    billing_period VARCHAR(7) NOT NULL, -- YYYY-MM
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    total_cost_usd DECIMAL(10, 4) DEFAULT 0.0000,
    request_count BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, billing_period)
);

-- 7. Audit Logs (Compliance & Security Tracking)
CREATE TABLE IF NOT EXISTS cloud_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(36) REFERENCES cloud_users(id),
    action VARCHAR(100) NOT NULL, -- e.g. "api_key.create", "budget.updated"
    target_resource VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for Fast Edge Lookup
CREATE INDEX IF NOT EXISTS idx_cloud_keys_hash ON cloud_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_spend_period ON spend_accounting(workspace_id, billing_period);
