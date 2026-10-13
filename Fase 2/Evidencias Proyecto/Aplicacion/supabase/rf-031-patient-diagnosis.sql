begin;

alter table public.pacientes
  add column if not exists diagnostico_principal text;

drop function if exists public.create_patient_for_current_user(text, date, text, text, text, text);
drop function if exists public.create_patient_for_current_user(text, date, text, text, text);

create function public.create_patient_for_current_user(
  p_nombre text,
  p_fecha_nacimiento date,
  p_rut text default null,
  p_alergias text default null,
  p_contacto_emergencia text default null,
  p_diagnostico_principal text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_patient_id uuid;
  v_user_role public.rol_usuario;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión antes de registrar un paciente.' using errcode = '42501';
  end if;

  select u.rol into v_user_role
  from public.usuarios u
  where u.id = auth.uid() and u.activo;

  if v_user_role is null or v_user_role not in ('medico', 'cuidador', 'familiar') then
    raise exception 'Tu perfil no puede registrar pacientes.' using errcode = '42501';
  end if;

  if nullif(trim(p_nombre), '') is null or p_fecha_nacimiento is null then
    raise exception 'El nombre y la fecha de nacimiento son obligatorios.' using errcode = '22023';
  end if;

  insert into public.pacientes (
    nombre, fecha_nacimiento, diagnostico_principal, rut, codigo_qr_token, alergias, contacto_emergencia
  ) values (
    trim(p_nombre), p_fecha_nacimiento, nullif(trim(p_diagnostico_principal), ''),
    nullif(trim(p_rut), ''), pg_catalog.gen_random_uuid()::text,
    nullif(trim(p_alergias), ''), nullif(trim(p_contacto_emergencia), '')
  ) returning id into new_patient_id;

  insert into public.paciente_usuario (paciente_id, usuario_id, relacion, es_principal)
  values (new_patient_id, auth.uid(), v_user_role::text::public.relacion_paciente, true);

  return new_patient_id;
end;
$$;

revoke all on function public.create_patient_for_current_user(text, date, text, text, text, text) from public;
grant execute on function public.create_patient_for_current_user(text, date, text, text, text, text) to authenticated;

commit;
