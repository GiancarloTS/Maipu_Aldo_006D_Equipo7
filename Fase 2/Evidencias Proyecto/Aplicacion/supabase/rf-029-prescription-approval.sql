begin;

alter table public.medicamentos
  add column if not exists revisado_por uuid references public.usuarios(id),
  add column if not exists fecha_revision timestamp with time zone;

create or replace function public.review_medication_prescription(
  p_medicamento_id uuid,
  p_aprobada boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
  v_status public.medicamento_estado;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.rol = 'medico'
      and u.activo
  ) then
    raise exception 'Solo un médico activo puede revisar prescripciones.' using errcode = '42501';
  end if;

  select m.paciente_id, m.estado
    into v_patient_id, v_status
  from public.medicamentos m
  where m.id = p_medicamento_id
  for update;

  if v_patient_id is null then
    raise exception 'No se encontró la prescripción.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.paciente_usuario pu
    where pu.paciente_id = v_patient_id
      and pu.usuario_id = auth.uid()
      and pu.relacion = 'medico'
  ) then
    raise exception 'No tienes autorización médica sobre este paciente.' using errcode = '42501';
  end if;

  if v_status <> 'pendiente' then
    raise exception 'La prescripción ya fue revisada.' using errcode = '55000';
  end if;

  update public.medicamentos
  set estado = case when p_aprobada then 'aprobado'::public.medicamento_estado else 'revision'::public.medicamento_estado end,
      aprobado_por = case when p_aprobada then auth.uid() else null end,
      fecha_aprobacion = case when p_aprobada then pg_catalog.now() else null end,
      revisado_por = auth.uid(),
      fecha_revision = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_medicamento_id;

  return p_medicamento_id;
end;
$$;

revoke all on function public.review_medication_prescription(uuid, boolean) from public;
grant execute on function public.review_medication_prescription(uuid, boolean) to authenticated;

commit;