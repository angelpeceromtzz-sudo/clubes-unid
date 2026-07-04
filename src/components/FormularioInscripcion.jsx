import { useState } from 'react';
import { ModalExito } from './ModalExito';
import { api } from '../services/api';
import { useAutenticacion } from '../contexts/AuthContext';
import { Icono } from './ui/Icono';

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

export function FormularioInscripcion({ club, onClose }) {
  const { usuario, clubesPostulados, actualizarClubesPostulados, refrescarInscripcionActiva } = useAutenticacion();
  const [formulario, setFormulario] = useState({
    id_club: club.id_club || club.id,
    nombre_completo: usuario?.nombre_completo || '',
    matricula: '',
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

  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  function validar() {
    const errs = {};
    if (!formulario.nombre_completo.trim()) errs.nombre_completo = 'El nombre es obligatorio';

    if (!formulario.matricula) {
      errs.matricula = 'La matrícula es obligatoria';
    } else if (!/^\d+$/.test(formulario.matricula)) {
      errs.matricula = 'La matrícula debe contener solo números';
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

  async function manejarEnvio(e) {
    e.preventDefault();
    setErrorApi('');
    const errs = validar();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

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
    } finally {
      setEnviando(false);
    }
  }

  const inputCls =
    'w-full bg-[#18223f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all';
  const selectCls = inputCls;
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const errorCls = 'text-red-400 text-xs mt-1 font-medium';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div className="bg-[#0e162c] border border-slate-700/50 rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-white">Formulario de Inscripción</h2>
              <p className="text-sm text-slate-400 mt-0.5">{club.nombre_club}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
            </button>
          </div>

          {limiteAlcanzado && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm font-semibold">
                Has alcanzado el límite de 3 postulaciones. No puedes enviar más formularios.
              </p>
            </div>
          )}

          {yaPostulado && !limiteAlcanzado && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <p className="text-amber-400 text-sm font-semibold">
                Ya te has postulado a este club anteriormente.
              </p>
            </div>
          )}

          <form onSubmit={manejarEnvio} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre Completo <span className="text-red-400">*</span></label>
              <input type="text" name="nombre_completo" value={formulario.nombre_completo} onChange={manejarCambio} placeholder="Tu nombre completo" className={inputCls} />
              {errores.nombre_completo && <p className={errorCls}>{errores.nombre_completo}</p>}
            </div>

            <div>
              <label className={labelCls}>Matrícula <span className="text-red-400">*</span></label>
              <input type="text" name="matricula" inputMode="numeric" maxLength={15} value={formulario.matricula} onChange={manejarCambio} placeholder="Ej: 00906641" className={inputCls} />
              {errores.matricula && <p className={errorCls}>{errores.matricula}</p>}
            </div>

            <div>
              <label className={labelCls}>Carrera <span className="text-red-400">*</span></label>
              <select name="carrera" value={formulario.carrera} onChange={manejarCambio} className={selectCls}>
                <option value="" disabled>Selecciona tu carrera</option>
                {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errores.carrera && <p className={errorCls}>{errores.carrera}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cuatrimestre <span className="text-red-400">*</span></label>
                <input type="number" name="cuatrimestre" value={formulario.cuatrimestre} onChange={manejarCambio} min="1" placeholder="Ej: 3" className={inputCls} />
                {errores.cuatrimestre && <p className={errorCls}>{errores.cuatrimestre}</p>}
              </div>
              <div>
                <label className={labelCls}>Turno <span className="text-red-400">*</span></label>
                <select name="turno" value={formulario.turno} onChange={manejarCambio} className={selectCls}>
                  <option value="" disabled>Selecciona</option>
                  {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errores.turno && <p className={errorCls}>{errores.turno}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Teléfono de Contacto <span className="text-red-400">*</span></label>
              <input type="tel" name="telefono_contacto" inputMode="numeric" maxLength={10} value={formulario.telefono_contacto} onChange={manejarCambio} placeholder="+52 981 123 4567" className={inputCls} />
              {errores.telefono_contacto && <p className={errorCls}>{errores.telefono_contacto}</p>}
            </div>

            <div>
              <label className={labelCls}>¿Por qué quieres unirte? <span className="text-red-400">*</span></label>
              <textarea name="motivo_ingreso" value={formulario.motivo_ingreso} onChange={manejarCambio} rows={3} placeholder="Cuéntanos tus motivaciones..." className={`${inputCls} resize-none`} />
              {errores.motivo_ingreso && <p className={errorCls}>{errores.motivo_ingreso}</p>}
            </div>

            <div>
              <label className={labelCls}>Experiencia Previa</label>
              <textarea name="experiencia_previa" value={formulario.experiencia_previa} onChange={manejarCambio} rows={2} placeholder="¿Has participado en algo similar antes?" className={`${inputCls} resize-none`} />
            </div>

            {errorApi && <p className="text-red-400 text-sm font-medium">{errorApi}</p>}

            <button
              type="submit"
              disabled={enviando || bloqueado}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] mt-2"
            >
              {enviando ? 'Enviando formulario...' : 'Enviar Formulario'}
            </button>
          </form>
        </div>
      </div>

      {enviado && <ModalExito onClose={onClose} />}
    </>
  );
}
