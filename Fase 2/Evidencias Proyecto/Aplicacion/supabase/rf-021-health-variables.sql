begin;

alter table public.variables_salud enable row level security;
revoke all on public.variables_salud from public, anon, authenticated;
grant select on public.variables_salud to authenticated;

drop policy if exists linkcare_health_variables_select_linked on public.variables_salud;
create policy linkcare_health_variables_select_linked
  on public.variables_salud for select to authenticated
  using (
    exists (
      select 1 from public.paciente_usuario pu
      where pu.paciente_id = variables_salud.paciente_id
        and pu.usuario_id = auth.uid()
    )
  );

create or replace function public.save_health_variable(
  p_paciente_id uuid,
  p_tipo_variable text,
  p_valor text,
  p_unidad_medida text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_variable_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.activo
  ) then
    raise exception 'Inicia sesión con un usuario activo para registrar una medición.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.paciente_usuario pu
    where pu.paciente_id = p_paciente_id and pu.usuario_id = auth.uid()
  ) then
    raise exception 'No tienes autorización sobre este paciente.' using errcode = '42501';
  end if;

  if nullif(pg_catalog.btrim(p_tipo_variable), '') is null
    or nullif(pg_catalog.btrim(p_valor), '') is null then
    raise exception 'El tipo y el valor de la medición son obligatorios.' using errcode = '22023';
  end if;

  insert into public.variables_salud (
    paciente_id, registrado_por, tipo_variable, valor, unidad_medida, fecha_hora
  ) values (
    p_paciente_id, auth.uid(), pg_catalog.btrim(p_tipo_variable), pg_catalog.btrim(p_valor),
    nullif(pg_catalog.btrim(p_unidad_medida), ''), pg_catalog.now()
  ) returning id into v_variable_id;

  return v_variable_id;
end;
$$;

revoke all on function public.save_health_variable(uuid, text, text, text) from public;
grant execute on function public.save_health_variable(uuid, text, text, text) to authenticated;

commit;