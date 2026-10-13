begin;

create or replace function public.register_medication_administration(
  p_medicamento_id uuid,
  p_observaciones text default null,
  p_administrado boolean default true
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_id uuid;
  current_status public.medicamento_estado;
  medication_start date;
  medication_end date;
  new_record_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.rol = 'cuidador' and u.activo
  ) then
    raise exception 'Solo un cuidador activo puede registrar administraciones.' using errcode = '42501';
  end if;

  select m.paciente_id, m.estado, m.fecha_inicio, m.fecha_fin
    into patient_id, current_status, medication_start, medication_end
  from public.medicamentos m
  where m.id = p_medicamento_id
  for update;

  if patient_id is null then
    raise exception 'No se encontró el medicamento.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.paciente_usuario pu
    where pu.paciente_id = patient_id
      and pu.usuario_id = auth.uid()
      and pu.relacion = 'cuidador'
  ) then
    raise exception 'No tienes autorización sobre este paciente.' using errcode = '42501';
  end if;

  if current_status <> 'aprobado'
    or medication_start > current_date
    or (medication_end is not null and medication_end < current_date) then
    raise exception 'La prescripción no está aprobada o fuera de vigencia.' using errcode = '55000';
  end if;

  insert into public.registro_medicacion (
    medicamento_id, registrado_por, estado, observaciones
  ) values (
    p_medicamento_id,
    auth.uid(),
    case when p_administrado then 'administrado'::public.registro_estado else 'observado'::public.registro_estado end,
    coalesce(
      nullif(trim(p_observaciones), ''),
      case when p_administrado then null else 'Dosis marcada como no administrada.' end
    )
  ) returning id into new_record_id;

  if p_administrado then
    update public.medicamentos
    set estado = 'administrado', updated_at = pg_catalog.now()
    where id = p_medicamento_id;
  end if;

  return new_record_id;
end;
$$;

revoke all on function public.register_medication_administration(uuid, text, boolean) from public;
grant execute on function public.register_medication_administration(uuid, text, boolean) to authenticated;

commit;