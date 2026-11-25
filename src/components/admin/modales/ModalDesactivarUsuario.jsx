import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { BotonAccion } from '../../ui/BotonAccion';
import { BotonCerrar } from '../../ui/BotonCerrar';
import { ModalBase } from '../../ui/ModalBase';
import { Spinner } from '../../ui/Spinner';

export function ModalDesactivarUsuario({ show, nombre, enviando, error, onConfirmar, onCancelar }) {
  const { inputCls, tema } = useTheme();
  const [password, setPassword] = useState('');

  if (!show) return null;

  function enviar(evento) {
    evento.preventDefault();
    onConfirmar(password);
  }

  return (
    <ModalBase show={show} onClose={onCancelar} maxWidth="max-w-md" closeOnBackdrop={!enviando}>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>Desactivar usuario</h2>
        <BotonCerrar onClick={onCancelar} disabled={enviando} etiqueta="Cancelar" />
      </div>

      <form onSubmit={enviar} className="mt-5 space-y-4">
        <p className={`text-sm leading-relaxed ${tema.subtitle}`}>
          Se desactivará la cuenta de <strong className={tema.title}>{nombre}</strong>. Sus datos e historial se conservarán y podrás reactivarla después.
        </p>
        <div>
          <label htmlFor="clave-desactivacion-usuario" className={`mb-2 block text-sm font-bold ${tema.title}`}>
            Contraseña de administración
          </label>
          <input
            id="clave-desactivacion-usuario"
            type="password"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            className={inputCls}
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
        {error && <p role="alert" className="text-sm font-medium text-red-400">{error}</p>}
        <div className="flex gap-3 pt-1">
          <BotonAccion type="button" variant="outline" onClick={onCancelar} disabled={enviando} className="flex-1">
            Cancelar
          </BotonAccion>
          <BotonAccion type="submit" variant="danger" disabled={enviando} className="flex-1">
            {enviando ? <><Spinner size="sm" color="border-red-400" className="!py-0" />Desactivando…</> : 'Desactivar usuario'}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
