import { useState } from 'react';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BotonMicrosoft } from '../ui/BotonMicrosoft';
import { Icono } from '../ui/Icono';
import { CampoTexto } from '../ui/CampoTexto';
import { ModalBase } from '../ui/ModalBase';

export function ModalInicioSesion({ onClose }) {
  const { modoOscuro } = useTheme();
  const { iniciarSesion } = useAutenticacion();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
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
    <ModalBase show={true} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-black ${esOscuro ? 'text-white' : 'text-slate-900'}`}>Iniciar Sesión</h2>
        <button
          onClick={onClose}
          className={`${esOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors cursor-pointer`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6 text-slate-400" />
        </button>
      </div>

      {mostrarFormulario ? (
        <>
          <button
            onClick={() => setMostrarFormulario(false)}
            className={`flex items-center gap-1.5 text-sm ${esOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors mb-4 cursor-pointer`}
          >
            <Icono nombre="arrow-left" strokeWidth={2} className="h-4 w-4" />
            Volver
          </button>

          <form onSubmit={manejarEnvio} className="space-y-5">
            <CampoTexto
              label="Correo"
              name="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
            />

            <CampoTexto
              label="Contraseña"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />

            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </>
      ) : (
        <div className="space-y-5">
          <BotonMicrosoft onSuccess={onClose} />

          <button
            onClick={() => setMostrarFormulario(true)}
            className={`w-full border ${esOscuro ? 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'} font-medium text-sm rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98]`}
          >
            Iniciar sesión con cuenta de administrador
          </button>
        </div>
      )}
    </ModalBase>
  );
}
