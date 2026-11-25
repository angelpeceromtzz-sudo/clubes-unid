import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarContenidoNoticia, textoPlanoNoticia, tieneContenidoNoticia } from '../lib/contenidoNoticia.js';

test('normaliza una cadena heredada como documento JSON sin cambiar el texto', () => {
  const texto = 'Aviso con <etiquetas> como texto';
  const resultado = normalizarContenidoNoticia(texto);
  assert.equal(resultado.error, undefined);
  assert.deepEqual(resultado.documento, { version: 1, blocks: [{ type: 'paragraph', text: texto, marks: [] }] });
  assert.equal(textoPlanoNoticia(resultado.documento), texto);
});

test('acepta bloques simples, negrita, cursiva e imagen Cloudinary HTTPS', () => {
  const resultado = normalizarContenidoNoticia({
    version: 1,
    blocks: [
      { type: 'heading', level: 2, text: 'Aviso' },
      { type: 'paragraph', text: 'Detalle', marks: ['bold', 'italic'] },
      { type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/foto.jpg', alt: 'Foto' },
    ],
  });
  assert.equal(resultado.error, undefined);
  assert.equal(textoPlanoNoticia(resultado.documento), 'Aviso\nDetalle');
  assert.equal(tieneContenidoNoticia(resultado.documento), true);
});

test('rechaza HTML, tipo de bloque, formatos y URLs de imagen desconocidos', () => {
  for (const entrada of [
    { version: 1, blocks: [{ type: 'paragraph', text: 'X', marks: ['html'] }] },
    { version: 1, blocks: [{ type: 'video', url: 'https://res.cloudinary.com/video.mp4' }] },
    { version: 1, blocks: [{ type: 'image', url: 'javascript:alert(1)', alt: '' }] },
    { version: 1, blocks: [{ type: 'image', url: 'https://example.org/foto.jpg', alt: '' }] },
    { version: 1, blocks: [{ type: 'heading', level: 1, text: 'X' }] },
  ]) {
    assert.ok(normalizarContenidoNoticia(entrada).error);
  }
  assert.equal(normalizarContenidoNoticia({ version: 1, blocks: [{ type: 'paragraph', text: '  ' }] }).error, 'El contenido no puede quedar vacío');
});
