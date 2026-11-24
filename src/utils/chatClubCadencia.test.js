import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearCoordinadorPresencia,
  crearEjecutorConCadenciaCompartida,
} from './chatClubCadencia.js';

function crearReloj() {
  let ahora = 0;
  let secuencia = 0;
  const timers = new Map();
  return {
    ahora: () => ahora,
    programar(callback, ms) {
      const id = ++secuencia;
      timers.set(id, { callback, vence: ahora + ms });
      return id;
    },
    cancelar(id) { timers.delete(id); },
    async avanzar(ms) {
      ahora += ms;
      while (true) {
        const siguiente = [...timers.entries()]
          .filter(([, timer]) => timer.vence <= ahora)
          .sort((a, b) => a[1].vence - b[1].vence)[0];
        if (!siguiente) break;
        timers.delete(siguiente[0]);
        siguiente[1].callback();
        await Promise.resolve();
        await Promise.resolve();
      }
    },
    pendientes: () => timers.size,
  };
}

function crearLocks() {
  const colas = new Map();
  return {
    request(nombre, opciones, callback) {
      if (typeof opciones === 'function') callback = opciones;
      const anterior = colas.get(nombre) || Promise.resolve();
      const operacion = anterior.then(() => callback());
      const cola = operacion.then(() => undefined, () => undefined);
      colas.set(nombre, cola);
      cola.finally(() => {
        if (colas.get(nombre) === cola) colas.delete(nombre);
      });
      return operacion;
    },
  };
}

function crearAlmacen() {
  const datos = new Map();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  };
}

async function drenar() {
  await Promise.resolve();
  await Promise.resolve();
}

test('dos pestañas comparten una sola ejecución por intervalo de polling', async () => {
  const reloj = crearReloj();
  const almacen = crearAlmacen();
  const locks = crearLocks();
  const opciones = {
    clave: 'poll:1:5',
    intervaloMs: 3500,
    ahora: reloj.ahora,
    obtenerAlmacen: () => almacen,
    obtenerLocks: () => locks,
  };
  const pestanaA = crearEjecutorConCadenciaCompartida(opciones);
  const pestanaB = crearEjecutorConCadenciaCompartida(opciones);
  let ejecuciones = 0;
  const callback = async () => { ejecuciones += 1; };

  assert.equal(await pestanaA(callback), true);
  assert.equal(await pestanaB(callback), false);
  await reloj.avanzar(3499);
  assert.equal(await pestanaB(callback), false);
  await reloj.avanzar(1);
  assert.equal(await pestanaB(callback), true);
  assert.equal(ejecuciones, 2);
});

test('dos pestañas comparten también la cadencia de presencia', async () => {
  const reloj = crearReloj();
  const almacen = crearAlmacen();
  const opciones = {
    clave: 'presencia:1:5',
    intervaloMs: 3000,
    ahora: reloj.ahora,
    obtenerAlmacen: () => almacen,
    obtenerLocks: () => crearLocks(),
  };
  const a = crearEjecutorConCadenciaCompartida(opciones);
  const b = crearEjecutorConCadenciaCompartida(opciones);
  let pings = 0;

  assert.equal(await a(async () => { pings += 1; }), true);
  assert.equal(await b(async () => { pings += 1; }), false);
  await reloj.avanzar(3000);
  assert.equal(await b(async () => { pings += 1; }), true);
  assert.equal(pings, 2);
});

test('el lock se retiene durante el callback y evita concurrencia entre pestañas', async () => {
  const reloj = crearReloj();
  const almacen = crearAlmacen();
  const locks = crearLocks();
  const opciones = {
    clave: 'poll:concurrencia',
    intervaloMs: 1000,
    ahora: reloj.ahora,
    obtenerAlmacen: () => almacen,
    obtenerLocks: () => locks,
  };
  const a = crearEjecutorConCadenciaCompartida(opciones);
  const b = crearEjecutorConCadenciaCompartida(opciones);
  let resolver;
  let enCurso = 0;
  let maximo = 0;
  const callback = () => {
    enCurso += 1;
    maximo = Math.max(maximo, enCurso);
    return new Promise((resolve) => { resolver = () => { enCurso -= 1; resolve(); }; });
  };

  const primera = a(callback);
  const segunda = b(callback);
  await drenar();
  await reloj.avanzar(1000);
  resolver();
  assert.equal(await primera, true);
  await drenar();
  resolver();
  assert.equal(await segunda, true);
  assert.equal(maximo, 1);
});

