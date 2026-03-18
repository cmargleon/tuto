# MVP de Prueba Virtual para Catálogo

Herramienta interna para generar imágenes de catálogo ecommerce con un flujo simple de prueba virtual:

- registrar clientes para vincular cada lote
- crear modelos con cliente e imágenes de pose en un solo guardado
- subir un lote temporal de prendas dentro del wizard
- crear trabajos por cada combinación `pose x prenda`
- procesar la cola con un proceso en segundo plano
- evaluar resultados agrupados por prenda
- regenerar cualquier tarjeta cambiando prompt y proveedor
- guardar los resultados generados en storage privado configurable, con soporte para S3

## Tecnologías

- Backend: Node.js, Express, TypeScript, SQLite, better-sqlite3, multer, AWS S3 SDK
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
- `STORAGE_DRIVER` predeterminado `local`. Usa `s3` para guardar modelos, prendas y resultados en Amazon S3.
- `UPLOAD_ROOT` predeterminado `../uploads`
- `UPLOAD_MAX_FILE_SIZE_MB` predeterminado `20`
- `WORKER_POLL_INTERVAL_MS` predeterminado `5000`
- `OPENAI_BASE_URL` predeterminado `https://api.openai.com/v1`
- `AWS_REGION` región del bucket S3
- `AWS_S3_BUCKET` nombre del bucket privado
- `AWS_S3_PREFIX` prefijo opcional dentro del bucket
- `AWS_S3_ENDPOINT` opcional para entornos compatibles con S3
- `AWS_S3_FORCE_PATH_STYLE` usa `true` solo si tu endpoint lo necesita
- `AWS_S3_SIGNED_URL_TTL_SECONDS` duración en segundos de las URLs firmadas para servir imágenes
- `VITE_API_BASE_URL` déjalo vacío para el proxy local de desarrollo o define la URL del backend en otros entornos

Para autenticación de AWS, el backend usa la cadena estándar de credenciales del SDK de AWS. En local puedes apoyarte en:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` si aplica
- o un perfil/configuración local de AWS ya disponible en tu máquina

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
- `GET /api/jobs/current`
- `POST /api/jobs/:id/regenerate`
- `GET /api/archive/clients`
- `GET /api/archive/clients/:clientId/batches?page=1&pageSize=20`
- `GET /api/archive/batches/:batchId`
- `GET /api/storage`
- `POST /api/storage/presign`
- `GET /api/assets?path=...`

## Notas

- El esquema SQLite está en `database/schema.sql`.
- En `local`, los archivos subidos se guardan en `uploads/models`, `uploads/garments` y `uploads/generated`.
- En `s3`, la base guarda rutas tipo `s3://bucket/key` y las imágenes se sirven por URLs firmadas a través de `/api/assets`.
- Con `STORAGE_DRIVER=s3`, las subidas de modelos y prendas se hacen directo desde el navegador al bucket usando URLs firmadas.
- Para esas subidas directas, el bucket necesita una política CORS que permita `PUT` desde el origen del frontend.
- Los clientes se guardan en SQLite y cada trabajo queda asociado al cliente elegido al inicio del wizard.
- Las prendas ya no tienen una biblioteca persistente ni una tabla propia; se guardan asociadas a los trabajos creados desde el wizard.
- El proceso de trabajos en segundo plano es un sondeo que corre dentro del backend.
- Los trabajos quedan con estado `pending`, `processing`, `completed` o `failed` en la base de datos.
- Cada trabajo conserva solo la imagen generada más reciente; al regenerar, se reemplaza la versión anterior y se limpia el archivo viejo del storage.
- El archivo consulta clientes, lotes paginados por cliente y detalle del lote seleccionado, en vez de cargar todo el historial de una vez.

## Migrar archivos existentes a S3

Si ya tienes archivos en `uploads/` y quieres moverlos al bucket:

```bash
cd backend
npm run migrate:s3
```

Ese script:

- sube a S3 los archivos referenciados en `model_images`, `jobs.garment_file_path` y `job_outputs.result_image`
- actualiza la base para apuntar a las nuevas rutas `s3://...`
- no borra los archivos locales, para que puedas validarlo antes de limpiar disco
