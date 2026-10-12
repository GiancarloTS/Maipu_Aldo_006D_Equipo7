CREATE TYPE public.rol_usuario AS ENUM ('cuidador', 'familiar', 'medico');
CREATE TYPE public.relacion_paciente AS ENUM ('cuidador', 'familiar', 'medico');
CREATE TYPE public.medicamento_estado AS ENUM ('pendiente', 'administrado', 'aprobado', 'revision');
CREATE TYPE public.registro_estado AS ENUM ('pendiente', 'administrado', 'rechazado', 'observado');

CREATE TABLE public.usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  rol public.rol_usuario NOT NULL,
  telefono text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pacientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha_nacimiento date NOT NULL,
  rut text UNIQUE,
  codigo_qr_token text NOT NULL UNIQUE,
  alergias text,
  contacto_emergencia text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pacientes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.paciente_usuario (
  paciente_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  relacion public.relacion_paciente NOT NULL,
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT paciente_usuario_pkey PRIMARY KEY (paciente_id, usuario_id, relacion),
  CONSTRAINT paciente_usuario_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT paciente_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);

CREATE TABLE public.medicamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  recetado_por uuid NOT NULL,
  nombre text NOT NULL,
  dosis text NOT NULL,
  frecuencia_horas integer NOT NULL CHECK (frecuencia_horas > 0),
  hora_inicio time without time zone NOT NULL,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date,
  indicaciones text,
  estado public.medicamento_estado NOT NULL DEFAULT 'pendiente',
  aprobado_por uuid,
  fecha_aprobacion timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT medicamentos_pkey PRIMARY KEY (id),
  CONSTRAINT medicamentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT medicamentos_recetado_por_fkey FOREIGN KEY (recetado_por) REFERENCES public.usuarios(id),
  CONSTRAINT medicamentos_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuarios(id),
  CONSTRAINT medicamentos_vigencia_check CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE public.registro_medicacion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  medicamento_id uuid NOT NULL,
  registrado_por uuid NOT NULL,
  fecha_hora timestamp with time zone NOT NULL DEFAULT now(),
  estado public.registro_estado NOT NULL,
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT registro_medicacion_pkey PRIMARY KEY (id),
  CONSTRAINT registro_medicacion_medicamento_id_fkey FOREIGN KEY (medicamento_id) REFERENCES public.medicamentos(id),
  CONSTRAINT registro_medicacion_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id)
);

CREATE TABLE public.variables_salud (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  registrado_por uuid NOT NULL,
  tipo_variable text NOT NULL,
  valor text NOT NULL,
  unidad_medida text,
  fecha_hora timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT variables_salud_pkey PRIMARY KEY (id),
  CONSTRAINT variables_salud_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT variables_salud_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id)
);

CREATE TABLE public.anotaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  registrado_por uuid NOT NULL,
  contenido text NOT NULL,
  es_registro_voz boolean NOT NULL DEFAULT false,
  fecha_hora timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT anotaciones_pkey PRIMARY KEY (id),
  CONSTRAINT anotaciones_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT anotaciones_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id)
);
