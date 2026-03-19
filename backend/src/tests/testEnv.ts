// Must run before any module that imports config/env.ts or db/index.ts
process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = 'test';
