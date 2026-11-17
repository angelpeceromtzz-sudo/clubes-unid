import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { BotonCerrar } from '../../ui/BotonCerrar';
import { ModalBase } from '../../ui/ModalBase';

export function ModalAyuda({ show, onClose }) {
  const { tema, modoOscuro } = useTheme();

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>Ayuda</h3>
        <BotonCerrar onClick={onClose} />
      </div>
      <div className={`space-y-4 text-sm leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
        <p>
          Esta página es la plataforma de registro y gestión de <strong className="text-amber-400">clubs universitarios</strong> del campus de la UNID en Campeche.
        </p>
        <div className={`space-y-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          <p><span className="text-amber-400 font-bold">•</span> Explora el catálogo y postúlate a hasta 3 clubs.</p>
          <p><span className="text-amber-400 font-bold">•</span> Sigue el estado de tus postulaciones en tu panel.</p>
          <p><span className="text-amber-400 font-bold">•</span> Si eres presidente, gestiona solicitudes y convocatorias desde el panel.</p>
          <p><span className="text-amber-400 font-bold">•</span> Si eres administrador, gestiona usuarios, clubs y roles.</p>
        </div>
        <Link
          to="/preguntas-frecuentes"
          onClick={onClose}
          className="flex items-center justify-center w-full px-5 py-3 rounded-full bg-amber-400 text-[#0e162c] font-black text-sm hover:bg-amber-300 transition"
        >
          Ver preguntas frecuentes
        </Link>
        <p className={`text-xs pt-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          ¿Dudas o reportes? Contacta al administrador del sistema.
          00906641@red.unid.mx
        </p>
      </div>
    </ModalBase>
  );
}
