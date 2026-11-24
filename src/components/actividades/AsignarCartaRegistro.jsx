import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { actividadService } from '../../services/actividad.service';
import { BotonAccion } from '../ui/BotonAccion';
import { formatearEdadCarta } from '../../utils/edadCarta';

export function AsignarCartaRegistro({ idEdicion, registro, onGuardado, cartas = [], cartasCargando = false, errorCartas = '', recargarCartas = () => {}, editable = true }) {
  const { tema, inputCls, labelCls } = useTheme();
  const [seleccion, setSeleccion] = useState(registro.carta?.id_carta ? String(registro.carta.id_carta) : '');
  const [pendiente, setPendiente] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const actual = registro.carta;

  async function guardar() {
    if (pendiente || !editable) return;
    const idCarta = seleccion ? Number(seleccion) : null;
    if (actual?.estado === 'entregada' && idCarta !== actual.id_carta) return;
    setPendiente(true); setErrorOperacion(''); setMensaje('');
    try {
      await actividadService.asignarCartaRegistro(idEdicion, registro.id_registro, idCarta);
      setMensaje(idCarta === null ? 'Carta liberada.' : 'Carta asignada.');
      recargarCartas(); onGuardado();
    } catch (fallo) { setErrorOperacion(fallo.mensajeServidor || fallo.message); }
    finally { setPendiente(false); }
  }

  const opciones = cartas.filter((carta) => carta.estado === 'disponible' || carta.id_carta === actual?.id_carta);
  const bloqueada = actual?.estado === 'entregada';
  return <section className="space-y-2 rounded-lg bg-amber-400/5 p-3" aria-label={'Asignar carta a ' + registro.nombre_completo}>
    <h5 className="text-sm font-bold">Carta del Trineo</h5>
    {actual && <p className={'text-sm ' + tema.subtitle}>Actual: carta #{actual.id_carta} · {actual.nombre}</p>}
    {bloqueada ? <p className="text-xs">El regalo ya fue recibido; la carta no se puede cambiar.</p> : cartasCargando ? <p role="status" className="text-xs">Cargando cartas disponibles…</p> : errorCartas ? <div className="space-y-2"><p role="alert" className="text-xs text-red-600 dark:text-red-400">{errorCartas}</p><BotonAccion variant="outline" size="sm" onClick={recargarCartas}>Actualizar cartas</BotonAccion></div> : <div className="flex flex-wrap items-end gap-3"><label className={labelCls + ' text-xs'}>Carta asignada<select className={inputCls} value={seleccion} onChange={(evento) => setSeleccion(evento.target.value)} disabled={pendiente || !editable}><option value="">Sin carta</option>{opciones.map((carta) => <option key={carta.id_carta} value={carta.id_carta}>#{carta.id_carta} · {carta.nombre} · {formatearEdadCarta(carta.edad)}</option>)}</select></label><BotonAccion size="sm" disabled={!editable || pendiente || (seleccion === String(actual?.id_carta || ''))} onClick={guardar}>{seleccion ? actual ? 'Cambiar carta' : 'Asignar carta' : 'Liberar carta'}</BotonAccion></div>}
    {mensaje && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{mensaje}</p>}
    {errorOperacion && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{errorOperacion}</p>}
  </section>;
}
