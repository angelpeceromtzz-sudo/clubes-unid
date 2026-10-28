import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMural } from '../hooks/useMural';
import { EditorPublicacionMural } from '../components/calendario/EditorPublicacionMural';
import { ModalCompartirMural } from '../components/calendario/ModalCompartirMural';
import { useTheme } from '../contexts/ThemeContext';
import { useNoticias } from '../contexts/NoticiasContext';
import { useAutenticacion } from '../contexts/AuthContext';
import { Icono } from '../components/ui/Icono';
import { Spinner } from '../components/ui/Spinner';
import { ModalDetalleFechaAcademica } from '../components/calendario/ModalDetalleFechaAcademica';
import { useCalendarioAcademico } from '../hooks/useCalendarioAcademico';
import { TIPOS_FECHA, tipoFecha } from '../constants/tiposFecha';
import { ModalDetalleCalendario } from '../components/calendario/ModalDetalleCalendario';
import { MuralCalendario } from '../components/calendario/MuralCalendario';
import { SimboloFecha } from '../components/calendario/SimboloFecha';
import { SelectorVistasCalendario } from '../components/calendario/SelectorVistasCalendario';
import { CATEGORIAS_EVENTO, emojiCategoriaEvento, estiloCategoriaEvento, nombreCategoriaEvento } from '../constants/categoriasEvento';
import { fechaHoyCampus } from '../utils/fechas';
import { claveLocal, fechaLegible, capitalizarInicial, elementosCalendario, elementosEnFecha, elementosEnMes, publicacionesMural, periodoElemento } from '../utils/calendario';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function PaginaCalendario() {
  const { tema, modoOscuro, cardCls, selectCls } = useTheme();
  const { eventos, avisosMural, cargando, errorEventos, errorMural, refetch } = useNoticias();
  const calendario = useCalendarioAcademico();
  const propios = useMural();
  const navegar = useNavigate();
  const [editorMural, setEditorMural] = useState(null);
  const [compartir, setCompartir] = useState(false);
  const [mensajeMural, setMensajeMural] = useState('');
  const { esAdmin, esRectoria, esResponsableMural, puedeGestionarMural } = useAutenticacion();
  const basePanel = `${esAdmin ? '/admin' : esResponsableMural ? '/mural' : '/rectoria'}/dashboard`;
  const [parametros, setParametros] = useSearchParams();
  const vista = parametros.get('vista') === 'mural' ? 'mural' : 'calendario';
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date(`${fechaHoyCampus()}T12:00:00`);
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState(fechaHoyCampus);
  const [categoria, setCategoria] = useState('todos');
  const [detalle, setDetalle] = useState(null);
  const hoyClave = fechaHoyCampus();
  const elementos = useMemo(() => elementosCalendario(eventos, calendario.fechas), [eventos, calendario.fechas]);
  const elementosDelMes = useMemo(() => elementosEnMes(elementos, mesVisible, categoria), [elementos, mesVisible, categoria]);
  const mural = useMemo(() => publicacionesMural([
    ...avisosMural,
    ...propios.publicaciones,
    ...calendario.fechas.filter((fecha) => fecha.mostrar_en_mural).map((fecha) => ({ ...fecha, origen: 'fecha' })),
  ], hoyClave), [avisosMural, propios.publicaciones, calendario.fechas, hoyClave]);
  const erroresMural = [errorMural, calendario.errorCarga, propios.error].filter(Boolean).join(' ');
  function editarDesdeMural(item) {
    if (item.origen === 'mural') { setEditorMural(item); return; }
    if (esResponsableMural) return;
    navegar(item.origen === 'fecha' ? `${basePanel}?seccion=calendario&editar_fecha=${item.id_fecha}` : `${basePanel}?seccion=noticias&editar_noticia=${item.id_noticia}`);
  }
  const celdas = useMemo(() => {
    const primerDia = (mesVisible.getDay() + 6) % 7;
    const cantidad = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((primerDia + cantidad) / 7) * 7 }, (_, indice) => {
      const numero = indice - primerDia + 1;
      return numero >= 1 && numero <= cantidad ? new Date(mesVisible.getFullYear(), mesVisible.getMonth(), numero) : null;
    });
  }, [mesVisible]);
  const seleccionados = diaSeleccionado ? elementosEnFecha(elementosDelMes, diaSeleccionado) : [];
  const tituloMes = capitalizarInicial(mesVisible.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));

  function cambiarVista(nueva) {
    setParametros((actuales) => { const siguientes = new URLSearchParams(actuales); if (nueva === 'mural') siguientes.set('vista', 'mural'); else siguientes.delete('vista'); return siguientes; }, { replace: true });
  }

  function cambiarMes(delta) {
    setMesVisible((actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1));
    setDiaSeleccionado(null);
  }

  function irAHoy() {
    const hoy = new Date(`${hoyClave}T12:00:00`);
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setDiaSeleccionado(hoyClave);
  }

  return (
    <main className="w-full px-4 sm:px-8 py-8 sm:py-10 pb-24">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-7">
          <div><p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`}>Comunidad UNID</p><h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${tema.title}`}>Tu vida en el campus</h1><p className={`text-sm mt-2 ${tema.subtitle}`}>Las fechas que importan. Las novedades que nos unen.</p></div>
          {(vista === 'mural' ? puedeGestionarMural : esAdmin || esRectoria) && <Link to={`${basePanel}?seccion=${vista === 'mural' ? 'mural' : 'calendario'}`} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 ${tema.btnInactive}`}><Icono nombre="edit" className="h-3.5 w-3.5" />{vista === 'mural' ? 'Administrar mural' : 'Administrar fechas'}</Link>}
        </header>
        <SelectorVistasCalendario vista={vista} onChange={cambiarVista} />
        {mensajeMural && vista === 'mural' && <p role="status" className="mb-4 text-sm text-emerald-600">{mensajeMural}</p>}
        {(cargando || calendario.cargando || (vista === 'mural' && propios.cargando)) ? <Spinner className="py-20" /> : vista === 'mural' ? <div id="panel-mural" role="tabpanel" aria-labelledby="pestana-mural"><MuralCalendario publicaciones={mural} onDetalle={(publicacion) => setDetalle({ origen: publicacion.origen === 'fecha' ? 'fecha' : 'publicacion', original: publicacion })} onCrear={puedeGestionarMural ? () => setEditorMural({}) : undefined} onEditar={puedeGestionarMural ? editarDesdeMural : undefined} puedeEditar={(item) => esResponsableMural && item.origen === 'mural'} onCompartir={() => setCompartir(true)} error={erroresMural} onReintentar={() => { refetch(); calendario.cargar(); propios.cargar(); }} /></div> : <div id="panel-calendario" role="tabpanel" aria-labelledby="pestana-calendario">
          {errorEventos && <p role="alert" className="mb-4 text-sm text-red-500">{errorEventos} <button type="button" onClick={refetch} className="underline cursor-pointer">Reintentar</button></p>}
          {calendario.errorCarga && <p role="alert" className="mb-4 text-sm text-red-500">{calendario.errorCarga} <button type="button" onClick={calendario.cargar} className="underline cursor-pointer">Reintentar</button></p>}
          <div className="grid lg:grid-cols-[minmax(0,1fr)_270px] items-start gap-5">
            <section className={`min-w-0 rounded-2xl border overflow-hidden ${cardCls}`} aria-label={`Calendario de ${tituloMes}`}>
              <div className={`flex flex-wrap justify-between items-center gap-3 px-4 sm:px-5 py-4 border-b ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}>
                <h2 className={`text-base font-black ${tema.title}`}>{tituloMes}</h2>
                <div className="flex items-center gap-1"><button type="button" onClick={irAHoy} className={`px-3 py-2 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}>Hoy</button><button type="button" onClick={() => cambiarMes(-1)} className={`p-2 cursor-pointer ${tema.btnInactive}`} aria-label="Mes anterior"><Icono nombre="chevron-left" className="h-4 w-4" /></button><button type="button" onClick={() => cambiarMes(1)} className={`p-2 cursor-pointer ${tema.btnInactive}`} aria-label="Mes siguiente"><Icono nombre="chevron-right" className="h-4 w-4" /></button></div>
              </div>
              <div className="grid grid-cols-7">
                {DIAS_SEMANA.map((dia) => <div key={dia} className={`text-center text-[10px] font-semibold py-3 ${tema.subtitle}`}>{dia}</div>)}
                {celdas.map((dia, indice) => {
                  const clave = dia ? claveLocal(dia) : `vacio-${indice}`;
                  const elementosDia = dia ? elementosEnFecha(elementosDelMes, clave) : [];
                  const fechasAcademicas = elementosDia.filter((item) => item.origen === 'fecha');
                  const actividades = elementosDia.filter((item) => item.origen === 'evento');
                  const categorias = [...new Set(fechasAcademicas.map((item) => item.tipo))];
                  return <button key={clave} type="button" disabled={!dia} onClick={() => setDiaSeleccionado(clave)}
                    title={elementosDia.map((item) => `${item.origen === 'fecha' ? tipoFecha(item.tipo).emoji : emojiCategoriaEvento(item.tipo)} ${item.titulo}`).join('\n') || undefined}
                    aria-label={dia ? `${fechaLegible(clave)}, ${elementosDia.length} fecha${elementosDia.length === 1 ? '' : 's'}` : undefined} aria-pressed={dia ? diaSeleccionado === clave : undefined}
                    className={`flex flex-col items-center gap-2 min-w-0 min-h-20 sm:min-h-24 px-1 py-2 border-t border-r focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-400 ${modoOscuro ? 'border-slate-800/60' : 'border-slate-100'} ${dia ? 'cursor-pointer hover:bg-amber-400/5' : 'cursor-default'} ${diaSeleccionado === clave ? modoOscuro ? 'bg-amber-400/5 ring-1 ring-inset ring-amber-400/40' : 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''}`}>
                    {dia && <>
                      <span aria-current={clave === hoyClave ? 'date' : undefined} className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${clave === hoyClave ? 'bg-amber-400 font-bold text-slate-950' : tema.title}`}>{dia.getDate()}</span>
                      {categorias.length > 0 && <span className="flex flex-wrap justify-center gap-0.5" aria-hidden="true">{categorias.slice(0, 2).map((valor) => <SimboloFecha key={valor} tipo={valor} compacto />)}{categorias.length > 2 && <span className={`text-[9px] self-center ${tema.subtitle}`}>+{categorias.length - 2}</span>}</span>}
                      {actividades.length > 0 && <>
                        <span className="flex flex-wrap justify-center gap-1 sm:hidden" aria-hidden="true">{[...new Set(actividades.map((item) => item.tipo))].slice(0, 3).map((valor) => <span key={valor} className={`h-2 w-2 rounded-full ${estiloCategoriaEvento(valor, modoOscuro).punto}`} />)}</span>
                        <span className="hidden sm:flex flex-col gap-1 w-full" aria-hidden="true">{actividades.slice(0, categorias.length ? 1 : 2).map((item) => <span key={item.clave} className={`block truncate rounded px-1 py-1 text-left text-[9px] font-semibold ${estiloCategoriaEvento(item.tipo, modoOscuro).badge}`}>{item.titulo}</span>)}{actividades.length > (categorias.length ? 1 : 2) && <span className={`text-[9px] text-left ${tema.subtitle}`}>+{actividades.length - (categorias.length ? 1 : 2)} más</span>}</span>
                      </>}
                    </>}
                  </button>;
                })}
              </div>
              <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}><p className={`text-[11px] ${tema.subtitle}`}>{elementosDelMes.length} {elementosDelMes.length === 1 ? 'fecha este mes' : 'fechas este mes'}</p><select aria-label="Filtrar fechas" value={categoria} onChange={(evento) => setCategoria(evento.target.value)} className={`${selectCls} max-w-full`}><option value="todos">Todas las fechas</option><optgroup label="Fechas académicas">{TIPOS_FECHA.map((item) => <option key={item.value} value={`fecha:${item.value}`}>{item.emoji} {item.label}</option>)}</optgroup><optgroup label="Eventos de clubes">{CATEGORIAS_EVENTO.map((item) => <option key={item.value} value={`evento:${item.value}`}>{item.label}</option>)}</optgroup></select></div>
            </section>
            <aside aria-live="polite" className={`rounded-2xl border p-5 ${cardCls}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${tema.subtitle}`}>En esta fecha</p><h2 className={`text-sm font-bold leading-relaxed ${tema.title}`}>{diaSeleccionado ? fechaLegible(diaSeleccionado) : 'Selecciona un día'}</h2>
              {seleccionados.length ? <div className="mt-3 max-h-96 overflow-y-auto">
                {seleccionados.map((item) => <article key={item.clave} className={`py-4 border-t ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}><button type="button" onClick={() => setDetalle(item)} className="w-full text-left flex items-start gap-3 cursor-pointer group" aria-label={`Ver fecha: ${item.titulo}`}>
                  {item.origen === 'fecha' ? <SimboloFecha tipo={item.tipo} /> : <span aria-hidden="true" className={`inline-flex h-8 w-8 items-center justify-center shrink-0 rounded-lg ${estiloCategoriaEvento(item.tipo, modoOscuro).badge}`}><Icono nombre="calendar" className="h-4 w-4" /></span>}
                  <span className="min-w-0">{item.origen === 'evento' && <span className={`inline-flex rounded px-1.5 py-0.5 mb-1.5 text-[10px] font-semibold ${estiloCategoriaEvento(item.tipo, modoOscuro).badge}`}>{nombreCategoriaEvento(item.tipo)}</span>}<span className={`block text-sm font-semibold break-words group-hover:underline ${tema.title}`}>{item.titulo}</span><span className={`block text-[11px] mt-1 leading-relaxed ${tema.subtitle}`}>{item.fin ? periodoElemento(item) : item.hora ? String(item.hora).slice(0, 5) : 'Todo el día'}</span>{item.descripcion && item.descripcion !== item.titulo && <span className={`block text-xs mt-2 line-clamp-2 break-words ${tema.subtitle}`}>{item.descripcion}</span>}</span>
                </button></article>)}
              </div> : <div className="py-6"><span className={`inline-flex p-2.5 rounded-lg mb-3 ${modoOscuro ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-100 text-slate-500'}`} aria-hidden="true"><Icono nombre="calendar" className="h-5 w-5" /></span><p className={`text-xs leading-relaxed ${tema.subtitle}`}>{errorEventos || calendario.errorCarga ? 'No se pudo consultar toda la agenda.' : diaSeleccionado ? categoria === 'todos' ? 'Sin fechas programadas.' : 'Sin fechas de esta categoría.' : 'Selecciona un día para consultar sus fechas.'}</p></div>}
            </aside>
          </div>
        </div>}
      </div>
      {detalle && (detalle.origen === 'fecha' ? <ModalDetalleFechaAcademica fecha={detalle.original} onClose={() => setDetalle(null)} /> : <ModalDetalleCalendario publicacion={detalle.original} onClose={() => setDetalle(null)} />)}
      {editorMural && <EditorPublicacionMural publicacion={editorMural} onClose={() => setEditorMural(null)} onGuardado={(item) => { propios.incorporar(item); setMensajeMural(item.publicada ? 'Publicación guardada en el mural.' : 'Borrador guardado. Puedes publicarlo desde Administrar mural.'); }} />}
      {compartir && <ModalCompartirMural onClose={() => setCompartir(false)} />}
    </main>
  );
}
