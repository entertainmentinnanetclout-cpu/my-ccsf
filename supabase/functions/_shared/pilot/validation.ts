import { PilotHttpError } from './http.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requiredUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new PilotHttpError(400, `${field} must be a valid UUID.`, 'validation_error');
  }
  return value;
}

export function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requiredUuid(value, field);
}

export function requiredText(value: unknown, field: string, maxLength = 2000): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PilotHttpError(400, `${field} is required.`, 'validation_error');
  }
  const text = value.trim();
  if (text.length > maxLength) throw new PilotHttpError(400, `${field} is too long.`, 'validation_error');
  return text;
}

export function optionalText(value: unknown, field: string, maxLength = 2000): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new PilotHttpError(400, `${field} must be text.`, 'validation_error');
  const text = value.trim();
  if (text.length > maxLength) throw new PilotHttpError(400, `${field} is too long.`, 'validation_error');
  return text || null;
}

export function optionalNumber(value: unknown, field: string, min: number, max: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new PilotHttpError(400, `${field} is outside the accepted range.`, 'validation_error');
  }
  return value;
}

export function enumValue<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new PilotHttpError(400, `${field} is invalid.`, 'validation_error');
  }
  return value as T;
}

export function optionalBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
