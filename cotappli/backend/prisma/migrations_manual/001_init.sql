-- COOP'APPLI — Schéma initial PostgreSQL
-- Généré à partir de prisma/schema.prisma — à utiliser uniquement si vous n'exécutez pas
-- `npx prisma migrate dev` (qui génère et applique les migrations automatiquement).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE group_status AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  target_amount NUMERIC(14,2) NOT NULL,
  currency      VARCHAR(8) NOT NULL DEFAULT 'XOF',
  status        group_status NOT NULL DEFAULT 'OPEN',
  payment_instructions TEXT,
  share_token   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_groups_owner_id ON groups(owner_id);

CREATE TABLE group_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  display_name   VARCHAR(255) NOT NULL,
  phone          VARCHAR(32),
  expected_amount NUMERIC(14,2),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

CREATE TABLE contributions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  amount         NUMERIC(14,2) NOT NULL,
  payment_date   TIMESTAMPTZ NOT NULL,
  payment_method VARCHAR(64),
  notes          TEXT
);
CREATE INDEX idx_contributions_group_id ON contributions(group_id);
CREATE INDEX idx_contributions_member_id ON contributions(member_id);
