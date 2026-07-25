# Roadmap: Current V2 y Tareas Futuras

Este documento recopila las próximas características, mejoras de seguridad e integraciones planificadas para las siguientes iteraciones de Current.

## 1. Seguridad Proactiva (Alta Prioridad) 🛡️

*   **Autenticación Multifactor (MFA):** Implementar MFA (TOTP o SMS) a través de Supabase Auth para proteger las cuentas de los administradores y evitar accesos no autorizados a los almacenes.
*   **Registros de Auditoría (Audit Logs):** Crear un sistema de logging inmutable a nivel de base de datos (`audit_logs`) que registre acciones críticas (quién eliminó un producto, quién vació el stock, accesos sospechosos) junto con timestamps e IPs si es posible.
*   **Revisión Estricta de RLS:** Auditar las políticas de Row Level Security (RLS) en Supabase para asegurar que ninguna consulta malformada o intento de API directa pueda filtrar datos de un `workspace_id` a un usuario no miembro.
*   **Control de Sesión Activa:** Forzar cierres de sesión automáticos por inactividad y gestión de dispositivos conectados.

## 2. Comunicaciones y Notificaciones 📧

*   **Integración con Resend:**
    *   **Invitaciones de Equipo:** Enviar correos transaccionales hermosos a los nuevos colaboradores con un botón mágico para unirse al almacén usando su código de invitación.
    *   **Alertas de Stock Crítico:** Envío de un resumen semanal o alertas inmediatas por correo cuando el inventario de un producto vital caiga por debajo del umbral mínimo.
    *   **Flujos de Autenticación:** Mejorar el restablecimiento de contraseñas y correos de bienvenida.

## 3. Reportes y Exportación 📊

*   **Exportación de Datos:** Añadir botones para exportar las tablas (Inventario, Transacciones, Historial) a formatos **CSV y Excel**.
*   **Reportes PDF Ejecutivos:** Generación automatizada de PDFs con el resumen mensual del *Dashboard* (Ingresos, Gastos, Top Productos Vendidos).

## 4. UI/UX Avanzado ✨

*   **Selector de Temas (Light / Dark Mode):** Reintroducir el diseño *OLED Dark Mode* como un toggle opcional, permitiendo a los usuarios cambiar libremente entre el *Clean Light Mode* actual y la versión oscura.
*   **Optimización de Carga (Code Splitting):** Dividir el bundle de Vite con `React.lazy()` para reducir el tamaño de carga inicial a menos de 500KB.

