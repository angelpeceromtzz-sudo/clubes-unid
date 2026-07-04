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

      <form onSubmit={manejarEnvio} className="space-y-5">
        <CampoTexto
          label="Correo Institucional"
          name="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="ejemplo@unid.mx"
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
          <p>rectoria@unid.mx / 123456</p>
        </div>
      </div>
    </ModalBase>
  );
}
