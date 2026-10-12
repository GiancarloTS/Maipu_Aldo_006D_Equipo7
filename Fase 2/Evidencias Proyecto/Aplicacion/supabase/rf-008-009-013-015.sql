begin;

alter table public.usuarios enable row level security;
alter table public.pacientes enable row level security;
alter table public.paciente_usuario enable row level security;
alter table public.medicamentos enable row level security;
alter table public.registro_medicacion enable row level security;
alter table public.anotaciones enable row level security;

revoke all on public.usuarios, public.pacientes, public.paciente_usuario,
  public.medicamentos, public.registro_medicacion, public.anotaciones
  from public, anon, authenticated;
grant select on public.usuarios to authenticated;
grant insert (id, nombre, email, rol, telefono, activo) on public.usuarios to authenticated;
grant update (nombre, email, telefono, updated_at) on public.usuarios to authenticated;
grant select on public.pacientes, public.paciente_usuario,
  public.medicamentos, public.registro_medicacion, public.anotaciones to authenticated;
grant insert on public.medicamentos to authenticated;
grant insert (paciente_id, registrado_por, contenido, es_registro_voz)
  on public.anotaciones to authenticated;

alter table public.medicamentos
  add column if not exists fecha_inicio date not null default current_date;
alter table public.medicamentos
  add column if not exists fecha_fin date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'medicamentos_vigencia_check'
      and conrelid = 'public.medicamentos'::regclass
  ) then
    alter table public.medicamentos
      add constraint medicamentos_vigencia_check
      check (fecha_fin is null or fecha_fin >= fecha_inicio);
  end if;
end;
$$;

drop policy if exists linkcare_users_select_self on public.usuarios;
create policy linkcare_users_select_self
  on public.usuarios for select to authenticated
  using (id = auth.uid());

drop policy if exists linkcare_users_insert_self on public.usuarios;
create policy linkcare_users_insert_self
  on public.usuarios for insert to authenticated
  with check (id = auth.uid());

drop policy if exists linkcare_users_update_self on public.usuarios;
create policy linkcare_users_update_self
  on public.usuarios for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists linkcare_patient_links_select_self on public.paciente_usuario;
create policy linkcare_patient_links_select_self
  on public.paciente_usuario for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists linkcare_patients_select_linked on public.pacientes;
create policy linkcare_patients_select_linked
  on public.pacientes for select to authenticated
  using (
    exists (
      select 1 from public.paciente_usuario pu
      where pu.paciente_id = pacientes.id
        and pu.usuario_id = auth.uid()
    )
  );

drop policy if exists linkcare_medications_select_linked on public.medicamentos;
create policy linkcare_medications_select_linked
  on public.medicamentos for select to authenticated
  using (
    exists (
      select 1 from public.paciente_usuario pu
      where pu.paciente_id = medicamentos.paciente_id
        and pu.usuario_id = auth.uid()
    )
  );

drop policy if exists linkcare_medications_insert_doctor on public.medicamentos;
create policy linkcare_medications_insert_doctor
  on public.medicamentos for insert to authenticated
  with check (
    recetado_por = auth.uid()
    and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'medico' and u.activo
    )
    and exists (
      select 1 from public.paciente_usuario pu
      where pu.paciente_id = medicamentos.paciente_id
        and pu.usuario_id = auth.uid()
        and pu.relacion = 'medico'
    )
  );

drop policy if exists linkcare_medication_records_select_linked on public.registro_medicacion;
create policy linkcare_medication_records_select_linked
  on public.registro_medicacion for select to authenticated
  using (
    exists (
      select 1
      from public.medicamentos m
      join public.paciente_usuario pu on pu.paciente_id = m.paciente_id
      where m.id = registro_medicacion.medicamento_id
        and pu.usuario_id = auth.uid()
    )
  );

drop policy if exists linkcare_annotations_select_linked on public.anotaciones;
create policy linkcare_annotations_select_linked
  on public.anotaciones for select to authenticated
  using (
    exists (
      select 1 from public.paciente_usuario pu
      where pu.paciente_id = anotaciones.paciente_id
        and pu.usuario_id = auth.uid()
    )
  );

drop policy if exists linkcare_annotations_insert_care_team on public.anotaciones;
create policy linkcare_annotations_insert_care_team
  on public.anotaciones for insert to authenticated
  with check (
    registrado_por = auth.uid()
    and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol in ('medico', 'cuidador') and u.activo
    )
    and exists (
      select 1 from public.paciente_usuario pu
      where pu.paciente_id = anotaciones.paciente_id
        and pu.usuario_id = auth.uid()
    )
  );

