begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.rol_usuario;
  v_name text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'familiar' then 'familiar'::public.rol_usuario
    when new.raw_user_meta_data ->> 'role' = 'medico' then 'medico'::public.rol_usuario
    else 'cuidador'::public.rol_usuario
  end;
  v_name := nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), '');

  insert into public.usuarios (id, nombre, email, rol, activo)
  values (
    new.id,
    coalesce(v_name, 'Usuario'),
    new.email,
    v_role,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

commit;
