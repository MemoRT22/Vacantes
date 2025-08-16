-- ============================================
-- MÓDULO 1: Base de datos y catálogos (Supabase)
-- ============================================

-- Extensiones (para gen_random_uuid)
create extension if not exists pgcrypto;

-- =================
-- 1) ENUMERACIONES
-- =================
do $$ begin
  create type role_type as enum ('RH','MANAGER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vacancy_type as enum ('ADMINISTRATIVO','OPERATIVO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_phase as enum ('NECESARIO','DESPUES');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_type as enum (
    'SOLICITUD_EMPLEO','CV','ACTA_NACIMIENTO','TITULO_O_CERTIFICADO',
    'CEDULA','LICENCIA_TIPO_C','INE','CURP','RFC','NSS',
    'COMPROBANTE_DOMICILIO','CERTIFICADO_MEDICO','CARTAS_RECOMENDACION'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum (
    'RevisionDeDocumentos','EntrevistaConRH','EntrevistaConManager',
    'Evaluando','Aceptado','Rechazado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_bank_kind as enum (
    'ADMINISTRATIVO','OPERATIVO','OPERADOR_UNIDADES','GUARDIA_SEGURIDAD',
    'AUX_LIMPIEZA_UNIDADES','JEFE_PATIO','AUXILIAR_PATIO','TECNICOS'  -- ÚNICO banco para técnicos
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type criteria_group as enum ('FORMACION_Y_EXPERIENCIA','AREA_SOCIAL');
exception when duplicate_object then null; end $$;

-- ===========================
-- 2) RELACIÓN CON SUPABASE AUTH
-- ===========================
-- staff_users.id DEBE ser el mismo UUID que auth.users.id
-- staff_users.email DEBE coincidir con auth.users.email (mismo id)

create table if not exists public.staff_users (
  id uuid primary key
    references auth.users(id) on delete restrict,          -- sin huérfanos
  role role_type not null,
  full_name text not null,
  email text not null unique,
  active boolean not null default true,
  created_by uuid null references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.enforce_staff_email_matches_auth()
returns trigger language plpgsql as $$
declare auth_email text;
begin
  select email into auth_email from auth.users where id = new.id;
  if auth_email is null then
    raise exception 'No existe auth.users.id = %', new.id;
  end if;
  if new.email is distinct from auth_email then
    raise exception 'staff_users.email (%) debe coincidir con auth.users.email (%) para id %',
      new.email, auth_email, new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_staff_email_check on public.staff_users;
create trigger trg_staff_email_check
before insert or update on public.staff_users
for each row execute function public.enforce_staff_email_matches_auth();

-- ============
-- 3) CANDIDATOS
-- ============
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  created_at timestamptz not null default now()
);

-- =========
-- 4) VACANTES
-- =========
create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  type vacancy_type not null,         -- ADMINISTRATIVO | OPERATIVO
  position text not null,             -- nombre del puesto
  objetivos text,
  funciones text,
  escolaridad text,
  experiencia_minima text,
  conocimientos_tecnicos text,
  habilidades text,
  manager_id uuid not null references public.staff_users(id) on delete restrict,
  is_active boolean not null default true,
  created_by uuid not null references public.staff_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.vacancy_required_docs (
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  doc doc_type not null,
  phase doc_phase not null,
  primary key (vacancy_id, doc, phase)
);

-- =================
-- 5) POSTULACIONES
-- =================
create sequence if not exists public.folio_seq;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,  -- BIN-YYYY-00001
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  vacancy_id uuid not null references public.vacancies(id) on delete restrict,
  status application_status not null default 'RevisionDeDocumentos',
  -- Agendas visibles al candidato
  scheduled_rh_at timestamptz,
  scheduled_rh_location text,
  scheduled_manager_at timestamptz,
  scheduled_manager_location text,
  created_at timestamptz not null default now(),
  unique (vacancy_id, candidate_id)  -- idempotencia
);

create or replace function public.assign_folio()
returns trigger language plpgsql as $$
begin
  if new.folio is null then
    new.folio := 'BIN-' || to_char(now(), 'YYYY') || '-' ||
                 lpad(nextval('public.folio_seq')::text, 5, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_assign_folio on public.applications;
create trigger trg_assign_folio
before insert on public.applications
for each row execute function public.assign_folio();

-- =======================
-- 6) DOCUMENTOS (VERSIONES)
-- =======================
create table if not exists public.application_docs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  doc doc_type not null,
  phase doc_phase not null,
  url text not null,             -- ruta en Storage
  version int not null default 1,
  uploaded_at timestamptz not null default now(),
  unique (application_id, doc, version)
);

-- ==========================================
-- 7) BANCOS DE PREGUNTAS (RH) + VERSIONADO
-- ==========================================
create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind question_bank_kind not null unique,  -- uno por kind
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.question_bank_versions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  version int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (bank_id, version)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_version_id uuid not null references public.question_bank_versions(id) on delete cascade,
  ord int not null,
  text text not null,
  is_required boolean not null default true,
  unique (bank_version_id, ord)
);

create table if not exists public.interview_rh (
  application_id uuid primary key references public.applications(id) on delete cascade,
  bank_version_id uuid not null references public.question_bank_versions(id),
  started_at timestamptz,
  finished_at timestamptz,
  answers jsonb not null default '[]'::jsonb,        -- [{question_id, answer_text}]
  extra_questions jsonb not null default '[]'::jsonb -- [{text, answer_text}]
);

