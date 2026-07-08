import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { BotonAccion } from '../ui/BotonAccion';
import { ModalBase } from '../ui/ModalBase';
import { Spinner } from '../ui/Spinner';

export function ModalPasswordAdmin({
  show, targetUser, accion, enviando, error,
  onConfirm, onClose,
}) {
  const { modoOscuro, inputCls, tema } = useTheme();
  const [password, setPassword] = useState('');

  if (!show) return null;

  const esPromover = accion === 'promote';

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm(password);
  }

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {esPromover ? 'Promover a Admin' : 'Degradar Admin'}
        </h2>
        <button
          onClick={onClose}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className={`text-sm ${tema.subtitle}`}>
          {esPromover
            ? `¿Estás seguro de promover a "${targetUser?.nombre_completo}" como administrador?`
            : `¿Estás seguro de degradar a "${targetUser?.nombre_completo}" a alumno?`}
        </p>
        <p className={`text-xs ${tema.subtitle}`}>
          Ingresa la contraseña de administrador para confirmar.
        </p>

        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña de administrador"
            className={inputCls}
            autoFocus
            required
          />
        </div>

        {error && <p className="text-red-400 text-xs font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onClose} variant="outline" size="md" className="flex-1">
            Cancelar
          </BotonAccion>
          <BotonAccion type="submit" disabled={enviando} variant={esPromover ? 'primary' : 'danger'} size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                Confirmando...
              </>
            ) : esPromover ? 'Promover' : 'Degradar'}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}