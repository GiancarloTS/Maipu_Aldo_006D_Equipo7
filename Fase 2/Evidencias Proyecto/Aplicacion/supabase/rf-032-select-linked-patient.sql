begin;

create or replace function public.select_patient_for_current_user(
  p_patient_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_role public.rol_usuario;
  v_patient_relation public.relacion_paciente;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para seleccionar un paciente.' using errcode = '42501';
  end if;

  select u.rol into v_user_role
  from public.usuarios u
  where u.id = auth.uid() and u.activo;

  if v_user_role is null or v_user_role not in ('cuidador', 'familiar') then
    raise exception 'Solo cuidadores y familiares pueden cambiar el paciente activo.' using errcode = '42501';
  end if;

  v_patient_relation := v_user_role::text::public.relacion_paciente;

  if not exists (
    select 1
    from public.paciente_usuario pu
    where pu.paciente_id = p_patient_id
      and pu.usuario_id = auth.uid()
      and pu.relacion = v_patient_relation
  ) then
    raise exception 'El paciente no está vinculado a tu cuenta.' using errcode = 'P0002';
  end if;

  update public.paciente_usuario
  set es_principal = false
  where usuario_id = auth.uid()
    and relacion = v_patient_relation
    and es_principal;

  update public.paciente_usuario
  set es_principal = true
  where paciente_id = p_patient_id
    and usuario_id = auth.uid()
    and relacion = v_patient_relation;

  return true;
end;
$$;

revoke all on function public.select_patient_for_current_user(uuid) from public;
grant execute on function public.select_patient_for_current_user(uuid) to authenticated;

commit;
