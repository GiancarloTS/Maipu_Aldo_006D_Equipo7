begin;

drop function if exists public.create_patient_for_current_user(text, date, text, text, text);

create or replace function public.create_patient_for_current_user(
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
  active_user_id uuid;
  active_user_role public.rol_usuario;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión antes de registrar un paciente.' using errcode = '42501';
  end if;

  select u.id, u.rol into active_user_id, active_user_role
  from public.usuarios u
  where u.id = auth.uid()
    and u.rol in ('medico', 'cuidador', 'familiar')
    and u.activo
  for update;

  if active_user_id is null then
    raise exception 'Se requiere una cuenta activa de médico, cuidador o familiar para registrar pacientes.' using errcode = '42501';
  end if;

  if nullif(pg_catalog.btrim(p_nombre), '') is null or p_fecha_nacimiento is null then
    raise exception 'El nombre y la fecha de nacimiento son obligatorios.' using errcode = '22023';
  end if;

  if p_fecha_nacimiento > current_date then
    raise exception 'La fecha de nacimiento no puede ser futura.' using errcode = '22023';
  end if;

  insert into public.pacientes (
    nombre, fecha_nacimiento, diagnostico_principal, rut, codigo_qr_token, alergias, contacto_emergencia
  ) values (
    pg_catalog.btrim(p_nombre), p_fecha_nacimiento, nullif(pg_catalog.btrim(p_diagnostico_principal), ''),
    nullif(pg_catalog.btrim(p_rut), ''), pg_catalog.gen_random_uuid()::text,
    nullif(pg_catalog.btrim(p_alergias), ''), nullif(pg_catalog.btrim(p_contacto_emergencia), '')
  ) returning id into new_patient_id;

  update public.paciente_usuario
  set es_principal = false
  where usuario_id = auth.uid()
    and relacion = active_user_role::text::public.relacion_paciente
    and es_principal;

  insert into public.paciente_usuario (paciente_id, usuario_id, relacion, es_principal)
  values (new_patient_id, auth.uid(), active_user_role::text::public.relacion_paciente, true);

  return new_patient_id;
end;
$$;

revoke all on function public.create_patient_for_current_user(text, date, text, text, text, text) from public;
grant execute on function public.create_patient_for_current_user(text, date, text, text, text, text) to authenticated;

commit;
