<div align="center">
  <h1 style="font-size: 3rem; margin-bottom: 0;">🎹</h1>
  <h1>Harmony App - Sistema de Gestión de Academias</h1>
  <p><strong>Plataforma moderna y profesional para la administración de academias, alumnos y agendamiento inteligente.</strong></p>
  <p><em>"Gestiona tus clases en perfecta armonía."</em></p>
</div>

---

## 🚀 Sobre Harmony

**Harmony App** es un sistema inteligente tipo SaaS diseñado para la gestión eficiente de múltiples academias, control de asistencia, seguimiento de alumnos, portal de estudiantes y manejo de pagos o renovaciones.

Construido con un enfoque en **diseño premium**, **alta usabilidad** (basado en drag & drop) y **seguridad de datos**, Harmony permite a las instituciones educativas y educadores independientes tomar el control total de sus clases sin fricciones. Listo para despliegue en Vercel.

### ✨ Características Principales

- 🎓 **Gestión de Alumnos y Planes:** Seguimiento de alumnos por plan (Mensual, Trimestral), frecuencia de asistencia y perfiles vinculados.
- 📅 **Calendario Inteligente (Schedule):** Panel visual con *drag & drop* para reagendar clases. Sistema automático para **bloquear días y feriados** que desplaza inteligentemente todas las clases en el tiempo sin perder sesiones.
- 👥 **Gestión de Equipo:** Sistema de roles (Propietario, Admin, Colaborador, Alumno) con invitaciones seguras.
- 📱 **Portal del Alumno:** Interfaz dedicada para que los alumnos puedan ver su historial de clases, próximas sesiones y estado de su plan.
- 🎨 **Diseño Premium:** Interfaz prístina con tipografía `Rubik`, paleta de colores cuidadosamente seleccionada (`#0082cc`, `#e86d11`, `#f4a305`, `#a5d8f7`), glassmorphism y micro-interacciones fluidas.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS v4 + UI Custom Glassmorphism
- **Estado:** Zustand (Gestión global de auth, workspaces y notificaciones)
- **Backend / BaaS:** Supabase (PostgreSQL, Autenticación, Row Level Security)
- **Iconografía:** Lucide React
- **Enrutamiento:** React Router DOM v7
- **Despliegue:** Optimizado para Vercel (`vercel.json` incluido)

## 📦 Instalación y Desarrollo Local

1. Clona este repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura tus variables de entorno en un archivo `.env` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 🔒 Seguridad (Supabase RLS)

Harmony utiliza **Row Level Security (RLS)** a nivel de base de datos para garantizar el aislamiento total de los datos. Ningún usuario puede acceder a la información de una academia (`workspace`) si no es miembro oficial de la misma, protegiendo totalmente la privacidad de los alumnos y la información financiera.

---
<div align="center">
  Hecho con excelencia para potenciar el sector educativo.
</div>
