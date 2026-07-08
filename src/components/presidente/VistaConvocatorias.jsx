import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ModalConfiguracionConvocatoria } from './ModalConfiguracionConvocatoria';
import { SolicitudesPresidente } from './SolicitudesPresidente';
import { SeccionConvocatorias } from './SeccionConvocatorias';
import { SeleccionFinal } from './SeleccionFinal';
import { SeccionSeguimientoOfertas } from './SeccionSeguimientoOfertas';

const ETAPAS = [
  { key: 'estado', label: 'Estado', descripcion: 'Gestión de convocatoria' },
  { key: 'forms', label: 'Formularios', descripcion: 'Revisión de postulaciones' },
  { key: 'eval', label: 'Evaluaciones', descripcion: 'Bloques presenciales' },
  { key: 'seleccion', label: 'Selección', descripcion: 'Selección final' },
  { key: 'ofertas', label: 'Ofertas', descripcion: 'Seguimiento de ofertas' },
];

function Timeline({ etapas, activa, onChange }) {
  const { modoOscuro } = useTheme();
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 nav-tabs-hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {etapas.map((etapa, i) => {
        const esActiva = activa === etapa.key;
        const completada = false;
        return (
          <div key={etapa.key} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onChange(etapa.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                esActiva
                  ? 'bg-amber-400 text-[#0e162c] shadow-md'
                  : modoOscuro
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>{etapa.label}</span>
            </button>
            {i < etapas.length - 1 && (
              <div className={`w-4 h-px ${modoOscuro ? 'bg-slate-700' : 'bg-slate-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function VistaConvocatorias({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [subVista, setSubVista] = useState('estado');

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>Convocatorias</h2>
        <p className={`text-sm mt-0.5 ${tema.subtitle}`}>Gestiona todo el proceso de reclutamiento de tu club.</p>
      </div>

      <div className={`rounded-2xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <Timeline etapas={ETAPAS} activa={subVista} onChange={setSubVista} />
      </div>

      <div className="mt-6">
        {subVista === 'estado' && <ModalConfiguracionConvocatoria club={club} />}
        {subVista === 'forms' && <SolicitudesPresidente club={club} />}
        {subVista === 'eval' && <SeccionConvocatorias club={club} />}
        {subVista === 'seleccion' && <SeleccionFinal club={club} />}
        {subVista === 'ofertas' && <SeccionSeguimientoOfertas club={club} />}
      </div>
    </div>
  );
}