create or replace function public.save_clinical_annotation(
  p_paciente_id uuid,
  p_contenido text,
  p_es_registro_voz boolean default false
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_role public.rol_usuario;
  annotation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión antes de guardar una anotación.' using errcode = '42501';
  end if;

  select u.rol into v_user_role
  from public.usuarios u
  where u.id = auth.uid() and u.activo;

  if v_user_role is null or v_user_role not in ('medico', 'cuidador', 'familiar') then
    raise exception 'Solo médicos, cuidadores y familiares pueden registrar anotaciones.' using errcode = '42501';
  end if;

  if nullif(trim(p_contenido), '') is null then
    raise exception 'El contenido de la anotación no puede estar vacío.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.paciente_usuario pu
    where pu.paciente_id = p_paciente_id
      and pu.usuario_id = auth.uid()
      and pu.relacion = v_user_role::text::public.relacion_paciente
  ) then
    raise exception 'No tienes un vínculo autorizado con este paciente.' using errcode = '42501';
  end if;

  insert into public.anotaciones (
    paciente_id, registrado_por, contenido, es_registro_voz
  ) values (
    p_paciente_id, auth.uid(), trim(p_contenido), coalesce(p_es_registro_voz, false)
  ) returning id into annotation_id;

  return annotation_id;
end;
$$;

drop function if exists public.link_patient_to_current_user(text);
create function public.link_patient_to_current_user(
  p_patient_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_id uuid;
  patient_name text;
  v_user_role public.rol_usuario;
begin

  select u.rol into v_user_role
  from public.usuarios u
  where u.id = auth.uid() and u.activo;

  if v_user_role is null then
    raise exception 'No se encontró un perfil activo.' using errcode = '42501';
  end if;

  select p.id, p.nombre into patient_id, patient_name
  from public.pacientes p
  where upper(p.codigo_qr_token) = upper(trim(p_patient_code));

  if patient_id is null then
    raise exception 'No se encontró un paciente con ese token QR.' using errcode = 'P0002';
  end if;

  update public.paciente_usuario
  set es_principal = false
  where usuario_id = auth.uid()
    and relacion = v_user_role::text::public.relacion_paciente
    and es_principal;

  insert into public.paciente_usuario (paciente_id, usuario_id, relacion, es_principal)
  values (patient_id, auth.uid(), v_user_role::text::public.relacion_paciente, true)
  on conflict (paciente_id, usuario_id, relacion)
  do update set es_principal = excluded.es_principal;

  return patient_id;
end;
$$;

create or replace function public.create_patient_for_current_user(
  p_nombre text,
  p_fecha_nacimiento date,
  p_rut text default null,
  p_alergias text default null,
  p_contacto_emergencia text default null
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
    nombre, fecha_nacimiento, rut, codigo_qr_token, alergias, contacto_emergencia
  ) values (
    trim(p_nombre), p_fecha_nacimiento, nullif(trim(p_rut), ''), pg_catalog.gen_random_uuid()::text,
    nullif(trim(p_alergias), ''), nullif(trim(p_contacto_emergencia), '')
  ) returning id into new_patient_id;

  insert into public.paciente_usuario (paciente_id, usuario_id, relacion, es_principal)
  values (new_patient_id, auth.uid(), v_user_role::text::public.relacion_paciente, true);

  return new_patient_id;
end;
$$;

drop function if exists public.register_medication_administration(uuid, text);
create function public.register_medication_administration(
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
  new_record_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.rol = 'cuidador' and u.activo
  ) then
    raise exception 'Solo un cuidador activo puede registrar administraciones.' using errcode = '42501';
  end if;

  select m.paciente_id, m.estado
    into patient_id, current_status
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

  if current_status not in ('pendiente', 'aprobado') then
    raise exception 'Este medicamento no está pendiente ni aprobado para administración.' using errcode = '55000';
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
      set estado = 'administrado', updated_at = now()
      where id = p_medicamento_id;
  end if;

  return new_record_id;
end;
$$;

create or replace function public.remove_patient_link_for_current_user(
  p_patient_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para quitar un paciente de tu cuenta.' using errcode = '42501';
  end if;

  delete from public.paciente_usuario
  where paciente_id = p_patient_id and usuario_id = auth.uid();

  if not found then
    raise exception 'El paciente no está vinculado a tu cuenta.' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

drop function if exists public.create_patient_for_current_doctor(text, date, text, text, text);
revoke all on function public.create_patient_for_current_user(text, date, text, text, text) from public;
grant execute on function public.create_patient_for_current_user(text, date, text, text, text) to authenticated;
revoke all on function public.link_patient_to_current_user(text) from public;
grant execute on function public.link_patient_to_current_user(text) to authenticated;
revoke all on function public.register_medication_administration(uuid, text, boolean) from public;
grant execute on function public.register_medication_administration(uuid, text, boolean) to authenticated;
revoke all on function public.save_clinical_annotation(uuid, text, boolean) from public;
grant execute on function public.save_clinical_annotation(uuid, text, boolean) to authenticated;
revoke all on function public.remove_patient_link_for_current_user(uuid) from public;
grant execute on function public.remove_patient_link_for_current_user(uuid) to authenticated;

commit;
