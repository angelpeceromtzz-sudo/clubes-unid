import { useEffect, useRef, useState } from 'react';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../services/api';
import { Alerta } from '../ui/Alerta';
import { BotonMicrosoft } from '../ui/BotonMicrosoft';
import { BotonCerrar } from '../ui/BotonCerrar';
import { Icono } from '../ui/Icono';
import { CampoTexto } from '../ui/CampoTexto';
import { ModalBase } from '../ui/ModalBase';
import {
  LARGO_CODIGO_OTP,
  SEGUNDOS_REENVIO_OTP,
  esCodigoOtpValido,
  esCorreoOtpValido,
  esOtpHabilitado,
  formatearEsperaOtp,
  mensajeErrorOtp,
  normalizarCodigoOtp,
  normalizarCorreoOtp,
  segundosDeEsperaOtp,
} from '../../utils/otpAcceso';
import {
  LARGO_MAXIMO_NOMBRE_OTP,
  normalizarNombreOtp,
  validarNombreOtp,
} from '../../utils/nombreOtp';

const OTP_HABILITADO = esOtpHabilitado(import.meta.env.VITE_AUTH_OTP_ENABLED);

const VISTA = Object.freeze({
  OPCIONES: 'opciones',
  LOCAL: 'local',
  OTP_CORREO: 'otp-correo',
  OTP_CODIGO: 'otp-codigo',
  OTP_NOMBRE: 'otp-nombre',
});

const MENSAJE_CODIGO_ENVIADO =
  'Si el correo es válido, enviamos un código de 6 dígitos. Revisa tu bandeja de entrada y la carpeta de spam.';

function validarCorreoOtp(valor) {
  const correo = normalizarCorreoOtp(valor);

  if (!correo) {
    return 'Ingresa tu correo institucional.';
  }

  if (!esCorreoOtpValido(correo)) {
    return 'Usa un correo @red.unid.mx o @unid.mx.';
  }

  return '';
}

function validarCodigoOtp(valor) {
  return esCodigoOtpValido(valor) ? '' : `Ingresa los ${LARGO_CODIGO_OTP} dígitos del código.`;
}

