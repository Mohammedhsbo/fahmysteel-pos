import type Database from 'better-sqlite3';
import { getSession } from '../../auth.js';
import { recordAudit } from '../audit.js';
import type { PaymentMethodOption, PaymentMethodSettings, PaymentMethodSettingsInput } from '../../../../shared/payment-methods.js';

const settingsId = 1;

function validateMobileNumber(value: string, label: string): string {
  const normalized = value.trim().replace(/\s+/g, '');
  if (!/^01[0125]\d{8}$/.test(normalized)) throw new Error(`${label} must be a valid Egyptian mobile number.`);
  return normalized;
}

  function validateInstaPay(value: string): string {
    const normalized = value.trim().replace(/\s+/g, '');
    if (!/^01[0125]\d{8}$/.test(normalized) && !/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}@[A-Za-z0-9.-]{2,63}$/.test(normalized)) {
      throw new Error('InstaPay number or account must be valid.');
    }
    return normalized;
  }

function getRow(database: Database.Database): PaymentMethodSettings {
  const row = database.prepare(`
    SELECT
      vodafone_cash_number AS vodafoneCashNumber,
      vodafone_cash_enabled AS vodafoneCashEnabled,
      instapay_number AS instaPayNumber,
      instapay_enabled AS instaPayEnabled,
      visa_enabled AS visaEnabled,
      updated_at AS updatedAt,
      updated_by AS updatedBy
    FROM payment_method_settings
    WHERE id = ?
  `).get(settingsId) as {
    vodafoneCashNumber: string | null;
    vodafoneCashEnabled: number;
    instaPayNumber: string | null;
    instaPayEnabled: number;
    visaEnabled: number;
    updatedAt: string;
    updatedBy: number | null;
  };

  return {
    ...row,
    vodafoneCashEnabled: row.vodafoneCashEnabled === 1,
    instaPayEnabled: row.instaPayEnabled === 1,
    visaEnabled: row.visaEnabled === 1,
  };
}

export function getPaymentMethodSettings(database: Database.Database): PaymentMethodSettings {
  return getRow(database);
}

export function updatePaymentMethodSettings(database: Database.Database, input: PaymentMethodSettingsInput): PaymentMethodSettings {
  const session = getSession();
  if (!session) throw new Error('Authentication required.');
  const vodafoneCashNumber = input.vodafoneCashNumber.trim();
  const instaPayNumber = input.instaPayNumber.trim();
  if (input.vodafoneCashEnabled) validateMobileNumber(vodafoneCashNumber, 'Vodafone Cash number');
    if (input.instaPayEnabled) validateInstaPay(instaPayNumber);
  const now = new Date().toISOString();
  database.prepare(`
    UPDATE payment_method_settings
    SET vodafone_cash_number = ?, vodafone_cash_enabled = ?, instapay_number = ?,
        instapay_enabled = ?, visa_enabled = ?, updated_at = ?, updated_by = ?
    WHERE id = ?
  `).run(
    vodafoneCashNumber || null,
    input.vodafoneCashEnabled ? 1 : 0,
    instaPayNumber || null,
    input.instaPayEnabled ? 1 : 0,
    input.visaEnabled ? 1 : 0,
    now,
    session.id,
    settingsId,
  );
  recordAudit(database, 'UPDATE', 'PAYMENT_METHOD_SETTINGS', settingsId, 'Updated payment method settings');
  return getRow(database);
}

export function listSalesPaymentMethods(database: Database.Database): PaymentMethodOption[] {
  const settings = getRow(database);
  const rows = database.prepare(`
    SELECT id, code, name
    FROM payment_methods
    WHERE code IN ('CASH', 'VODAFONE_CASH', 'INSTAPAY', 'VISA')
    ORDER BY CASE code WHEN 'CASH' THEN 1 WHEN 'VODAFONE_CASH' THEN 2 WHEN 'INSTAPAY' THEN 3 ELSE 4 END
  `).all() as Array<{ id: number; code: PaymentMethodOption['code']; name: string }>;
  return rows.filter((row) => {
    if (row.code === 'VODAFONE_CASH') return settings.vodafoneCashEnabled && Boolean(settings.vodafoneCashNumber);
    if (row.code === 'INSTAPAY') return settings.instaPayEnabled && Boolean(settings.instaPayNumber);
    if (row.code === 'VISA') return settings.visaEnabled;
    return true;
  }).map((row) => ({
    ...row,
    number: row.code === 'VODAFONE_CASH' ? settings.vodafoneCashNumber : row.code === 'INSTAPAY' ? settings.instaPayNumber : null,
  }));
}