import type Database from 'better-sqlite3';
import type { CustomerRecord, PartyInput, SupplierRecord } from '../../../../shared/contacts.js';

function normalizeSearch(search?: string): string {
  return `%${(search ?? '').trim()}%`;
}

function sanitizeInput(input: PartyInput): Required<PartyInput> {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required.');

  return {
    name,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export function listCustomers(database: Database.Database, search?: string): CustomerRecord[] {
  const term = normalizeSearch(search);
  return database.prepare(`
    SELECT
      id,
      name,
      phone,
      address,
      notes,
      is_active AS isActive,
      archived_at AS archivedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM customers
    WHERE is_active = 1
      AND archived_at IS NULL
      AND (
        name LIKE ?
        OR COALESCE(phone, '') LIKE ?
        OR COALESCE(address, '') LIKE ?
        OR COALESCE(notes, '') LIKE ?
      )
    ORDER BY name COLLATE NOCASE
  `).all(term, term, term, term) as CustomerRecord[];
}

export function getCustomerById(database: Database.Database, customerId: number): CustomerRecord | null {
  const row = database.prepare(`
    SELECT
      id,
      name,
      phone,
      address,
      notes,
      is_active AS isActive,
      archived_at AS archivedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM customers
    WHERE id = ?
  `).get(customerId) as CustomerRecord | undefined;

  return row ?? null;
}

export function createCustomer(database: Database.Database, input: PartyInput): CustomerRecord {
  const payload = sanitizeInput(input);
  const now = new Date().toISOString();

  const result = database.prepare(`
    INSERT INTO customers (name, phone, address, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(payload.name, payload.phone, payload.address, payload.notes, now, now);

  return getCustomerById(database, Number(result.lastInsertRowid))!;
}

export function updateCustomer(database: Database.Database, customerId: number, input: Partial<PartyInput>): CustomerRecord {
  const existing = getCustomerById(database, customerId);
  if (!existing) throw new Error('Customer not found.');

  const payload = {
    name: input.name?.trim() ?? existing.name,
    phone: input.phone?.trim() ?? existing.phone,
    address: input.address?.trim() ?? existing.address,
    notes: input.notes?.trim() ?? existing.notes,
  };

  if (!payload.name) throw new Error('Customer name is required.');

  database.prepare(`
    UPDATE customers
    SET name = ?, phone = ?, address = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(payload.name, payload.phone || null, payload.address || null, payload.notes || null, new Date().toISOString(), customerId);

  return getCustomerById(database, customerId)!;
}

export function archiveCustomer(database: Database.Database, customerId: number): void {
  const existing = getCustomerById(database, customerId);
  if (!existing) throw new Error('Customer not found.');

  database.prepare(`
    UPDATE customers
    SET is_active = 0, archived_at = ?, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), new Date().toISOString(), customerId);
}

export function listSuppliers(database: Database.Database, search?: string): SupplierRecord[] {
  const term = normalizeSearch(search);
  return database.prepare(`
    SELECT
      id,
      name,
      phone,
      address,
      notes,
      is_active AS isActive,
      archived_at AS archivedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM suppliers
    WHERE is_active = 1
      AND archived_at IS NULL
      AND (
        name LIKE ?
        OR COALESCE(phone, '') LIKE ?
        OR COALESCE(address, '') LIKE ?
        OR COALESCE(notes, '') LIKE ?
      )
    ORDER BY name COLLATE NOCASE
  `).all(term, term, term, term) as SupplierRecord[];
}

export function getSupplierById(database: Database.Database, supplierId: number): SupplierRecord | null {
  const row = database.prepare(`
    SELECT
      id,
      name,
      phone,
      address,
      notes,
      is_active AS isActive,
      archived_at AS archivedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM suppliers
    WHERE id = ?
  `).get(supplierId) as SupplierRecord | undefined;

  return row ?? null;
}

export function createSupplier(database: Database.Database, input: PartyInput): SupplierRecord {
  const payload = sanitizeInput(input);
  const now = new Date().toISOString();

  const result = database.prepare(`
    INSERT INTO suppliers (name, phone, address, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(payload.name, payload.phone, payload.address, payload.notes, now, now);

  return getSupplierById(database, Number(result.lastInsertRowid))!;
}

export function updateSupplier(database: Database.Database, supplierId: number, input: Partial<PartyInput>): SupplierRecord {
  const existing = getSupplierById(database, supplierId);
  if (!existing) throw new Error('Supplier not found.');

  const payload = {
    name: input.name?.trim() ?? existing.name,
    phone: input.phone?.trim() ?? existing.phone,
    address: input.address?.trim() ?? existing.address,
    notes: input.notes?.trim() ?? existing.notes,
  };

  if (!payload.name) throw new Error('Supplier name is required.');

  database.prepare(`
    UPDATE suppliers
    SET name = ?, phone = ?, address = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(payload.name, payload.phone || null, payload.address || null, payload.notes || null, new Date().toISOString(), supplierId);

  return getSupplierById(database, supplierId)!;
}

export function archiveSupplier(database: Database.Database, supplierId: number): void {
  const existing = getSupplierById(database, supplierId);
  if (!existing) throw new Error('Supplier not found.');

  database.prepare(`
    UPDATE suppliers
    SET is_active = 0, archived_at = ?, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), new Date().toISOString(), supplierId);
}