function BotonVolver({ onClick, esOscuro }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 ${
        esOscuro
          ? 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
          : 'bg-amber-600/10 text-amber-600 hover:bg-amber-600/20'
      }`}
    >
      <Icono nombre="arrow-left" strokeWidth={2.5} className="h-4 w-4" />
      Volver
    </button>
  );
}

function IndicadorEspera({ segundos, prefijo = 'Podrás solicitar otro código en' }) {
  if (segundos <= 0) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
      <Icono nombre="clock" strokeWidth={2} className="h-3.5 w-3.5" />
      {prefijo} {formatearEsperaOtp(segundos)}
    </p>
  );
}

export function ModalInicioSesion({ onClose }) {
  const { modoOscuro } = useTheme();
  const { iniciarSesion, iniciarSesionOtp } = useAutenticacion();
  const [vista, setVista] = useState(VISTA.OPCIONES);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [errorCorreo, setErrorCorreo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState('');
  const [errorNombre, setErrorNombre] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [correoTocado, setCorreoTocado] = useState(false);
  const [nombreTocado, setNombreTocado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoOtp, setCargandoOtp] = useState(false);
  const [cooldownReenvio, setCooldownReenvio] = useState(0);
  const [cooldownVerificacion, setCooldownVerificacion] = useState(0);
  const peticionOtpRef = useRef(false);
  const esOscuro = modoOscuro;
  const hayCuentaAtras = cooldownReenvio > 0 || cooldownVerificacion > 0;

  useEffect(() => {
    if (!hayCuentaAtras) {
      return undefined;
    }

    const intervalo = window.setInterval(() => {
      setCooldownReenvio((segundos) => (segundos > 0 ? segundos - 1 : 0));
      setCooldownVerificacion((segundos) => (segundos > 0 ? segundos - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [hayCuentaAtras]);

  function cerrarModal() {
    setVista(VISTA.OPCIONES);
    setCorreo('');
    setPassword('');
    setCodigo('');
    setNombre('');
    setError('');
    setErrorCorreo('');
    setErrorCodigo('');
    setErrorNombre('');
    setMensaje('');
    setCorreoTocado(false);
    setNombreTocado(false);
    setCargando(false);
    setCargandoOtp(false);
    setCooldownReenvio(0);
    setCooldownVerificacion(0);
    onClose();
  }

  function irAOpciones() {
    setVista(VISTA.OPCIONES);
    setPassword('');
    setNombre('');
    setError('');
    setErrorCorreo('');
    setErrorCodigo('');
    setErrorNombre('');
    setMensaje('');
    setNombreTocado(false);
  }

  function irAOtpCorreo() {
    setVista(VISTA.OTP_CORREO);
    setCodigo('');
    setNombre('');
    setError('');
    setErrorCorreo('');
    setErrorCodigo('');
    setErrorNombre('');
    setMensaje('');
    setCorreoTocado(false);
    setNombreTocado(false);
  }

  function volverAtras() {
    if (vista === VISTA.OTP_NOMBRE) {
      setVista(VISTA.OTP_CODIGO);
      setError('');
      setErrorNombre('');
      setNombreTocado(false);
      return;
    }

    if (vista === VISTA.OTP_CODIGO) {
      irAOtpCorreo();
      return;
    }

    irAOpciones();
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');

    if (cargando) {
      return;
    }

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

    cerrarModal();
  }

  async function solicitarCodigo({ reenvio = false } = {}) {
    if (peticionOtpRef.current || cargandoOtp || cooldownReenvio > 0) {
      return;
    }

    const correoNormalizado = normalizarCorreoOtp(correo);
    const errorValidacion = validarCorreoOtp(correoNormalizado);

    setError('');
    if (!reenvio) {
      setCorreoTocado(true);
    }
    setErrorCorreo(errorValidacion);

    if (errorValidacion) {
      return;
    }

    peticionOtpRef.current = true;
    setCargandoOtp(true);

    try {
      await api.solicitarOtp(correoNormalizado);
      setCorreo(correoNormalizado);
      setCodigo('');
      setErrorCorreo('');
      setErrorCodigo('');
      setMensaje(MENSAJE_CODIGO_ENVIADO);
      setCooldownReenvio(SEGUNDOS_REENVIO_OTP);
      setVista(VISTA.OTP_CODIGO);
    } catch (err) {
      setError(mensajeErrorOtp(err, 'solicitar'));

      if (Number(err?.status) === 429) {
        setCooldownReenvio(segundosDeEsperaOtp(err) || SEGUNDOS_REENVIO_OTP);
      }
    } finally {
      peticionOtpRef.current = false;
      setCargandoOtp(false);
    }
  }

  function manejarSolicitar(e) {
    e.preventDefault();
    void solicitarCodigo();
  }

  function manejarReenviar() {
    void solicitarCodigo({ reenvio: true });
  }

  function manejarCambioCorreo(e) {
    const valor = e.target.value;
    setCorreo(valor);
    setError('');
    setMensaje('');

    if (correoTocado) {
      setErrorCorreo(validarCorreoOtp(valor));
    }
  }

  function manejarBlurCorreo() {
    setCorreoTocado(true);
    setErrorCorreo(validarCorreoOtp(correo));
  }

  function manejarCambioCodigo(e) {
    setCodigo(normalizarCodigoOtp(e.target.value));
    setError('');
    setErrorCodigo('');
  }

  function manejarCambioNombre(e) {
    const valor = e.target.value;
    setNombre(valor);
    setError('');
    setErrorNombre('');

    if (nombreTocado) {
      setErrorNombre(validarNombreOtp(valor, correo));
    }
  }

  function manejarBlurNombre() {
    setNombreTocado(true);
    setErrorNombre(validarNombreOtp(nombre, correo));
  }

  async function manejarVerificar(e) {
    e.preventDefault();

    if (peticionOtpRef.current || cargandoOtp || cooldownVerificacion > 0) {
      return;
    }

    const errorValidacion = validarCodigoOtp(codigo);
    setError('');
    setErrorCodigo(errorValidacion);

    if (errorValidacion) {
      return;
    }

    peticionOtpRef.current = true;
    setMensaje('');
    setCargandoOtp(true);
    const result = await iniciarSesionOtp(normalizarCorreoOtp(correo), codigo);
    peticionOtpRef.current = false;
    setCargandoOtp(false);

    if (result.ok) {
      setCodigo('');
      cerrarModal();
      return;
    }

    if (result.requiereNombre) {
      setVista(VISTA.OTP_NOMBRE);
      setNombre('');
      setError('');
      setErrorNombre('');
      setNombreTocado(false);
      setMensaje('');
      return;
    }

    setError(mensajeErrorOtp(result, 'verificar'));

    if (Number(result.status) === 429) {
      setCooldownVerificacion(segundosDeEsperaOtp(result) || SEGUNDOS_REENVIO_OTP);
    }
  }

  async function manejarRegistrarNombre(e) {
    e.preventDefault();

    if (peticionOtpRef.current || cargandoOtp || cooldownVerificacion > 0) {
      return;
    }

    const nombreNormalizado = normalizarNombreOtp(nombre);
    const errorValidacion = validarNombreOtp(nombreNormalizado, correo);

    setError('');
    setNombreTocado(true);
    setErrorNombre(errorValidacion);

    if (errorValidacion) {
      return;
    }

    peticionOtpRef.current = true;
    setCargandoOtp(true);
    const result = await iniciarSesionOtp(
      normalizarCorreoOtp(correo),
      codigo,
      nombreNormalizado,
    );
    peticionOtpRef.current = false;
    setCargandoOtp(false);

    if (result.ok) {
      setNombre('');
      setCodigo('');
      cerrarModal();
      return;
    }

    if (result.requiereNombre) {
      setErrorNombre(result.error || 'Escribe tu nombre completo.');
      return;
    }

    setError(mensajeErrorOtp(result, 'verificar'));

    if (Number(result.status) === 429) {
      setCooldownVerificacion(segundosDeEsperaOtp(result) || SEGUNDOS_REENVIO_OTP);
    }
  }

  const titulo = vista === VISTA.OTP_CORREO
    ? 'Acceso con código'
    : vista === VISTA.OTP_CODIGO
      ? 'Revisa tu correo'
      : vista === VISTA.OTP_NOMBRE
        ? 'Completa tu registro'
        : 'Iniciar Sesión';

  return (
    <ModalBase
      show={true}
      onClose={cerrarModal}
      maxWidth="max-w-sm"
      panelClassName={`${
        esOscuro ? 'bg-[#0e162c] border border-slate-700/30' : 'bg-white border border-slate-200/70 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {vista !== VISTA.OPCIONES ? (
          <BotonVolver onClick={volverAtras} esOscuro={esOscuro} />
        ) : (
          <span />
        )}
        <BotonCerrar onClick={cerrarModal} />
      </div>

      <h2 className={`text-2xl font-black mb-6 ${esOscuro ? 'text-white' : 'text-slate-900'}`}>{titulo}</h2>

      {vista === VISTA.OPCIONES && (
        <div className="space-y-5">
          <BotonMicrosoft />

          <button
            type="button"
            onClick={() => {
              setVista(VISTA.LOCAL);
              setError('');
            }}
            className={`w-full border ${esOscuro ? 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'} font-medium text-sm rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98]`}
          >
            Iniciar sesión con cuenta local
          </button>

          {OTP_HABILITADO && (
            <button
              type="button"
              onClick={irAOtpCorreo}
              className={`w-full flex items-center justify-center gap-2 border font-bold text-sm rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                esOscuro
                  ? 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10'
                  : 'border-amber-500/40 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Icono nombre="login" strokeWidth={2} className="h-4 w-4" />
              Acceder con código institucional
            </button>
          )}
        </div>
      )}

      {vista === VISTA.LOCAL && (
        <form onSubmit={manejarEnvio} className="space-y-5">
          <CampoTexto
            label="Correo"
            name="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
          />

          <CampoTexto
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
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
      )}

      {vista === VISTA.OTP_CORREO && (
        <form onSubmit={manejarSolicitar} noValidate className="space-y-4">
          <p className={`text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Te enviaremos un código de 6 dígitos a tu correo institucional.
          </p>

          <CampoTexto
            label="Correo institucional"
            name="otp-correo"
            type="email"
            value={correo}
            onChange={manejarCambioCorreo}
            onBlur={manejarBlurCorreo}
            placeholder="usuario@red.unid.mx"
            autoComplete="email"
            autoFocus
            error={errorCorreo}
          />

          {correoTocado && !errorCorreo && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Icono nombre="check-circle" strokeWidth={2} className="h-3.5 w-3.5" />
              Dominio institucional válido.
            </p>
          )}

          {error && (
            <div aria-live="polite">
              <Alerta tipo="error" mensaje={error} />
            </div>
          )}

          <IndicadorEspera segundos={cooldownReenvio} />

          <button
            type="submit"
            disabled={cargandoOtp || cooldownReenvio > 0}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            {cargandoOtp ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      )}

      {vista === VISTA.OTP_CODIGO && (
        <form onSubmit={manejarVerificar} noValidate className="space-y-4">
          <p className={`text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Ingresa el código de 6 dígitos enviado a <span className="font-semibold break-all">{correo}</span>.
          </p>

          {mensaje && (
            <div aria-live="polite">
              <Alerta tipo="success" mensaje={mensaje} />
            </div>
          )}

          <CampoTexto
            label="Código de verificación"
            name="otp-codigo"
            type="text"
            value={codigo}
            onChange={manejarCambioCodigo}
            placeholder="000000"
            maxLength={LARGO_CODIGO_OTP}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoFocus
            error={errorCodigo}
          />

          {error && (
            <div aria-live="polite">
              <Alerta tipo="error" mensaje={error} />
            </div>
          )}

          <IndicadorEspera
            segundos={cooldownVerificacion}
            prefijo="Podrás verificar de nuevo en"
          />

          <button
            type="submit"
            disabled={cargandoOtp || cooldownVerificacion > 0}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            {cargandoOtp ? 'Verificando...' : 'Verificar código'}
          </button>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={irAOtpCorreo}
              disabled={cargandoOtp}
              className={`text-xs font-bold underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                esOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cambiar correo
            </button>

            <button
              type="button"
              onClick={manejarReenviar}
              disabled={cargandoOtp || cooldownReenvio > 0}
              className={`text-xs font-bold underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                esOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              Solicitar otro código
            </button>
          </div>

          <IndicadorEspera segundos={cooldownReenvio} />
        </form>
      )}

      {vista === VISTA.OTP_NOMBRE && (
        <form onSubmit={manejarRegistrarNombre} noValidate className="space-y-4">
          <p className={`text-sm ${esOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
            Es tu primer acceso con <span className="font-semibold break-all">{correo}</span>.
            Escribe tu nombre completo para crear tu cuenta.
          </p>

          <CampoTexto
            label="Nombre completo"
            name="otp-nombre"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            onBlur={manejarBlurNombre}
            placeholder="Nombre(s) y apellidos"
            autoComplete="name"
            maxLength={LARGO_MAXIMO_NOMBRE_OTP}
            autoFocus
            required
            error={errorNombre}
          />

          {error && (
            <div aria-live="polite">
              <Alerta tipo="error" mensaje={error} />
            </div>
          )}

          <IndicadorEspera
            segundos={cooldownVerificacion}
            prefijo="Podrás intentarlo de nuevo en"
          />

          <button
            type="submit"
            disabled={cargandoOtp || cooldownVerificacion > 0}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            {cargandoOtp ? 'Guardando...' : 'Crear cuenta e ingresar'}
          </button>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={irAOtpCorreo}
              disabled={cargandoOtp}
              className={`text-xs font-bold underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                esOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cambiar correo
            </button>

            <button
              type="button"
              onClick={manejarReenviar}
              disabled={cargandoOtp || cooldownReenvio > 0}
              className={`text-xs font-bold underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                esOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
              }`}
            >
              Solicitar otro código
            </button>
          </div>

          <IndicadorEspera segundos={cooldownReenvio} />
        </form>
      )}
    </ModalBase>
  );
}
