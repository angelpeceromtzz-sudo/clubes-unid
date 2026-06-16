// Modal de formulario de inscripción a un club
import { useState } from 'react';
import { SuccessModal } from './SuccessModal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Formulario de inscripción con validación de campos
export function InscripcionForm({ club, onClose }) {
  const { refreshInscripcionActiva } = useAuth();
  const [form, setForm] = useState({ nombre: '', correo: '', carrera: '', telefono: '' });
  const [errors, setErrors] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Valida que todos los campos obligatorios estén completos
  function validar() {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!form.correo.trim()) {
      errs.correo = 'El correo es obligatorio';
    } else if (!form.correo.includes('@')) {
      errs.correo = 'El correo debe contener @';
    }
    if (!form.carrera.trim()) errs.carrera = 'La carrera es obligatoria';
    if (!form.telefono.trim()) errs.telefono = 'El teléfono es obligatorio';
    return errs;
  }

  // Envía la inscripción a la API
  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const errs = validar();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await api.createInscripcion(club.id_club || club.id);
      await refreshInscripcionActiva();
      setEnviado(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = `w-full bg-[#18223f] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
        <div className="bg-[#0e162c] border border-slate-700/50 rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-white">Inscripción a Club</h2>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Nombre Completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Tu nombre completo"
                className={inputCls}
              />
              {errors.nombre && <p className="text-red-400 text-xs mt-1 font-medium">{errors.nombre}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Correo Institucional <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                placeholder="ejemplo@unid.mx"
                className={inputCls}
              />
              {errors.correo && <p className="text-red-400 text-xs mt-1 font-medium">{errors.correo}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Carrera <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.carrera}
                onChange={(e) => setForm({ ...form, carrera: e.target.value })}
                placeholder="Tu carrera universitaria"
                className={inputCls}
              />
              {errors.carrera && <p className="text-red-400 text-xs mt-1 font-medium">{errors.carrera}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Número de Teléfono <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+52 981 123 4567"
                className={inputCls}
              />
              {errors.telefono && <p className="text-red-400 text-xs mt-1 font-medium">{errors.telefono}</p>}
            </div>

            {apiError && (
              <p className="text-red-400 text-sm font-medium">{apiError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] mt-2"
            >
              {submitting ? 'Enviando...' : 'Enviar Inscripción'}
            </button>
          </form>
        </div>
      </div>

      {enviado && <SuccessModal onClose={onClose} />}
    </>
  );
}

// ✦ A
