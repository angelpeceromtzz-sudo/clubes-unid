import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarDocumentoNoticia, textoPlanoNoticia, tieneContenidoNoticia } from './contenidoNoticia.js';

test('convierte texto heredado en un párrafo sin perder su contenido', () => {
  const texto = 'Aviso con **formato literal**\ny segunda línea';
  assert.deepEqual(normalizarDocumentoNoticia(texto), {
    version: 1,
    blocks: [{ type: 'paragraph', text: texto, marks: [] }],
  });
  assert.equal(textoPlanoNoticia(texto), texto);
});

test('normaliza bloques de noticias sin interpretar HTML como marcado', () => {
  const documento = normalizarDocumentoNoticia({
    version: 1,
    blocks: [
      { type: 'heading', level: 2, text: 'Título' },
      { type: 'paragraph', text: '<script>alert(1)</script>', marks: ['bold', 'unknown'] },
      { type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/noticia.jpg', alt: 'Foto' },
      { type: 'image', url: 'javascript:alert(1)', alt: 'No permitido' },
    ],
  });
  assert.deepEqual(documento.blocks.map((bloque) => bloque.type), ['heading', 'paragraph', 'image']);
  assert.deepEqual(documento.blocks[1].marks, ['bold']);
  assert.equal(textoPlanoNoticia(documento), 'Título\n<script>alert(1)</script>');
  assert.equal(tieneContenidoNoticia(documento), true);
});

test('descarta documentos desconocidos y no considera contenido vacío como artículo', () => {
  assert.deepEqual(normalizarDocumentoNoticia({ version: 2, blocks: [] }), { version: 1, blocks: [] });
  assert.equal(tieneContenidoNoticia('  \n  '), false);
  assert.equal(tieneContenidoNoticia({ version: 1, blocks: [{ type: 'paragraph', text: ' ' }] }), false);
});
