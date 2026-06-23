import { useState } from 'react';
import { SuccessModal } from './SuccessModal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';


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

export function InscripcionForm({ club, onClose }) {
  const { user, clubesPostulados, setClubesPostulados, refreshInscripcionActiva } = useAuth();
  const [form, setForm] = useState({
    id_club: club.id_club || club.id,
    nombre_completo: user?.nombre_completo || '',
    matricula: '',
    carrera: '',
    cuatrimestre: '',
    turno: '',
    telefono_contacto: '',
    motivo_ingreso: '',
    experiencia_previa: '',
  });
  const idDelClubActual = club.id_club || club.id;
  const yaPostuladoEsteClub = clubesPostulados.includes(idDelClubActual);
  const limiteAlcanzado = clubesPostulados.length >= 3;
  const bloqueado = yaPostuladoEsteClub || limiteAlcanzado;

  const [errors, setErrors] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  function validar() {
    const errs = {};
    if (!form.nombre_completo.trim()) errs.nombre_completo = 'El nombre es obligatorio';

    if (!form.matricula) {
      errs.matricula = 'La matrícula es obligatoria';
    } else if (!/^\d+$/.test(form.matricula)) {
      errs.matricula = 'La matrícula debe contener solo números';
    }

    if (!form.carrera) errs.carrera = 'Selecciona una carrera';
    if (!form.cuatrimestre) {
      errs.cuatrimestre = 'El cuatrimestre es obligatorio';
    } else if (parseInt(form.cuatrimestre) < 1) {
      errs.cuatrimestre = 'El cuatrimestre debe ser mayor a 0';
    }
    if (!form.turno) errs.turno = 'Selecciona un turno';

    if (!form.telefono_contacto) {
      errs.telefono_contacto = 'El teléfono de contacto es obligatorio';
    } else if (!/^\d{10}$/.test(form.telefono_contacto)) {
      errs.telefono_contacto = 'El teléfono debe ser de 10 dígitos numéricos';
    }
    if (!form.motivo_ingreso.trim()) errs.motivo_ingreso = 'Indica por qué quieres unirte';
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'matricula' || name === 'telefono_contacto') {
      if (!/^\d*$/.test(value)) return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validar();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await api.createFormulario({
        ...form,
        cuatrimestre: parseInt(form.cuatrimestre, 10),
      });
      await refreshInscripcionActiva();
      setClubesPostulados((prev) => [...prev, idDelClubActual]);
      setEnviado(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {limiteAlcanzado && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm font-semibold">
                Has alcanzado el límite de 3 postulaciones. No puedes enviar más formularios.
              </p>
            </div>
          )}

          {yaPostuladoEsteClub && !limiteAlcanzado && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <p className="text-amber-400 text-sm font-semibold">
                Ya te has postulado a este club anteriormente.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Nombre Completo <span className="text-red-400">*</span></label>
              <input type="text" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} placeholder="Tu nombre completo" className={inputCls} />
              {errors.nombre_completo && <p className={errorCls}>{errors.nombre_completo}</p>}
            </div>

            <div>
              <label className={labelCls}>Matrícula <span className="text-red-400">*</span></label>
              <input type="text" name="matricula" inputMode="numeric" maxLength={15} value={form.matricula} onChange={handleChange} placeholder="Ej: 00906641" className={inputCls} />
              {errors.matricula && <p className={errorCls}>{errors.matricula}</p>}
            </div>

            <div>
              <label className={labelCls}>Carrera <span className="text-red-400">*</span></label>
              <select name="carrera" value={form.carrera} onChange={handleChange} className={selectCls}>
                <option value="" disabled>Selecciona tu carrera</option>
                {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.carrera && <p className={errorCls}>{errors.carrera}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cuatrimestre <span className="text-red-400">*</span></label>
                <input type="number" name="cuatrimestre" value={form.cuatrimestre} onChange={handleChange} min="1" placeholder="Ej: 3" className={inputCls} />
                {errors.cuatrimestre && <p className={errorCls}>{errors.cuatrimestre}</p>}
              </div>
              <div>
                <label className={labelCls}>Turno <span className="text-red-400">*</span></label>
                <select name="turno" value={form.turno} onChange={handleChange} className={selectCls}>
                  <option value="" disabled>Selecciona</option>
                  {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.turno && <p className={errorCls}>{errors.turno}</p>}
              </div>
            </div>

            <div>
              <label className={labelCls}>Teléfono de Contacto <span className="text-red-400">*</span></label>
              <input type="tel" name="telefono_contacto" inputMode="numeric" maxLength={10} value={form.telefono_contacto} onChange={handleChange} placeholder="+52 981 123 4567" className={inputCls} />
              {errors.telefono_contacto && <p className={errorCls}>{errors.telefono_contacto}</p>}
            </div>

            <div>
              <label className={labelCls}>¿Por qué quieres unirte? <span className="text-red-400">*</span></label>
              <textarea name="motivo_ingreso" value={form.motivo_ingreso} onChange={handleChange} rows={3} placeholder="Cuéntanos tus motivaciones..." className={`${inputCls} resize-none`} />
              {errors.motivo_ingreso && <p className={errorCls}>{errors.motivo_ingreso}</p>}
            </div>

            <div>
              <label className={labelCls}>Experiencia Previa</label>
              <textarea name="experiencia_previa" value={form.experiencia_previa} onChange={handleChange} rows={2} placeholder="¿Has participado en algo similar antes?" className={`${inputCls} resize-none`} />
            </div>

            {apiError && <p className="text-red-400 text-sm font-medium">{apiError}</p>}

            <button
              type="submit"
              disabled={submitting || bloqueado}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] mt-2"
            >
              {submitting ? 'Enviando formulario...' : 'Enviar Formulario'}
            </button>
          </form>
        </div>
      </div>

      {enviado && <SuccessModal onClose={onClose} />}
    </>
  );
}
