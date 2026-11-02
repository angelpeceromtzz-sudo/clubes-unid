import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';
import { TablaActividadDesktop } from './TablaActividadDesktop';
import { TarjetasActividadMobile } from './TarjetasActividadMobile';
import { PaginacionActividad } from './PaginacionActividad';

export function TablaActividad() {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle } = useTheme();
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', actor: '', tipo: '', club: '' });
  const [opciones, setOpciones] = useState({ actores: [], tipos: [], clubes: [] });

  useEffect(() => {
    api.getActividadFiltros()
      .then((data) => setOpciones(data || { actores: [], tipos: [], clubes: [] }))
      .catch(() => setOpciones({ actores: [], tipos: [], clubes: [] }));
  }, []);

  const cargar = useCallback(async (page, filtrosActuales) => {
    setCargando(true);
    try {
      const data = await api.getActividadClubes(page, filtrosActuales);
      setEventos(data.eventos);
      setTotalPaginas(data.totalPages);
      setPagina(data.page);
    } catch {
      setEventos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar(pagina, filtros);
  }, [pagina, filtros, cargar]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPagina(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black uppercase tracking-wider">Actividad de clubes</h2>
        <button onClick={() => cargar(pagina, filtros)}
          className="text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
        >
          Actualizar
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <select value={filtros.actor} onChange={(e) => actualizarFiltro('actor', e.target.value)} className={`px-3 py-2 rounded-xl border text-sm ${modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
          <option value="">Autor (todos)</option>
          {opciones.actores.map((a) => (
            <option key={a.id} value={a.nombre}>{a.nombre}</option>
          ))}
        </select>

        <select value={filtros.tipo} onChange={(e) => actualizarFiltro('tipo', e.target.value)} className={`px-3 py-2 rounded-xl border text-sm ${modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
          <option value="">Tipo (todos)</option>
          {opciones.tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={filtros.club} onChange={(e) => actualizarFiltro('club', e.target.value)} className={`px-3 py-2 rounded-xl border text-sm ${modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
          <option value="">Club (todos)</option>
          {opciones.clubes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="sm" className="!py-0" />
        </div>
      ) : eventos.length === 0 ? (
        <div className={`${tableBg} rounded-2xl py-16 px-4 text-center`}>
          <svg className={`h-10 w-10 mx-auto mb-3 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className={`text-sm font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
            No hay eventos registrados.
          </p>
        </div>
      ) : (
        <>
          <TablaActividadDesktop eventos={eventos} modoOscuro={modoOscuro} tableBg={tableBg} thCls={thCls} tdCls={tdCls} tdTitle={tdTitle} />
          <TarjetasActividadMobile eventos={eventos} modoOscuro={modoOscuro} tdCls={tdCls} tdTitle={tdTitle} />
          <PaginacionActividad pagina={pagina} totalPaginas={totalPaginas} modoOscuro={modoOscuro} onPaginaChange={setPagina} />
        </>
      )}
    </div>
  );
}