test('un callback fallido libera la cadencia para reintentar', async () => {
  const reloj = crearReloj();
  const almacen = crearAlmacen();
  const ejecutar = crearEjecutorConCadenciaCompartida({
    clave: 'poll:error',
    intervaloMs: 1000,
    ahora: reloj.ahora,
    obtenerAlmacen: () => almacen,
    obtenerLocks: () => crearLocks(),
  });

  await assert.rejects(ejecutar(async () => { throw new Error('fallo'); }), /fallo/);
  assert.equal(await ejecutar(async () => {}), true);
});

test('un 429 comparte Retry-After y evita reintentos antes de tiempo', async () => {
  const reloj = crearReloj();
  const almacen = crearAlmacen();
  const opciones = {
    clave: 'poll:429',
    intervaloMs: 1000,
    ahora: reloj.ahora,
    obtenerAlmacen: () => almacen,
    obtenerLocks: () => crearLocks(),
  };
  const a = crearEjecutorConCadenciaCompartida(opciones);
  const b = crearEjecutorConCadenciaCompartida(opciones);
  const error429 = Object.assign(new Error('límite'), { reintentarEnSegundos: 10 });

  await assert.rejects(a(async () => { throw error429; }), /límite/);
  assert.equal(await b(async () => {}), false);
  await reloj.avanzar(9999);
  assert.equal(await b(async () => {}), false);
  await reloj.avanzar(1);
  assert.equal(await b(async () => {}), true);
});

test('typing=true se coalesce y typing=false queda como envío trailing', async () => {
  const reloj = crearReloj();
  const enviados = [];
  const control = crearCoordinadorPresencia({
    intervaloMs: 3000,
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    enviar: async (escribiendo) => { enviados.push(escribiendo); },
  });

  control.publicar(true);
  control.publicar(true);
  await drenar();
  assert.deepEqual(enviados, [true]);
  control.publicar(false);
  assert.equal(reloj.pendientes(), 1);
  await reloj.avanzar(2999);
  assert.deepEqual(enviados, [true]);
  await reloj.avanzar(1);
  assert.deepEqual(enviados, [true, false]);
});

test('true → false → true conserva el último estado', async () => {
  const reloj = crearReloj();
  const enviados = [];
  const control = crearCoordinadorPresencia({
    intervaloMs: 3000,
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    enviar: async (escribiendo) => { enviados.push(escribiendo); },
  });

  control.publicar(true);
  await drenar();
  control.publicar(false);
  control.publicar(true);
  await reloj.avanzar(3000);
  assert.deepEqual(enviados, [true, true]);
});

test('un false durante un true en vuelo se envía después, no concurrentemente', async () => {
  const reloj = crearReloj();
  const enviados = [];
  let resolverPrimero;
  const control = crearCoordinadorPresencia({
    intervaloMs: 3000,
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    enviar: (escribiendo) => {
      enviados.push(escribiendo);
      return escribiendo ? new Promise((resolve) => { resolverPrimero = resolve; }) : Promise.resolve();
    },
  });

  control.publicar(true);
  control.publicar(false);
  assert.deepEqual(enviados, [true]);
  resolverPrimero();
  await drenar();
  await drenar();
  await reloj.avanzar(3000);
  assert.deepEqual(enviados, [true, false]);
});

test('la limpieza activo=false es inmediata aunque el throttle no haya vencido', async () => {
  const reloj = crearReloj();
  const enviados = [];
  const control = crearCoordinadorPresencia({
    intervaloMs: 3000,
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    enviar: async (escribiendo, activo) => { enviados.push({ escribiendo, activo }); },
  });

  control.publicar(true);
  await drenar();
  control.publicar(false, false);
  await drenar();
  assert.deepEqual(enviados, [
    { escribiendo: true, activo: true },
    { escribiendo: false, activo: false },
  ]);
  assert.equal(reloj.pendientes(), 0);
});

test('cancelarPendientes no borra una limpieza activo=false ya programada', async () => {
  const reloj = crearReloj();
  const enviados = [];
  let resolver;
  const control = crearCoordinadorPresencia({
    intervaloMs: 3000,
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    enviar: (escribiendo, activo) => {
      enviados.push({ escribiendo, activo });
      if (activo) return new Promise((resolve) => { resolver = resolve; });
      return Promise.resolve();
    },
  });

  control.publicar(true);
  control.publicar(false, false);
  control.cancelarPendientes();
  resolver();
  await drenar();
  await drenar();
  assert.deepEqual(enviados, [
    { escribiendo: true, activo: true },
    { escribiendo: false, activo: false },
  ]);
});

test('un latido usa escribiendo=null para no borrar el typing de otra pestaña', async () => {
  const reloj = crearReloj();
  const enviados = [];
  const control = crearCoordinadorPresencia({
    intervaloMs: 3000,
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    enviar: async (escribiendo) => { enviados.push(escribiendo); },
  });

  control.publicarLatido();
  await drenar();
  assert.deepEqual(enviados, [null]);
});
