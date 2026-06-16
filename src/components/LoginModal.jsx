// Modal de inicio de sesión con autenticación JWT
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Componente de inicio de sesión con validación de campos
export function LoginModal({ onClose }) {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Envía credenciales al servidor para autenticar
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!correo.trim() || !password.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    const result = await login(correo.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div className="bg-[#0e162c] border border-slate-700/50 rounded-2xl w-full max-w-md p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white">Iniciar Sesión</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Correo Institucional
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@unid.mx"
                className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#18223f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 font-medium mb-3 text-center">Cuentas de prueba</p>
            <div className="space-y-1.5 text-[11px] text-slate-500 font-mono">
              <p>alumno.libre@unid.mx / 123456</p>
              <p>alumno.inscrito@unid.mx / 123456</p>
              <p>presidente@unid.mx / 123456</p>
              <p>admin@unid.mx / 123456</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ✦ A
