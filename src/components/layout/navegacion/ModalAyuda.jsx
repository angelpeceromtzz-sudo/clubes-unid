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
          <strong className="text-amber-400">Clubs UNID</strong> es la plataforma de registro y gestión de clubs universitarios.
        </p>
        <div className={`space-y-2 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          <p><span className="text-amber-400 font-bold">•</span> Explora el catálogo y postúlate a hasta 3 clubs.</p>
          <p><span className="text-amber-400 font-bold">•</span> Sigue el estado de tus postulaciones en tu panel.</p>
          <p><span className="text-amber-400 font-bold">•</span> Si eres presidente, gestiona solicitudes y convocatorias desde el dashboard.</p>
          <p><span className="text-amber-400 font-bold">•</span> Si eres administrador, gestiona usuarios, clubs y roles.</p>
        </div>
        <p className={`text-xs pt-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          ¿Dudas o reportes? Contacta al administrador del sistema.
          contacto@red.unid.mx
        </p>
      </div>
    </ModalBase>
  );
}
