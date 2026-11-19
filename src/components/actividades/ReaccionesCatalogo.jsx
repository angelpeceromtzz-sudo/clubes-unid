import { useEffect, useId, useRef, useState } from 'react';
import './ReaccionesCatalogo.css';
import { LoboReaccion } from './LoboReaccion';

const REACCIONES = [
  { valor: 'like', etiqueta: 'Me gusta' },
  { valor: 'love', etiqueta: 'Me encanta' },
  { valor: 'clap', etiqueta: 'Aplausos' },
];
const TOTALES_VACIOS = [];

export function ReaccionesCatalogo({
  etiqueta, totales = TOTALES_VACIOS, reaccion = null, autenticado, cargando,
  errorCarga, onRecargar, guardarReaccion, onLoginClick,
}) {
  const ayudaId = useId();
  const bloqueo = useRef(false);
  const activo = useRef(true);
  const fuenteTotales = useRef(totales);
  const [confirmada, setConfirmada] = useState(null);
  const [optimista, setOptimista] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [animacion, setAnimacion] = useState(0);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => { fuenteTotales.current = totales; }, [totales]);
  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; };
  }, []);

  const seleccionada = optimista ? optimista.reaccion : confirmada ? confirmada.reaccion : reaccion;
  // Un refresco público sustituye los contadores confirmados, sin perder la selección propia.
  const contadores = optimista?.totales || (confirmada?.fuente === totales ? confirmada.totales : totales);
  const pendiente = Boolean(optimista);
  const deshabilitada = pendiente || cargando || Boolean(errorCarga);

  async function guardar(destino) {
    if (bloqueo.current || cargando || errorCarga) return;
    if (!autenticado) { onLoginClick?.(); return; }
    bloqueo.current = true;
    setFallo(null);
    setAnimacion((actual) => actual + 1);
    setMensaje('Guardando reacción…');
    setOptimista({ reaccion: destino, totales: REACCIONES.map(({ valor }) => ({
      reaccion: valor,
      total: Math.max(0, Number(contadores.find((item) => item.reaccion === valor)?.total || 0)
        - Number(seleccionada === valor) + Number(destino === valor)),
    })) });
    try {
      const resultado = await guardarReaccion(destino);
      if (!activo.current) return;
      setConfirmada({ ...resultado, fuente: fuenteTotales.current });
      setMensaje(destino ? 'Tu reacción: ' + REACCIONES.find((item) => item.valor === destino).etiqueta + '.' : 'Reacción retirada.');
    } catch (error) {
      if (!activo.current) return;
      setFallo({ destino, mensaje: error.mensajeServidor || error.message || 'No se pudo guardar tu reacción.' });
      setMensaje('');
    } finally {
      bloqueo.current = false;
      if (activo.current) setOptimista(null);
    }
  }

  return <section className="reacciones-catalogo" aria-label={etiqueta}>
    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Deja tu huella</h3>
    <div className="reacciones-catalogo__fila" role="group" aria-label="Elige una reacción" aria-describedby={ayudaId} aria-busy={pendiente}>
      {REACCIONES.map(({ valor, etiqueta: nombre }) => {
        const elegida = seleccionada === valor;
        const total = Number(contadores.find((item) => item.reaccion === valor)?.total || 0);
        return <button type="button" key={valor} className="reaccion-catalogo"
          aria-label={(elegida ? 'Quitar mi reacción: ' : 'Reaccionar: ') + nombre + '. ' + total + (total === 1 ? ' reacción' : ' reacciones')}
          aria-pressed={elegida} disabled={deshabilitada} onClick={() => guardar(elegida ? null : valor)}>
          <span className="reaccion-catalogo__halo" aria-hidden="true" />
          <span key={valor + ':' + (elegida ? animacion : 'reposo')} className="reaccion-catalogo__ilustracion" aria-hidden="true"><LoboReaccion tipo={valor} animado={Boolean(elegida && animacion)}/></span>
          <span className="reaccion-catalogo__nombre" aria-hidden="true">{nombre}</span>
          <span key={'total:' + total} className={'reaccion-catalogo__contador' + (animacion ? ' reaccion-catalogo__contador--animado' : '')} aria-hidden="true">
            <span className="reaccion-catalogo__marca" />{total.toLocaleString('es-MX')}
          </span>
        </button>;
      })}
    </div>
    <p id={ayudaId} className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{seleccionada ? 'Tu reacción. Toca el lobo de nuevo para quitarla.' : 'Una huella por persona. Elige tu reacción.'}</p>
    <p role="status" className="sr-only">{mensaje}</p>
    {errorCarga && <div role="alert" className="reacciones-catalogo__error"><p>{errorCarga}</p><button type="button" onClick={onRecargar}>Volver a intentar</button></div>}
    {fallo && <div role="alert" className="reacciones-catalogo__error"><p>{fallo.mensaje}</p><button type="button" disabled={deshabilitada} onClick={() => guardar(fallo.destino)}>Volver a intentar</button></div>}
  </section>;
}
