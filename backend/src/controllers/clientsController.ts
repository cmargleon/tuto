import type { RequestHandler } from 'express';
import { createClient, deleteClient, listClients, updateClient } from '../services/clientService';
import { AppError } from '../utils/appError';

export const getClients: RequestHandler = (_req, res) => {
  res.json(listClients());
};

export const postClient: RequestHandler = (req, res) => {
  const client = createClient(String(req.body.name ?? ''));
  res.status(201).json(client);
};

export const putClient: RequestHandler = (req, res) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    throw new AppError('Id de cliente inválido.');
  }

  const client = updateClient(clientId, String(req.body.name ?? ''));
  res.json(client);
};

export const deleteClientById: RequestHandler = async (req, res) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    throw new AppError('Id de cliente inválido.');
  }

  await deleteClient(clientId);
  res.status(204).send();
};
