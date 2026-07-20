import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ModalExito } from '../modals/ModalExito';
import { api } from '../../services/api';
import { useAutenticacion } from '../../contexts/AuthContext';
import { Icono } from '../ui/Icono';
import { Alerta } from '../ui/Alerta';
import { CampoTexto } from '../ui/CampoTexto';
import { CampoSelect } from '../ui/CampoSelect';
import { ModalBase } from '../ui/ModalBase';

const CARRERAS = [
  'Ingeniería en Software y Sist.',
  'Administración de Empresas',
  'Derecho',
  'Arquitectura',
  'Diseño Gráfico',
  'Educación Física',
  'Otra',
];

const TURNOS = ['Matutino', 'Vespertino'];

const ETIQUETAS = {
  nombre_completo: 'Nombre Completo',
  matricula: 'Matrícula',
  carrera: 'Carrera',
  cuatrimestre: 'Cuatrimestre',
  turno: 'Turno',
  telefono_contacto: 'Teléfono de Contacto',
  motivo_ingreso: 'Motivo de Ingreso',
  experiencia_previa: 'Experiencia Previa',
};

export function FormularioInscripcion({ club, onClose }) {
  const { usuario, clubesPostulados, actualizarClubesPostulados, refrescarInscripcionActiva } = useAutenticacion();
  const [formulario, setFormulario] = useState({
    id_club: club.id_club || club.id,
    nombre_completo: usuario?.nombre_completo || '',
    matricula: usuario?.institutional_id || '',
    carrera: '',
    cuatrimestre: '',
    turno: '',
    telefono_contacto: '',
    motivo_ingreso: '',
    experiencia_previa: '',
  });
  const idClubActual = club.id_club || club.id;
  const yaPostulado = clubesPostulados.includes(idClubActual);
  const limiteAlcanzado = clubesPostulados.length >= 3;
  const bloqueado = yaPostulado || limiteAlcanzado;
  const datosPrecargados = !!usuario?.institutional_id;

  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  function validar() {
    const errs = {};
    if (!formulario.nombre_completo.trim()) errs.nombre_completo = 'El nombre es obligatorio';
    if (!datosPrecargados) {
      if (!formulario.matricula) {
        errs.matricula = 'La matrícula es obligatoria';
      } else if (!/^\d+$/.test(formulario.matricula)) {
        errs.matricula = 'La matrícula debe contener solo números';
      }
    }
    if (!formulario.carrera) errs.carrera = 'Selecciona una carrera';
    if (!formulario.cuatrimestre) {
      errs.cuatrimestre = 'El cuatrimestre es obligatorio';
    } else if (parseInt(formulario.cuatrimestre) < 1) {
      errs.cuatrimestre = 'El cuatrimestre debe ser mayor a 0';
    }
    if (!formulario.turno) errs.turno = 'Selecciona un turno';
    if (!formulario.telefono_contacto) {
      errs.telefono_contacto = 'El teléfono de contacto es obligatorio';
    } else if (!/^\d{10}$/.test(formulario.telefono_contacto)) {
      errs.telefono_contacto = 'El teléfono debe ser de 10 dígitos numéricos';
    }
    if (!formulario.motivo_ingreso.trim()) errs.motivo_ingreso = 'Indica por qué quieres unirte';
    return errs;
  }

  function manejarCambio(e) {
    const { name, value } = e.target;
    if (name === 'matricula' || name === 'telefono_contacto') {
      if (!/^\d*$/.test(value)) return;
    }
    setFormulario((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: '' }));
  }

  function manejarConfirmacion(e) {
    e.preventDefault();
    setErrorApi('');
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    setConfirmando(true);
  }

  async function manejarEnvio() {
    setEnviando(true);
    try {
      await api.createFormulario({
        ...formulario,
        cuatrimestre: parseInt(formulario.cuatrimestre, 10),
      });
      await refrescarInscripcionActiva();
      actualizarClubesPostulados((prev) => [...prev, idClubActual]);
      setEnviado(true);
    } catch (err) {
      setErrorApi(err.message);
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  }

  const { tema, modoOscuro } = useTheme();

  const resumenCls = `rounded-xl border p-4 ${modoOscuro ? 'bg-slate-800/30 border-slate-700/30' : 'bg-slate-50 border-slate-200'}`;
  const resumenLabelCls = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';
  const resumenValCls = `text-sm font-medium mt-0.5 ${modoOscuro ? 'text-white' : 'text-slate-900'}`;

  return (
    <>
      <ModalBase show={true} onClose={() => {}}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-xl font-black ${tema.title}`}>Formulario de Inscripción</h2>
            <p className={`text-sm mt-0.5 ${tema.subtitle}`}>{club.nombre_club}</p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors cursor-pointer ${modoOscuro ? 'text-amber-300 hover:text-amber-200' : 'text-amber-500 hover:text-amber-600'}`}
          >
            <Icono nombre="close" strokeWidth={2} className="h-7 w-7" />
          </button>
        </div>

        {limiteAlcanzado && <Alerta tipo="error" mensaje="Has alcanzado el límite de 3 postulaciones. No puedes enviar más formularios." />}
        {yaPostulado && !limiteAlcanzado && <Alerta tipo="warning" mensaje="Ya te has postulado a este club anteriormente." />}

        {confirmando ? (
          <div>
            <div className="mb-5">
              <p className={`text-base font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                Revisa tus datos antes de confirmar
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {Object.entries(ETIQUETAS).map(([campo, etiqueta]) => {
                const valor = formulario[campo];
                const omitir = campo === 'experiencia_previa' && !valor;
                if (omitir) return null;
                return (
                  <div key={campo} className={resumenCls}>
                    <p className={resumenLabelCls}>{etiqueta}</p>
                    <p className={resumenValCls}>
                      {campo === 'cuatrimestre' ? `${valor}°` : valor || <span className="italic text-slate-400">No especificado</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <Alerta tipo="error" mensaje={errorApi} />

            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${confirmado ? (modoOscuro ? 'border-amber-400/40 bg-amber-400/5' : 'border-amber-400/40 bg-amber-50') : (modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50')}`}>
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400 cursor-pointer"
              />
              <span className={`text-xs leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
                Confirmo que la información proporcionada es correcta y entiendo que el envío de esta postulación no garantiza mi aceptación en el club. También comprendo que proporcionar información falsa o incumplir los requisitos de la convocatoria puede ser motivo de rechazo.
              </span>
            </label>

            <div className="flex gap-3 mt-2">
              <button
                onClick={manejarEnvio}
                disabled={enviando || !confirmado}
                className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                {enviando ? 'Enviando...' : 'Sí, Confirmar y Enviar'}
              </button>
              <button
                onClick={() => { setConfirmando(false); setConfirmado(false); setErrorApi(''); }}
                disabled={enviando}
                className={`px-6 py-3.5 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${modoOscuro ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
              >
                Editar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={manejarConfirmacion} className="space-y-4">
            <CampoTexto
              label="Nombre Completo"
              name="nombre_completo"
              value={formulario.nombre_completo}
              onChange={manejarCambio}
              placeholder="Tu nombre completo"
              readOnly={datosPrecargados}
              required
              error={errores.nombre_completo}
            />

            <CampoTexto
              label="Matrícula"
              name="matricula"
              value={formulario.matricula}
              onChange={manejarCambio}
              placeholder="Ej: 00906641"
              readOnly={datosPrecargados}
              required
              error={errores.matricula}
              maxLength={8}
            />

            <CampoSelect label="Carrera" name="carrera" value={formulario.carrera} onChange={manejarCambio} opciones={CARRERAS} placeholder="Selecciona tu carrera" required error={errores.carrera} />

            <div className="grid grid-cols-2 gap-4">
              <CampoSelect label="Cuatrimestre" name="cuatrimestre" value={formulario.cuatrimestre} onChange={manejarCambio} opciones={['1','2','3','4','5','6','7','8','9']} placeholder="Selecciona" required error={errores.cuatrimestre} />
              <CampoSelect label="Turno" name="turno" value={formulario.turno} onChange={manejarCambio} opciones={TURNOS} placeholder="Selecciona" required error={errores.turno} />
            </div>

            <CampoTexto label="Teléfono de Contacto" name="telefono_contacto" value={formulario.telefono_contacto} onChange={manejarCambio} placeholder="+52 981 123 4567" type="tel" required error={errores.telefono_contacto} maxLength={10} />

            <CampoTexto label="¿Por qué quieres unirte?" name="motivo_ingreso" value={formulario.motivo_ingreso} onChange={manejarCambio} placeholder="Cuéntanos tus motivaciones..." type="textarea" required error={errores.motivo_ingreso} />

            <CampoTexto label="Experiencia Previa" name="experiencia_previa" value={formulario.experiencia_previa} onChange={manejarCambio} placeholder="¿Has participado en algo similar antes?" type="textarea" />

            <Alerta tipo="error" mensaje={errorApi} />

            <button
              type="submit"
              disabled={enviando || bloqueado}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] mt-2"
            >
              Revisar Formulario
            </button>
          </form>
        )}
      </ModalBase>

      {enviado && <ModalExito onClose={onClose} />}
    </>
  );
}
