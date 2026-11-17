import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enlaceMural, clavePublicacionMural, estadoPublicacionMural, imagenMuralSegura, actualizarCampoMural } from '../src/utils/mural.js';
import { publicacionesMural } from '../src/utils/calendario.js';

test('el editor solo actualiza controles permitidos y conserva imagen y metadatos', () => {
  const original = Object.freeze({ titulo: 'Anterior', url_imagen: 'https://example.org/cartel.jpg', id_publicacion: 1, status: 'draft', destacada: false });
  for (const campo of ['titulo', 'subtitulo', 'contenido', 'enlace_url', 'enlace_texto', 'fecha_retiro']) {
    const actualizado = actualizarCampoMural(original, campo, 'Nuevo valor');
    assert.deepEqual(actualizado, { ...original, [campo]: 'Nuevo valor' });
  }
  const destacada = actualizarCampoMural(original, 'destacada', true);
  assert.equal(destacada.destacada, true);
  assert.equal(actualizarCampoMural(destacada, 'destacada', false).destacada, false);
  for (const campo of ['url_imagen', 'id_publicacion', 'status', '__proto__', 'constructor', 'campo_ajeno', '']) {
    assert.equal(actualizarCampoMural(original, campo, 'javascript:alert(1)'), original, campo);
  }
});

test('las imágenes del mural conservan HTTP(S) y cargas locales y rechazan esquemas ejecutables', () => {
  for (const url of ['https://res.cloudinary.com/demo/image/upload/cartel.jpg', 'http://localhost:4000/uploads/cartel.png', '/uploads/cartel.jpg']) {
    assert.equal(imagenMuralSegura(url), url);
  }
  for (const valor of [null, undefined, {}, [], 42, '', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'data:image/svg+xml,<svg onload=alert(1)>', '//example.org/a.png', '/\\example.org/a.png', 'https://user:pass@example.org/a.png', 'https://', ' https://example.org/a.png']) {
    assert.equal(imagenMuralSegura(valor), null, String(valor));
  }
});

test('el QR abre el mural aunque se introduzca una dirección de administración', () => {
  assert.equal(enlaceMural('https://campus.example.org/admin?seccion=noticias#editar'), 'https://campus.example.org/calendario?vista=mural');
  assert.equal(enlaceMural('http://localhost:5173'), 'http://localhost:5173/calendario?vista=mural');
  for (const url of ['', 'javascript:alert(1)', '//campus.example.org', 'https://user:pass@example.org']) assert.equal(enlaceMural(url), '');
});
test('noticias, fechas y publicaciones propias mantienen identidades aunque compartan número', () => {
  assert.equal(new Set([{ id_noticia: 1 }, { origen: 'fecha', id_fecha: 1 }, { origen: 'mural', id_publicacion: 1 }].map(clavePublicacionMural)).size, 3);
});
test('la mezcla del mural respeta visibilidad, retiro inclusivo y prioridad de destacados', () => {
  const base = { origen: 'mural', status: 'published', publicada: true, mostrar_en_mural: true };
  const visibles = publicacionesMural([
    { ...base, id_publicacion: 1, status: 'draft', publicada: false },
    { ...base, id_publicacion: 2, fecha_retiro: '2026-10-20' },
    { ...base, id_publicacion: 3, fecha_retiro: '2026-10-21', fecha_creacion: '2026-10-21' },
    { ...base, id_publicacion: 4, destacada: true, fecha_creacion: '2026-10-01' },
    { id_fecha: 1, origen: 'fecha', publicada: true, mostrar_en_mural: true, fecha_inicio: '2026-10-21' },
  ], '2026-10-21');
  assert.equal(visibles.length, 3);
  assert.equal(visibles[0].id_publicacion, 4);
  assert.ok(visibles.some((item) => item.origen === 'fecha'));
  assert.equal(estadoPublicacionMural({ status: 'published', fecha_retiro: '2026-10-21' }, '2026-10-21'), 'Publicada');
  assert.equal(estadoPublicacionMural({ status: 'published', fecha_retiro: '2026-10-20' }, '2026-10-21'), 'Retirada');
  assert.equal(estadoPublicacionMural({ status: 'draft' }, '2026-10-21'), 'Borrador');
  assert.equal(estadoPublicacionMural({ status: 'pending' }, '2026-10-21'), 'Pendiente de aprobación');
  assert.equal(estadoPublicacionMural({ status: 'rejected' }, '2026-10-21'), 'Devuelta para correcciones');
});