-- ===========================
-- 8) ENTREVISTA CON MANAGER
-- ===========================
create table if not exists public.interview_manager (
  application_id uuid primary key references public.applications(id) on delete cascade,
  score int not null,   -- escala libre (ej. 0-100)
  notes text,
  created_at timestamptz not null default now()
);

-- =========================
-- 9) EVALUACIÓN FINAL (RH)
-- =========================
create table if not exists public.evaluation_criteria (
  id serial primary key,
  name text not null,
  grp criteria_group not null,
  ord int not null,
  unique (grp, ord)
);

-- Semilla de 16 criterios (con tipado explícito del enum y ON CONFLICT)
insert into public.evaluation_criteria (name, grp, ord) values
  -- Formación y experiencia (1–8)
  ('Formación académica',                 'FORMACION_Y_EXPERIENCIA'::criteria_group, 1),
  ('Experiencia laboral específica',      'FORMACION_Y_EXPERIENCIA'::criteria_group, 2),
  ('Conocimiento técnico del área',       'FORMACION_Y_EXPERIENCIA'::criteria_group, 3),
  ('Habilidades técnicas',                'FORMACION_Y_EXPERIENCIA'::criteria_group, 4),
  ('Capacidad de aprendizaje',            'FORMACION_Y_EXPERIENCIA'::criteria_group, 5),
  ('Resultados y logros previos',         'FORMACION_Y_EXPERIENCIA'::criteria_group, 6),
  ('Organización y planeación',           'FORMACION_Y_EXPERIENCIA'::criteria_group, 7),
  ('Cumplimiento de requisitos del puesto','FORMACION_Y_EXPERIENCIA'::criteria_group, 8),
  -- Área social (1–8)
  ('Comunicación',                        'AREA_SOCIAL'::criteria_group, 1),
  ('Trabajo en equipo',                   'AREA_SOCIAL'::criteria_group, 2),
  ('Adaptabilidad',                       'AREA_SOCIAL'::criteria_group, 3),
  ('Orientación al servicio',             'AREA_SOCIAL'::criteria_group, 4),
  ('Manejo de conflictos',                'AREA_SOCIAL'::criteria_group, 5),
  ('Actitud y motivación',                'AREA_SOCIAL'::criteria_group, 6),
  ('Puntualidad y disciplina',            'AREA_SOCIAL'::criteria_group, 7),
  ('Presentación personal',               'AREA_SOCIAL'::criteria_group, 8)
on conflict (grp, ord) do nothing;

create table if not exists public.evaluation_scores (
  application_id uuid not null references public.applications(id) on delete cascade,
  criterion_id int  not null references public.evaluation_criteria(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  primary key (application_id, criterion_id)
);

create table if not exists public.evaluation_summary (
  application_id uuid primary key references public.applications(id) on delete cascade,
  total smallint not null, -- /80
  factors_for text,
  factors_against text,
  conclusion text,
  references_laborales text,
  created_at timestamptz not null default now()
);

-- =============
-- 10) AUDITORÍA
-- =============
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_staff_id uuid references public.staff_users(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  action text not null, -- e.g. 'STATUS_CHANGE','DOC_UPLOAD','USER_CREATE'
  from_status application_status,
  to_status application_status,
  note text,
  created_at timestamptz not null default now()
);

-- ======================
-- 11) ÍNDICES RECOMENDADOS
-- ======================
create index if not exists idx_applications_vacancy_status on public.applications (vacancy_id, status);
create index if not exists idx_vacancies_manager_active on public.vacancies (manager_id, is_active);
create index if not exists idx_appdocs_app_doc on public.application_docs (application_id, doc);
create index if not exists idx_interviewrh_answers_gin on public.interview_rh using gin (answers jsonb_path_ops);

-- ============================================
-- 12) SEMILLAS: BANCOS BASE + VERSIONES v1 ACTIVAS
-- ============================================
insert into public.question_banks (kind, name, is_active) values
  ('ADMINISTRATIVO',       'Banco de Preguntas - Administrativo', true),
  ('OPERATIVO',            'Banco de Preguntas - Operativo General', true),
  ('OPERADOR_UNIDADES',    'Banco de Preguntas - Operador de Unidades', true),
  ('GUARDIA_SEGURIDAD',    'Banco de Preguntas - Guardia de Seguridad', true),
  ('AUX_LIMPIEZA_UNIDADES','Banco de Preguntas - Auxiliar de Limpieza de Unidades', true),
  ('JEFE_PATIO',           'Banco de Preguntas - Jefe de Patio', true),
  ('AUXILIAR_PATIO',       'Banco de Preguntas - Auxiliar de Patio', true),
  ('TECNICOS',             'Banco de Preguntas - Técnicos (Mecánico, Hojalatería, Pintura, Eléctrico)', true)
on conflict (kind) do update
set name = excluded.name,
    is_active = excluded.is_active;

insert into public.question_bank_versions (bank_id, version, is_active)
select qb.id, 1, true
from public.question_banks qb
where not exists (
  select 1 from public.question_bank_versions qbv
  where qbv.bank_id = qb.id and qbv.version = 1
);

-- ============================================
-- FIN MÓDULO 1
-- ============================================