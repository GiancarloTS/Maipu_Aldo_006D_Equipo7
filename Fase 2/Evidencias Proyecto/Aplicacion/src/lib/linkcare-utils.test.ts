import assert from 'node:assert/strict';
import test from 'node:test';

import { formatTime, mapStatus } from './linkcare-utils.ts';

test('formatTime convierte time sin zona a formato legible', () => {
  assert.equal(formatTime('08:00:00'), '8:00 AM');
  assert.equal(formatTime('21:00:00'), '9:00 PM');
});

test('mapStatus convierte estados del backend a etiquetas visuales', () => {
  assert.equal(mapStatus('administrado'), 'Tomado');
  assert.equal(mapStatus('pendiente'), 'Pendiente');
  assert.equal(mapStatus('aprobado'), 'Aprobado');
});
