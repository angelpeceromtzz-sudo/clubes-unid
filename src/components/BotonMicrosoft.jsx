import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../services/authConfig';

export function BotonMicrosoft({ onSuccess }) {
  const { instance } = useMsal();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  function handleClick() {
    setError('');
    setCargando(true);
    instance.loginRedirect(loginRequest).catch((err) => {
      setCargando(false);
      setError(err.message || 'Error al redirigir a Microsoft');
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={cargando}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-semibold text-sm rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm border border-gray-200"
      >
        <svg viewBox="0 0 21 21" className="w-5 h-5 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" rx="1.5" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" rx="1.5" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" rx="1.5" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" rx="1.5" />
        </svg>
        {cargando ? 'Conectando con Microsoft...' : 'Iniciar sesión con correo institucional'}
      </button>

      {error && (
        <p className="text-red-400 text-sm font-medium text-center">{error}</p>
      )}
    </div>
  );
}
