import { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api, request } from '../../../services/api';
import { ModalBase } from '../../ui/ModalBase';
import { BotonAccion } from '../../ui/BotonAccion';
import { BotonCerrar } from '../../ui/BotonCerrar';
import { Alerta } from '../../ui/Alerta';

const TIPOS = ['texto', 'textarea', 'numero', 'seleccion', 'fecha'];

export function ModalConfigurarFormulario({ club, onClose }) {
  const { modoOscuro } = useTheme();
  const tema = modoOscuro ? 'dark' : 'light';
  const [preguntas, setPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState({ etiqueta: '', tipo: 'texto', opciones: '', obligatorio: false });
  const [guardando, setGuardando] = useState(false);

  const idClub = club?.id_club || club?.id;

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const data = await api.get(`/clubes/${idClub}/preguntas`);
      setPreguntas(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar las preguntas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [idClub]);

  async function agregar() {
    if (!nueva.etiqueta.trim()) return;
    setGuardando(true);
    setError('');
    try {
      const configuracion = nueva.tipo === 'seleccion'
        ? { opciones: nueva.opciones.split(',').map((s) => s.trim()).filter(Boolean) }
        : {};
      await request(`/clubes/${idClub}/preguntas`, {
        method: 'POST',
        body: JSON.stringify({ etiqueta: nueva.etiqueta.trim(), tipo: nueva.tipo, configuracion, obligatorio: nueva.obligatorio }),
      });
      setNueva({ etiqueta: '', tipo: 'texto', opciones: '', obligatorio: false });
      await cargar();
    } catch (e) {
      setError(e?.message || 'No se pudo agregar la pregunta');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(idPregunta) {
    try {
      await request(`/clubes/${idClub}/preguntas/${idPregunta}`, { method: 'DELETE' });
      await cargar();
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar');
    }
  }

  async function aplicarPlantilla(categoria) {
    try {
      await request(`/clubes/${idClub}/preguntas/plantilla`, {
        method: 'POST',
        body: JSON.stringify({ categoria }),
      });
      await cargar();
    } catch (e) {
      setError(e?.message || 'No se pudo aplicar la plantilla');
    }
  }

  return (
    <ModalBase show={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-black ${tema === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          Configurar formulario — {club?.nombre_club || club?.nombre}
        </h2>
        <BotonCerrar onClick={onClose} etiqueta="Cerrar" />
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}

      <div className="mb-4">
        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${tema === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Aplicar plantilla</p>
        <div className="grid grid-cols-4 gap-2">
          {['Deportivos', 'Culturales', 'Tecnologicos', 'Sociales'].map((cat) => (
            <BotonAccion key={cat} onClick={() => aplicarPlantilla(cat)} className="!rounded-lg !px-2 !py-3 text-[10px] whitespace-nowrap">
              {cat}
            </BotonAccion>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando preguntas…</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {preguntas.map((p) => (
            <li key={p.id_pregunta} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${tema === 'dark' ? 'border-slate-700 bg-[#0e162c]' : 'border-slate-200 bg-white'}`}>
              <div>
                <p className={`text-sm font-bold ${tema === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.etiqueta}</p>
                <p className={`text-xs ${tema === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{p.tipo}{p.obligatorio ? ' · obligatorio' : ''}</p>
              </div>
              <button onClick={() => eliminar(p.id_pregunta)} className="text-red-400 text-xs font-bold cursor-pointer">Eliminar</button>
            </li>
          ))}
          {preguntas.length === 0 && <p className="text-sm text-slate-400">Sin preguntas adicionales.</p>}
        </ul>
      )}

      <div className={`border-t pt-4 space-y-3 ${tema === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${tema === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Agregar pregunta</p>
        <input
          value={nueva.etiqueta}
          onChange={(e) => setNueva((n) => ({ ...n, etiqueta: e.target.value }))}
          placeholder="Etiqueta de la pregunta"
          className={`w-full border rounded-lg px-3 py-2 text-sm ${tema === 'dark' ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
        />
        <div className="flex gap-2">
          <select
            value={nueva.tipo}
            onChange={(e) => setNueva((n) => ({ ...n, tipo: e.target.value }))}
            className={`border rounded-lg px-3 py-2 text-sm ${tema === 'dark' ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
          >
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {nueva.tipo === 'seleccion' && (
            <input
              value={nueva.opciones}
              onChange={(e) => setNueva((n) => ({ ...n, opciones: e.target.value }))}
              placeholder="Opciones separadas por coma"
              className={`flex-1 border rounded-lg px-3 py-2 text-sm ${tema === 'dark' ? 'bg-[#18223f] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
            />
          )}
        </div>
        <label className={`flex items-center gap-2 text-xs font-bold ${tema === 'dark' ? 'text-slate-400' : 'text-slate-600'} cursor-pointer`}>
          <input type="checkbox" checked={nueva.obligatorio} onChange={(e) => setNueva((n) => ({ ...n, obligatorio: e.target.checked }))} className="h-4 w-4 accent-amber-500" />
          Obligatoria
        </label>
        <BotonAccion onClick={agregar} disabled={guardando || !nueva.etiqueta.trim()} className="!rounded-lg">
          {guardando ? 'Guardando…' : 'Agregar pregunta'}
        </BotonAccion>
      </div>
    </ModalBase>
  );
}
