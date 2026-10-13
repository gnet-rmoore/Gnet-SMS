-- Phase A: schema-per-service + per-service DB roles (same Postgres cluster).
-- See MICROSERVICES_ROADMAP.md §4 Phase A.
-- Idempotent: safe on fresh initdb and on existing volumes via the `db-roles` compose job.
--
-- Production: keep ONE managed Postgres with HA (Multi-AZ / regional replica).
-- Do NOT create eight separate Postgres instances unless a single domain (e.g. finance)
-- has a concrete compliance or scale driver (Phase C).

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS academic;
CREATE SCHEMA IF NOT EXISTS classroom;
CREATE SCHEMA IF NOT EXISTS lifecycle;
CREATE SCHEMA IF NOT EXISTS staff;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS comms;
CREATE SCHEMA IF NOT EXISTS campus;

-- Cluster admin (migrations / emergency). Local compose password is `sms`.
GRANT USAGE, CREATE ON SCHEMA identity, academic, classroom, lifecycle, staff, finance, ops, comms, campus TO sms;
GRANT ALL ON ALL TABLES IN SCHEMA identity, academic, classroom, lifecycle, staff, finance, ops, comms, campus TO sms;
GRANT ALL ON ALL SEQUENCES IN SCHEMA identity, academic, classroom, lifecycle, staff, finance, ops, comms, campus TO sms;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, academic, classroom, lifecycle, staff, finance, ops, comms, campus
  GRANT ALL ON TABLES TO sms;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, academic, classroom, lifecycle, staff, finance, ops, comms, campus
  GRANT ALL ON SEQUENCES TO sms;

-- Runtime roles: each service may only use its own schema.
-- Local/dev passwords match the role name (change in production).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('sms_identity',  'identity',  'sms_identity'),
      ('sms_lifecycle', 'lifecycle', 'sms_lifecycle'),
      ('sms_ops',       'ops',       'sms_ops'),
      ('sms_staff',     'staff',     'sms_staff'),
      ('sms_classroom', 'classroom', 'sms_classroom'),
      ('sms_academic',  'academic',  'sms_academic'),
      ('sms_finance',   'finance',   'sms_finance'),
      ('sms_comms',     'comms',     'sms_comms'),
      ('sms_campus',    'campus',    'sms_campus')
    ) AS t(rolename, schemaname, pwd)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r.rolename) THEN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', r.rolename, r.pwd);
    ELSE
      EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', r.rolename, r.pwd);
    END IF;

    EXECUTE format('GRANT CONNECT ON DATABASE sms_db TO %I', r.rolename);
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', r.schemaname, r.rolename);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO %I', r.schemaname, r.rolename);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO %I', r.schemaname, r.rolename);
    -- Prisma `db push` requires table ownership to alter columns.
    EXECUTE format(
      $own$
      DO $inner$
      DECLARE t record;
      BEGIN
        FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = %L LOOP
          EXECUTE format('ALTER TABLE %%I.%%I OWNER TO %%I', %L, t.tablename, %L);
        END LOOP;
      END
      $inner$;
      $own$,
      r.schemaname, r.schemaname, r.rolename
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO %I',
      r.schemaname, r.rolename
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO %I',
      r.schemaname, r.rolename
    );
    -- Objects created by admin `sms` (legacy / tooling) remain usable by the service role.
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE sms IN SCHEMA %I GRANT ALL ON TABLES TO %I',
      r.schemaname, r.rolename
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE sms IN SCHEMA %I GRANT ALL ON SEQUENCES TO %I',
      r.schemaname, r.rolename
    );

    -- No access to public (monolith) or other service schemas.
    EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', r.rolename);
  END LOOP;
END
$$;
