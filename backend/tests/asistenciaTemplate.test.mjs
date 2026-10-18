// Pruebas del template de lista de asistencia (auditoría H1).
// Datos ficticios locales; no se usa base de datos ni red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarListaAsistencia } from '../lib/asistenciaTemplate.js';

const PAYLOAD_SCRIPT = '<script>alert("xss")</script>';
const PAYLOAD_ATRIBUTO = '"><img src=x onerror=alert(1)>';
const PAYLOAD_EVENTO = "'; onmouseover='steal()";

function generar(overrides = {}) {
  const valor = (clave, defecto) =>
    Object.prototype.hasOwnProperty.call(overrides, clave) ? overrides[clave] : defecto;
  return generarListaAsistencia(
    valor('nombreClub', 'Club de Robótica'),
    valor('bloque', 'Matutino'),
    valor('fecha', new Date('2026-03-02T12:00:00Z')),
    valor('hora', '09:00'),
    valor('lugar', 'Aula B-12'),
    valor('alumnos', [
      { nombre_completo: 'Ana López Pérez', matricula: '2024001' },
    ])
  );
}

test('el contenido con etiquetas en el nombre se muestra como texto, no como marcado', () => {
  const html = generar({
    alumnos: [{ nombre_completo: PAYLOAD_SCRIPT, matricula: '2024001' }],
  });
  assert.ok(!html.includes('<script>alert'), 'no debe existir etiqueta script sin escapar');
  assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
});

test('un intento de romper atributos en nombre y matrícula queda escapado', () => {
  const html = generar({
    alumnos: [
      { nombre_completo: PAYLOAD_ATRIBUTO, matricula: PAYLOAD_EVENTO },
    ],
  });
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes("onmouseover='steal"));
  assert.ok(html.includes('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'));
  // Ninguna aparición de onerror/onmouseover puede quedar dentro de una etiqueta real.
  assert.ok(!/<[^>]+\bonerror\b/i.test(html));
  assert.ok(!/<[^>]+\bonmouseover\b/i.test(html));
});

test('el nombre del club y el lugar con etiquetas quedan escapados en texto y título', () => {
  const html = generar({
    nombreClub: `Club ${PAYLOAD_SCRIPT}`,
    lugar: `Salón ${PAYLOAD_ATRIBUTO}`,
  });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('<h1>Club &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</h1>'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('el bloque con marcado queda escapado en título y encabezado', () => {
  const html = generar({ bloque: `Vespertino ${PAYLOAD_SCRIPT}` });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('Bloque Vespertino &lt;script&gt;'));
});

test('conserva caracteres acentuados y la estructura funcional del documento', () => {
  const html = generar({
    nombreClub: 'Club de Ajedrez',
    alumnos: [
      { nombre_completo: 'José Ñandú Ávila', matricula: '2024-ñ-02' },
      { nombre_completo: 'María de la Cruz', matricula: '2024003' },
    ],
  });
  assert.ok(html.includes('José Ñandú Ávila'));
  assert.ok(html.includes('2024-ñ-02'));
  assert.ok(html.includes('window.print()'));
  assert.ok(html.includes('<table>'));
  assert.ok(html.includes('<td class="firma"></td>'));
  const filas = html.match(/<tr><td class="num">/g) ?? [];
  assert.equal(filas.length, 2);
});

test('valores vacíos de lugar y fecha siguen mostrando los marcadores', () => {
  const html = generar({ lugar: '', fecha: null, hora: null });
  assert.ok(html.includes('<strong>Lugar:</strong> —'));
  assert.ok(html.includes('<strong>Fecha:</strong> —'));
  assert.ok(html.includes('<strong>Hora:</strong> —'));
});

test('el ampersand simple se escapa para no formar entidades ambiguas', () => {
  const html = generar({
    alumnos: [{ nombre_completo: 'P&G Deportes', matricula: 'A&B' }],
  });
  assert.ok(html.includes('P&amp;G Deportes'));
  assert.ok(html.includes('A&amp;B'));
});
