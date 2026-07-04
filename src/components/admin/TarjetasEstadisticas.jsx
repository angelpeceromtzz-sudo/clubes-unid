/* Tarjetas de resumen con totales de alumnos, clubes activos e inscripciones. */
import { useTheme } from '../../contexts/ThemeContext';

export function TarjetasEstadisticas({ totalAlumnos, clubesActivos, totalInscripciones }) {
  const { cardCls, tema } = useTheme();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className={`${cardCls} rounded-2xl p-6`}>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Total Alumnos</p>
        <p className={`text-4xl font-black ${tema.title}`}>{totalAlumnos}</p>
      </div>
      <div className={`${cardCls} rounded-2xl p-6`}>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Clubes Activos</p>
        <p className={`text-4xl font-black ${tema.title}`}>{clubesActivos}</p>
      </div>
      <div className={`${cardCls} rounded-2xl p-6`}>
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Inscripciones Activas</p>
        <p className={`text-4xl font-black ${tema.title}`}>{totalInscripciones}</p>
      </div>
    </div>
  );
}
