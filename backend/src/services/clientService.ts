import { db } from '../db';
import type { ClientRecord } from '../types/domain';
import { AppError } from '../utils/appError';

interface DbClientRow {
  id: number;
  name: string;
  created_at: string;
}

const mapClient = (row: DbClientRow): ClientRecord => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

export const getClientById = (clientId: number): ClientRecord | null => {
  const row = db.prepare('SELECT id, name, created_at FROM clients WHERE id = ?').get(clientId) as DbClientRow | undefined;
  return row ? mapClient(row) : null;
};

export const listClients = (): ClientRecord[] => {
  const rows = db.prepare('SELECT id, name, created_at FROM clients ORDER BY created_at DESC, id DESC').all() as DbClientRow[];
  return rows.map(mapClient);
};

export const createClient = (name: string): ClientRecord => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new AppError('El nombre del cliente es obligatorio.');
  }

  const result = db.prepare('INSERT INTO clients (name) VALUES (?)').run(trimmedName);
  const client = getClientById(Number(result.lastInsertRowid));

  if (!client) {
    throw new AppError('No se pudo crear el cliente.', 500);
  }

  return client;
};

export const updateClient = (clientId: number, name: string): ClientRecord => {
  const existingClient = getClientById(clientId);

  if (!existingClient) {
    throw new AppError('Cliente no encontrado.', 404);
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new AppError('El nombre del cliente es obligatorio.');
  }

  db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(trimmedName, clientId);

  const updatedClient = getClientById(clientId);

  if (!updatedClient) {
    throw new AppError('No se pudo cargar el cliente actualizado.', 500);
  }

  return updatedClient;
};

export const deleteClient = (clientId: number): void => {
  const existingClient = getClientById(clientId);

  if (!existingClient) {
    throw new AppError('Cliente no encontrado.', 404);
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
};
