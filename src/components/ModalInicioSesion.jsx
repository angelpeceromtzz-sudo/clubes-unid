import { useState } from 'react';
import { useAutenticacion } from '../contexts/AuthContext';
import { BotonMicrosoft } from './BotonMicrosoft';

export function ModalInicioSesion({ onClose, modoOscuro }) {
  const { iniciarSesion } = useAutenticacion();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const esOscuro = modoOscuro;

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');

    if (!correo.trim() || !password.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setCargando(true);
    const result = await iniciarSesion(correo.trim(), password);
    setCargando(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div className={`${esOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-xl'} border rounded-2xl w-full max-w-md p-8 shadow-2xl`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-black ${esOscuro ? 'text-white' : 'text-slate-900'}`}>Iniciar Sesión</h2>
            <button
              onClick={onClose}
              className={`${esOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors cursor-pointer`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={manejarEnvio} className="space-y-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest ${esOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1.5`}>
                Correo Institucional
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@unid.mx"
                className={`w-full ${esOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest ${esOscuro ? 'text-slate-400' : 'text-slate-600'} mb-1.5`}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className={`w-full ${esOscuro ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all`}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${esOscuro ? 'border-slate-700/50' : 'border-slate-200'}`} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className={`${esOscuro ? 'bg-[#0e162c] text-slate-500' : 'bg-white text-slate-500'} px-3 font-medium`}>O continúa con</span>
            </div>
          </div>

          <BotonMicrosoft onSuccess={onClose} />

          <div className={`mt-6 pt-5 border-t ${esOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <p className={`text-xs ${esOscuro ? 'text-slate-500' : 'text-slate-500'} font-medium mb-3 text-center`}>Cuentas de prueba</p>
            <div className={`space-y-1.5 text-[11px] ${esOscuro ? 'text-slate-500' : 'text-slate-400'} font-mono`}>
              <p>alumno.libre@unid.mx / 123456</p>
              <p>alumno.inscrito@unid.mx / 123456</p>
              <p>presidente@unid.mx / 123456</p>
              <p>admin@unid.mx / 123456</p>
              <p>escolares@unid.mx / 123456</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
