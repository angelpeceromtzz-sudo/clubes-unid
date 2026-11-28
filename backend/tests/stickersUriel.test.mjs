import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { STICKERS_URIEL, buscarStickerUriel, contenidoStickerUriel, leerStickerUriel } from '../../shared/stickersUriel.js';

test('cada sticker de Uriel tiene una clave única y se conserva al guardar un mensaje', () => {
  assert.equal(STICKERS_URIEL.length, 12);
  assert.equal(new Set(STICKERS_URIEL.map(sticker => sticker.id)).size, STICKERS_URIEL.length);
  for (const sticker of STICKERS_URIEL) {
    assert.equal(buscarStickerUriel(sticker.id), sticker);
    assert.equal(leerStickerUriel(contenidoStickerUriel(sticker.id)), sticker);
    assert.ok(sticker.frase.length);
  }
});

test('las claves ajenas o los mensajes corrientes no se interpretan como stickers', () => {
  assert.equal(contenidoStickerUriel('desconocido'), null);
  assert.equal(leerStickerUriel('[uriel-sticker:desconocido]'), null);
  assert.equal(leerStickerUriel('Hola [uriel-sticker:saludo]'), null);
  assert.equal(leerStickerUriel('Mensaje eliminado'), null);
});

test('cada sticker disponible tiene la ilustración vectorial del lobo', async () => {
  for (const sticker of STICKERS_URIEL) {
    await access(new URL(`../../diseno/reacciones-lobo/svg/${sticker.id}.svg`, import.meta.url));
  }
});
