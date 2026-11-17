import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAge, formatTime, getCurrentMedicationStatus, mapStatus } from './linkcare-utils.ts';

test('calculateAge valida fecha y considera si ya pasó el cumpleaños', () => {
  assert.equal(calculateAge('2000-11-11', new Date(2026, 10, 10)), 25);
  assert.equal(calculateAge('2000-11-09', new Date(2026, 10, 10)), 26);
  assert.equal(calculateAge('2027-01-01', new Date(2026, 10, 10)), null);
  assert.equal(calculateAge('2001-02-29', new Date(2026, 10, 10)), null);
});

test('formatTime convierte time sin zona a formato legible', () => {
  assert.equal(formatTime('08:00:00'), '8:00 AM');
  assert.equal(formatTime('21:00:00'), '9:00 PM');
});

test('mapStatus convierte estados del backend a etiquetas visuales', () => {
  assert.equal(mapStatus('administrado'), 'Tomado');
  assert.equal(mapStatus('pendiente'), 'Pendiente');
  assert.equal(mapStatus('aprobado'), 'Aprobado');
});

test('getCurrentMedicationStatus refleja una dosis reciente y respeta su frecuencia', () => {
  const now = Date.parse('2026-11-16T12:00:00.000Z');

  assert.equal(getCurrentMedicationStatus('aprobado', 8, '2026-11-16T08:00:00.000Z', now), 'administrado');
  assert.equal(getCurrentMedicationStatus('aprobado', 8, '2026-11-16T03:00:00.000Z', now), 'aprobado');
  assert.equal(getCurrentMedicationStatus('pendiente', 8, '2026-11-16T11:00:00.000Z', now), 'pendiente');
});
