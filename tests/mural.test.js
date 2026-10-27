import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enlaceMural, clavePublicacionMural, estadoPublicacionMural } from '../src/utils/mural.js';
import { publicacionesMural } from '../src/utils/calendario.js';

test('el QR abre el mural aunque se introduzca una dirección de administración', () => {
  assert.equal(enlaceMural('https://campus.example.org/admin?seccion=noticias#editar'), 'https://campus.example.org/calendario?vista=mural');
  assert.equal(enlaceMural('http://localhost:5173'), 'http://localhost:5173/calendario?vista=mural');
  for (const url of ['', 'javascript:alert(1)', '//campus.example.org', 'https://user:pass@example.org']) assert.equal(enlaceMural(url), '');
});
test('noticias, fechas y publicaciones propias mantienen identidades aunque compartan número', () => {
  assert.equal(new Set([{ id_noticia: 1 }, { origen: 'fecha', id_fecha: 1 }, { origen: 'mural', id_publicacion: 1 }].map(clavePublicacionMural)).size, 3);
});
test('la mezcla del mural respeta visibilidad, retiro inclusivo y prioridad de destacados', () => {
  const base = { origen: 'mural', publicada: true, mostrar_en_mural: true };
  const visibles = publicacionesMural([
    { ...base, id_publicacion: 1, publicada: false },
    { ...base, id_publicacion: 2, fecha_retiro: '2026-10-20' },
    { ...base, id_publicacion: 3, fecha_retiro: '2026-10-21', fecha_creacion: '2026-10-21' },
    { ...base, id_publicacion: 4, destacada: true, fecha_creacion: '2026-10-01' },
    { id_fecha: 1, origen: 'fecha', publicada: true, mostrar_en_mural: true, fecha_inicio: '2026-10-21' },
  ], '2026-10-21');
  assert.equal(visibles.length, 3);
  assert.equal(visibles[0].id_publicacion, 4);
  assert.ok(visibles.some((item) => item.origen === 'fecha'));
  assert.equal(estadoPublicacionMural({ publicada: true, fecha_retiro: '2026-10-21' }, '2026-10-21'), 'Publicada');
  assert.equal(estadoPublicacionMural({ publicada: true, fecha_retiro: '2026-10-20' }, '2026-10-21'), 'Retirada');
  assert.equal(estadoPublicacionMural({ publicada: false }, '2026-10-21'), 'Borrador');
});
