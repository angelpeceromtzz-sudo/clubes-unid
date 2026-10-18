// Pruebas de la matriz de permisos de notificaciones (auditoría H7).
// Datos ficticios; función pura sin BD ni red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCreacionNotificacion } from '../lib/notificacionPermisos.js';

// Club ficticio 7: presidente id 50, vicepresidente id 51.
const CLUB_PROPIO = { id_club: 7, id_presidente: 50, id_vicepresidente: 51 };
const CLUB_OTRO = { id_club: 8, id_presidente: 60, id_vicepresidente: 61 };

function validar(params) {
  return validarCreacionNotificacion({
    idRol: 1,
    idEmisor: 100,
    audiencia: 'global',
    idClub: null,
    idDestinatario: null,
    club: null,
    ...params,
  });
}

// --- Rol 1 (alumno): sin emisión ---

test('alumno no puede crear notificaciones con ninguna audiencia', () => {
  for (const audiencia of ['global', 'presidentes', 'alumnos', 'club']) {
    const r = validar({ idRol: 1, idEmisor: 100, audiencia, idClub: 7, club: CLUB_PROPIO });
    assert.equal(r.permitido, false);
    assert.equal(r.status, 403);
  }
});

// --- Roles 2/5 (líderes): solo su club ---

test('presidente puede avisar a su propio club', () => {
  const r = validar({ idRol: 2, idEmisor: 50, audiencia: 'club', idClub: 7, club: CLUB_PROPIO });
  assert.equal(r.permitido, true);
  assert.deepEqual(r.valores, { id_club: 7, id_destinatario: null });
});

test('vicepresidente puede avisar a su club', () => {
  const r = validar({ idRol: 5, idEmisor: 51, audiencia: 'club', idClub: 7, club: CLUB_PROPIO });
  assert.equal(r.permitido, true);
});

test('presidente NO puede avisar a otro club', () => {
  const r = validar({ idRol: 2, idEmisor: 50, audiencia: 'club', idClub: 8, club: CLUB_OTRO });
  assert.equal(r.permitido, false);
  assert.equal(r.status, 403);
  assert.equal(r.error, 'No eres líder de este club');
});

test('vicepresidente NO puede avisar a otro club', () => {
  const r = validar({ idRol: 5, idEmisor: 51, audiencia: 'club', idClub: 8, club: CLUB_OTRO });
  assert.equal(r.permitido, false);
  assert.equal(r.status, 403);
});

test('líder no puede usar audiencias globales', () => {
  for (const audiencia of ['global', 'presidentes', 'alumnos']) {
    const r = validar({ idRol: 2, idEmisor: 50, audiencia });
    assert.equal(r.permitido, false);
    assert.equal(r.status, 403);
  }
});

test('líder sin id_club recibe 400 y con club inexistente 404', () => {
  const sinClub = validar({ idRol: 2, idEmisor: 50, audiencia: 'club' });
  assert.equal(sinClub.status, 400);
  const clubInexistente = validar({ idRol: 2, idEmisor: 50, audiencia: 'club', idClub: 999, club: null });
  assert.equal(clubInexistente.status, 404);
});

test('líder no puede enviar notificaciones personales (id_destinatario)', () => {
  const r = validar({
    idRol: 2,
    idEmisor: 50,
    audiencia: 'club',
    idClub: 7,
    club: CLUB_PROPIO,
    idDestinatario: 100,
  });
  assert.equal(r.permitido, false);
  assert.equal(r.status, 403);
});

// --- Roles 3/4 (admin / rectoría) ---

test('admin puede audiencias globales sin club ni destinatario', () => {
  for (const audiencia of ['global', 'presidentes', 'alumnos']) {
    const r = validar({ idRol: 3, idEmisor: 10, audiencia });
    assert.equal(r.permitido, true);
    assert.deepEqual(r.valores, { id_club: null, id_destinatario: null });
  }
});

test('admin puede enviar a un club existente', () => {
  const r = validar({ idRol: 3, idEmisor: 10, audiencia: 'club', idClub: 7, club: CLUB_PROPIO });
  assert.equal(r.permitido, true);
  assert.equal(r.valores.id_club, 7);
});

test('admin recibe 404 si el club no existe (antes dependía del FK)', () => {
  const r = validar({ idRol: 3, idEmisor: 10, audiencia: 'club', idClub: 999, club: null });
  assert.equal(r.permitido, false);
  assert.equal(r.status, 404);
});

test('admin puede usar id_destinatario válido y recibe 400 si no es entero positivo', () => {
  const ok = validar({ idRol: 3, idEmisor: 10, audiencia: 'global', idDestinatario: 100 });
  assert.equal(ok.permitido, true);
  assert.equal(ok.valores.id_destinatario, 100);
  for (const invalido of ['100', -5, 3.5, 0]) {
    const r = validar({ idRol: 3, idEmisor: 10, audiencia: 'global', idDestinatario: invalido });
    assert.equal(r.permitido, false, `id_destinatario=${invalido} debía rechazarse`);
    assert.equal(r.status, 400);
  }
});

test('rectoría (rol 4) tiene las mismas audiencias que admin (regla a confirmar)', () => {
  const global4 = validar({ idRol: 4, idEmisor: 11, audiencia: 'global' });
  assert.equal(global4.permitido, true);
  const club4 = validar({ idRol: 4, idEmisor: 11, audiencia: 'club', idClub: 7, club: CLUB_PROPIO });
  assert.equal(club4.permitido, true);
});

// --- Validaciones generales ---

test('audiencia desconocida se rechaza con 400 para cualquier rol', () => {
  for (const idRol of [1, 2, 3, 4, 5]) {
    const r = validar({ idRol, idEmisor: 10, audiencia: 'todos' });
    assert.equal(r.status, 400);
    assert.equal(r.error, 'Audiencia no válida');
  }
});

test('rol inválido se rechaza con 403', () => {
  const r = validar({ idRol: 99, idEmisor: 10, audiencia: 'global' });
  assert.equal(r.status, 403);
});

test('con audiencia distinta de club, id_club se normaliza a null (comportamiento previo)', () => {
  const r = validar({ idRol: 3, idEmisor: 10, audiencia: 'global', idClub: 7, club: CLUB_PROPIO });
  assert.equal(r.valores.id_club, null);
});
