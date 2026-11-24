# LinkCare — Gestión Centralizada del Cuidado de Pacientes

> **Proyecto de Título** — Ingeniería en Informática, Duoc UC.

## Descripción del Proyecto

### ¿Qué problema resuelve?

Actualmente, la información relacionada con el cuidado de adultos mayores o personas en situación de dependencia suele estar dispersa en cuadernos de papel, mensajes de texto o la memoria de los distintos involucrados. Esta falta de centralización genera:

* **Riesgo de errores:** Duplicidad u omisión en la administración de medicamentos.

* **Pérdida de tiempo:** Necesidad de reconstruir el historial médico en cada visita.

* **Baja visibilidad:** Dificultad para coordinar acciones entre familiares, cuidadores y personal médico.

### ¿Qué hace LinkCare?

**LinkCare** es una aplicación móvil diseñada para centralizar y gestionar en un único lugar toda la información del paciente:

* **Ficha Única del Paciente:** Historial de medicamentos, horarios, observaciones clínicas y variables de salud.

* **Control de Acceso por Roles:** Vistas y permisos diferenciados para *Familiares*, *Cuidadores* y *Equipo Médico*.

* **Acceso Rápido mediante Código QR:** Generación de tokens seguros y temporales para que médicos o personal de salud consulten la ficha del paciente de forma inmediata durante una visita.

* **Registro de Información por Voz:** Módulo manos libres para que los cuidadores ingresen notas y observaciones mediante comandos hablados.

### ¿A quién va dirigido?

* **Familiares:** Para monitorear el estado de salud, recibir reportes y verificar el cumplimiento de cuidados.

* **Cuidadores (Independientes o de Agencias):** Para registrar dosis administradas, alertas y bitácoras diarias.

* **Equipo Médico:** Para inspeccionar el historial clínico de forma rápida durante visitas domiciliarias o controles.

## Tecnologías Utilizadas

| Capa / Dominio | Tecnología / Herramienta | 
| ----- | ----- | 
| **Frontend Móvil** | [React Native](https://reactnative.dev/) | 
| **Backend / API** | [Node.js](https://nodejs.org/) con [Express](https://expressjs.com/) | 
| **Base de Datos & BaaS** | [Supabase](https://supabase.com/) (PostgreSQL con Row Level Security) | 
| **Autenticación & Seguridad** | JWT (JSON Web Tokens), Supabase Auth, Cifrado HTTPS/TLS, AES-256 | 
| **Integraciones** | Módulo de Voz (Speech-to-Text), Generación y Escaneo de Códigos QR | 
| **Control de Versiones** | Git / GitHub | 

## Arquitectura de la Solución

LinkCare implementa una **Arquitectura Cliente-Servidor en Tres Capas**:


![alt text](https://github.com/GiancarloTS/Maipu_Aldo_006D_Equipo7/blob/48305619d9f863d7bad3d933e1131cb1a7c99ab3/assets/arquitectura.png)


## Metodología de Trabajo

El equipo utiliza una **Metodología Ágil estructurada por Etapas Iterativas**, combinada con **Kanban** para la gestión del backlog y la priorización de tareas.

```
[ Análisis ] ➔ [ Diseño ] ➔ [ Desarrollo ] ➔ [ Pruebas ] ➔ [ Documentación ]

```

* **Gestión del Trabajo:** Uso de tableros Kanban (GitHub Projects / Trello) para asignación de tareas e Historias de Usuario.

* **Ciclo de Entrega:** Revisiones continuas y validación de entregables al finalizar cada fase académica (Capítulos del Informe APT).

* **Control de Calidad:** Pruebas funcionales e integración continua durante las etapas de desarrollo.

## Integrantes y Roles

| Integrante | Rol en el Proyecto | Responsabilidades Principales | 
| ----- | ----- | ----- | 
| **Giancarlo Trepiana** | *Lead Developer / QA* | Desarrollo frontend/backend, integración de API, implementación de pruebas funcionales y corrección de errores. | 
| **Andrés Saldívar** | *Software Architect / Data Analyst* | Análisis de requerimientos, modelamiento de base de datos relacional, arquitectura de solución y documentación técnica. | 

* **Profesor Guía:** Aldo Martínez

* **Institución:** Duoc UC — Sede Maipú

* **Asignatura:** Capstone (Proyecto APT)

## Instrucciones para Ejecutar el Proyecto Localmente

### Prerrequisitos

Asegúrate de tener instalado en tu máquina local:

* [Node.js](https://nodejs.org/) (v18.0 o superior)

* [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

* [Git](https://git-scm.com/)

* Aplicación **Expo Go** en tu dispositivo móvil o un emulador (Android Studio / Xcode).

### Pasos de Instalación

1. **Clonar el repositorio:**

   ```
   git clone https://github.com/TU_USUARIO/linkcare.git
   cd linkcare
   
   ```

2. **Configurar las Variables de Entorno (`.env`):**
   Crea un archivo `.env` en la raíz del proyecto backend con las siguientes claves:

   ```
   PORT=3000
   SUPABASE_URL=tu_supabase_project_url
   SUPABASE_ANON_KEY=tu_supabase_anon_key
   
   ```

3. **Instalar dependencias del Backend:**

   ```
   cd backend
   npm install
   
   ```

4. **Iniciar el servidor Backend:**

   ```
   npm run dev
   
   ```

5. **Instalar dependencias del Frontend:**

   ```
   cd ../frontend
   npm install
   
   ```

6. **Iniciar la Aplicación Móvil:**

   ```
   npx expo start
   
   ```

   * Escanea el código QR generado en la consola usando la app **Expo Go** (Android) o la cámara nativa (iOS).
