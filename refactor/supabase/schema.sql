create extension if not exists pgcrypto;

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  whatsapp text not null,
  chances integer not null default 5,
  sorteado boolean not null default false,
  data_sorteio timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists prizes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  icone text default '🎁',
  ativo boolean not null default true,
  tipo text not null default 'ambos' check (tipo in ('roleta','raspadinha','ambos')),
  probabilidade numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists draw_campaigns (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'roleta',
  status text not null default 'pendente',
  data_sorteio date not null,
  hora_inicio time not null,
  hora_fim time not null,
  created_at timestamptz not null default now()
);

create table if not exists scratch_campaigns (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pendente',
  data_raspadinha date not null,
  hora_inicio time not null,
  hora_fim time not null,
  created_at timestamptz not null default now()
);

create table if not exists prize_schedules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  campaign_kind text not null check (campaign_kind in ('roleta','raspadinha')),
  premio_id uuid references prizes(id) on delete cascade,
  premio_nome text not null,
  horario_inicio time not null,
  horario_fim time not null,
  quantidade integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists winners (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid references participants(id) on delete set null,
  premio_id uuid references prizes(id) on delete set null,
  nome text not null,
  email text,
  whatsapp text,
  premio_nome text not null,
  premio_descricao text,
  premio_icone text,
  tipo_sorteio text not null check (tipo_sorteio in ('roleta','raspadinha')),
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references participants(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists commands (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processed')),
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function increment_participant_chances(participant_id_input uuid, increment_by integer)
returns void
language plpgsql
as $$
begin
  update participants
  set chances = greatest(0, chances + increment_by)
  where id = participant_id_input;
end;
$$;

create or replace view participants_with_referrals as
select
  p.id,
  p.nome,
  p.email,
  p.whatsapp,
  p.created_at as data_cadastro,
  p.chances,
  p.sorteado,
  case when exists(select 1 from referrals r where r.participante_id = p.id) then p.id else null end as indicado_por,
  null::text as indicador_nome,
  null::text as indicador_whatsapp
from participants p;
