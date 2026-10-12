-- Seed para la estructura real del proyecto LinkCare.
-- Requiere que los usuarios ya existan en auth.users.
-- Los UUIDs deben coincidir con los usuarios creados en Supabase Auth.

INSERT INTO public.pacientes (
  id,
  nombre,
  fecha_nacimiento,
  rut,
  codigo_qr_token,
  alergias,
  contacto_emergencia
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Elena Ribeiro',
  '1946-05-18',
  '12.345.678-9',
  'LKC-ELENA-001',
  'Penicilina',
  'Hermana: +56911112222'
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  fecha_nacimiento = EXCLUDED.fecha_nacimiento,
  rut = EXCLUDED.rut,
  codigo_qr_token = EXCLUDED.codigo_qr_token,
  alergias = EXCLUDED.alergias,
  contacto_emergencia = EXCLUDED.contacto_emergencia;

INSERT INTO public.usuarios (
  id,
  nombre,
  email,
  rol,
  telefono,
  activo
) VALUES
  (
    '22222222-2222-4222-8222-222222222222',
    'Dr. Luis Mora',
    'medico@linkcare.cl',
    'medico',
    '+56900000001',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Ana Silva',
    'cuidador@linkcare.cl',
    'cuidador',
    '+56900000002',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'José Ribeiro',
    'familiar@linkcare.cl',
    'familiar',
    '+56900000003',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  email = EXCLUDED.email,
  rol = EXCLUDED.rol,
  telefono = EXCLUDED.telefono,
  activo = EXCLUDED.activo;

INSERT INTO public.paciente_usuario (
  paciente_id,
  usuario_id,
  relacion,
  es_principal
) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'cuidador',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444',
    'familiar',
    false
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'medico',
    false
  )
ON CONFLICT (paciente_id, usuario_id, relacion) DO NOTHING;

INSERT INTO public.medicamentos (
  id,
  paciente_id,
  recetado_por,
  nombre,
  dosis,
  frecuencia_horas,
  hora_inicio,
  indicaciones,
  estado,
  aprobado_por,
  fecha_aprobacion
) VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'Metformina 850mg',
    '850mg',
    12,
    '08:00:00',
    'Tomar con desayuno.',
    'administrado',
    '22222222-2222-4222-8222-222222222222',
    NOW()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'Enalapril 10mg',
    '10mg',
    24,
    '21:00:00',
    'Tomar antes de dormir.',
    'pendiente',
    NULL,
    NULL
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'Vitamina D3',
    '1000 UI',
    24,
    '12:30:00',
    'Tomar con la comida.',
    'aprobado',
    '22222222-2222-4222-8222-222222222222',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  paciente_id = EXCLUDED.paciente_id,
  recetado_por = EXCLUDED.recetado_por,
  nombre = EXCLUDED.nombre,
  dosis = EXCLUDED.dosis,
  frecuencia_horas = EXCLUDED.frecuencia_horas,
  hora_inicio = EXCLUDED.hora_inicio,
  indicaciones = EXCLUDED.indicaciones,
  estado = EXCLUDED.estado,
  aprobado_por = EXCLUDED.aprobado_por,
  fecha_aprobacion = EXCLUDED.fecha_aprobacion;

INSERT INTO public.registro_medicacion (
  id,
  medicamento_id,
  registrado_por,
  estado,
  observaciones
) VALUES
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'administrado',
    'Se registró con desayuno.'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '44444444-4444-4444-8444-444444444444',
    'pendiente',
    'No confirmado todavía.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.variables_salud (
  id,
  paciente_id,
  registrado_por,
  tipo_variable,
  valor,
  unidad_medida
) VALUES
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'presion',
    '135/85',
    'mmHg'
  ),
  (
    '10101010-1010-4101-8101-101010101010',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'glucosa',
    '96',
    'mg/dL'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.anotaciones (
  id,
  paciente_id,
  registrado_por,
  contenido,
  es_registro_voz
) VALUES
  (
    '11111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'Se registró mareo leve durante la tarde, sin urgencias.',
    false
  ),
  (
    '11111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'Control clínico actualizado. Presión 135/85.',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  paciente_id = EXCLUDED.paciente_id,
  registrado_por = EXCLUDED.registrado_por,
  contenido = EXCLUDED.contenido,
  es_registro_voz = EXCLUDED.es_registro_voz;
