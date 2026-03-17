# MVP de Prueba Virtual para Catálogo

Herramienta interna para generar imágenes de catálogo ecommerce con un flujo simple de prueba virtual:

- registrar clientes para vincular cada lote
- crear modelos con cliente e imágenes de pose en un solo guardado
- subir un lote temporal de prendas dentro del wizard
- crear trabajos por cada combinación `pose x prenda`
- procesar la cola con un proceso en segundo plano
- evaluar resultados agrupados por prenda
- regenerar cualquier tarjeta cambiando prompt y proveedor
- guardar los resultados generados localmente en `/uploads/generated`

## Tecnologías

- Backend: Node.js, Express, TypeScript, SQLite, better-sqlite3, multer
- Frontend: React, Vite, TypeScript, CoreUI React
- Proveedores de IA:
  - fal.ai seedream
  - fal.ai banana-pro
  - OpenAI gpt-image-1.5

## Estructura del proyecto

```text
backend/
frontend/
database/
uploads/
```

## Entorno

Copia el archivo de ejemplo en la raíz y completa las credenciales del proveedor que quieras usar:

```bash
cp .env.example .env
```

Claves requeridas para generar:

- `FAL_KEY`
- `OPENAI_API_KEY`

Configuraciones opcionales:

- `PORT` predeterminado `4000`
- `DATABASE_PATH` predeterminado `../database/app.db`
- `UPLOAD_ROOT` predeterminado `../uploads`
- `WORKER_POLL_INTERVAL_MS` predeterminado `5000`
- `OPENAI_BASE_URL` predeterminado `https://api.openai.com/v1`
- `VITE_API_BASE_URL` déjalo vacío para el proxy local de desarrollo o define la URL del backend en otros entornos

## Instalación

```bash
npm install
```

## Ejecución local

Inicia backend y frontend juntos:

```bash
npm run dev
```

Aplicaciones:

- Frontend: `http://localhost:5173`
- API backend: `http://localhost:4000`
- Si abres `http://localhost:4000` en modo desarrollo sin una compilación del frontend, el backend mostrará una página de ayuda en lugar de un JSON 404.

## Compilación de producción

```bash
npm run build
```

Inicia la app completa en el puerto `4000`:

```bash
npm run start
```

Ese comando compila frontend y backend, y luego sirve la app de React y la API desde el mismo servidor Express.

## Rutas principales

- `POST /api/clients`
- `GET /api/clients`
- `POST /api/models`
- `GET /api/models`
- `POST /api/generate`
- `GET /api/jobs`
- `POST /api/jobs/:id/regenerate`

## Notas

- El esquema SQLite está en `database/schema.sql`.
- Los archivos subidos se guardan en `uploads/models`, `uploads/garments` y `uploads/generated`.
- Los clientes se guardan en SQLite y cada trabajo queda asociado al cliente elegido al inicio del wizard.
- Las prendas ya no tienen una biblioteca persistente ni una tabla propia; se guardan asociadas a los trabajos creados desde el wizard.
- El proceso de trabajos en segundo plano es un sondeo que corre dentro del backend.
- Los trabajos quedan con estado `pending`, `processing`, `completed` o `failed` en la base de datos.
- Cada trabajo puede acumular varias versiones generadas en `job_outputs`, permitiendo revisar historial y miniaturas desde la pantalla de evaluación.
