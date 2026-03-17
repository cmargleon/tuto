import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes';
import { env } from './config/env';
import { AppError } from './utils/appError';

export const createApp = () => {
  const app = express();
  const frontendDistPath = path.resolve(env.projectRoot, 'frontend', 'dist');
  const frontendIndexPath = path.resolve(frontendDistPath, 'index.html');
  const hasBuiltFrontend = fs.existsSync(frontendIndexPath);

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(env.uploadRoot));

  app.use('/api', (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs}ms`,
      );
    });

    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRoutes);

  if (hasBuiltFrontend) {
    app.use(express.static(frontendDistPath));
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.sendFile(frontendIndexPath);
    });
  } else {
    app.get('/', (_req, res) => {
      res.type('html').send(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Estudio de Prueba Virtual</title>
            <style>
              body {
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                background: linear-gradient(180deg, #f8f3ed 0%, #efe7dd 100%);
                color: #1c2533;
              }
              main {
                max-width: 760px;
                margin: 80px auto;
                padding: 32px;
                border-radius: 24px;
                background: rgba(255, 255, 255, 0.9);
                box-shadow: 0 24px 60px rgba(28, 37, 51, 0.12);
              }
              h1 { margin-top: 0; }
              code {
                padding: 2px 8px;
                border-radius: 999px;
                background: rgba(28, 37, 51, 0.08);
              }
              a { color: #0c5c63; }
            </style>
          </head>
          <body>
            <main>
              <p><strong>Estudio de Prueba Virtual</strong></p>
              <h1>El backend está en ejecución.</h1>
              <p>Todavía no se encontró la compilación del frontend.</p>
              <p>Para desarrollo, abre <a href="http://localhost:5173">http://localhost:5173</a>.</p>
              <p>Para usar una sola app en el puerto <code>4000</code>, ejecuta <code>npm run build</code> y luego <code>npm run start</code>.</p>
              <p>La verificación de salud de la API está disponible en <a href="/api/health">/api/health</a>.</p>
            </main>
          </body>
        </html>
      `);
    });
  }

  app.use((req, _res, next) => {
    next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Error interno del servidor';

    res.status(statusCode).json({
      message,
    });
  });

  return app;
};
