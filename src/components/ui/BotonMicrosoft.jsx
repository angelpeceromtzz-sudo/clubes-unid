/* Botón de inicio de sesión con Microsoft (MSAL). Muestra estado de carga y errores. */
import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useTheme } from '../../contexts/ThemeContext';
import { loginRequest } from '../../services/authConfig';
import { Icono } from './Icono';

export function BotonMicrosoft() {
  const { instance } = useMsal();
  const { modoOscuro } = useTheme();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  function manejarClick() {
    setError('');
    setCargando(true);
    instance.loginRedirect(loginRequest).catch((err) => {
      setCargando(false);
      setError(err.message || 'Error al redirigir a Microsoft');
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={manejarClick}
        disabled={cargando}
        aria-busy={cargando}
        className={`group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 ${
          modoOscuro
            ? 'border-slate-700/60 bg-[#121c33] hover:border-slate-500 hover:bg-[#16213b] focus-visible:ring-offset-[#0e162c]'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-offset-white'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          {cargando ? (
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
            />
          ) : (
            <svg viewBox="0 0 21 21" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" rx="1.5" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" rx="1.5" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" rx="1.5" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" rx="1.5" />
            </svg>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold leading-snug ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
            {cargando ? 'Conectando con Microsoft...' : 'Entrar con Microsoft 365'}
          </span>
          <span className={`mt-1 block text-xs leading-relaxed sm:text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            {cargando ? 'Te estamos redirigiendo de forma segura.' : 'Usa tu cuenta institucional de la UNID.'}
          </span>
        </span>

        {!cargando && (
          <Icono
            nombre="chevron-right"
            strokeWidth={2.5}
            className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 ${
              modoOscuro ? 'text-slate-500' : 'text-slate-400'
            }`}
          />
        )}
      </button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className={`px-1 text-xs font-medium ${modoOscuro ? 'text-red-400' : 'text-red-600'}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
