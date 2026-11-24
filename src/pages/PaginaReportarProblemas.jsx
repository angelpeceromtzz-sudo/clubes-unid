import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';
import { crearReporte, subirCapturaReporte } from '../services/reportes';

const TIPOS_PROBLEMA = [
  'Error técnico',
  'Problema de acceso',
  'Información incorrecta',
  'Problema con un club',
  'Problema con una convocatoria',
  'Problema con una inscripción',
  'Problema con una asistencia',
  'Sugerencia de mejora',
  'Otro',
];

const NIVELES_IMPORTANCIA = ['Bajo', 'Medio', 'Alto', 'Crítico'];

function sugerirTipo(texto) {
  const t = String(texto || '').toLowerCase();
  if (!t.trim()) return null;
  if (/(acceso|contrase|password|iniciar sesi|login|no puedo entrar|entrar)/.test(t)) return 'Problema de acceso';
  if (/(convocatoria)/.test(t)) return 'Problema con una convocatoria';
  if (/(inscrib|inscripci)/.test(t)) return 'Problema con una inscripción';
  if (/(asistencia)/.test(t)) return 'Problema con una asistencia';
  if (/(club)/.test(t)) return 'Problema con un club';
  if (/(error|no funciona|bug|fallo|t[eé]cnic)/.test(t)) return 'Error técnico';
  if (/(sugerencia|mejorar|mejora)/.test(t)) return 'Sugerencia de mejora';
  return null;
}

export default function PaginaReportarProblemas() {
  const location = useLocation();
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;
  const logoTo = location.state?.rutaOrigen || '/';

  const [form, setForm] = useState({
    tipo: '',
    modulo: '',
    descripcion: '',
    pasos: '',
    captura: null,
    importancia: '',
    correo: '',
  });
  const [tipoManual, setTipoManual] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reporte, setReporte] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const sugerido = useMemo(() => sugerirTipo(`${form.descripcion}\n${form.pasos}`), [form.descripcion, form.pasos]);

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === 'tipo') setTipoManual(true);
    setForm((prev) => ({
      ...prev,
      [name]: files ? (files[0] || null) : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setErrorMsg('');
  }

  function aplicarSugerencia() {
    if (!sugerido) return;
    setForm((prev) => ({ ...prev, tipo: sugerido }));
    setTipoManual(false);
    setFieldErrors((prev) => ({ ...prev, tipo: '' }));
  }

  function validar() {
    const errs = {};
    if (!form.tipo) errs.tipo = 'Selecciona un tipo de problema.';
    if (!form.modulo.trim()) errs.modulo = 'Indica el módulo donde ocurrió.';
    if (!form.descripcion.trim()) errs.descripcion = 'Describe el problema.';
    if (!form.importancia) errs.importancia = 'Selecciona el nivel de importancia.';
    if (!form.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) errs.correo = 'Ingresa un correo de contacto válido.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    const errs = validar();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEnviando(true);
    try {
      let captura_url = null;
      if (form.captura) {
        const up = await subirCapturaReporte(form.captura);
        captura_url = up?.url || null;
      }
      const res = await crearReporte({
        tipo: form.tipo,
        modulo: form.modulo.trim(),
        descripcion: form.descripcion.trim(),
        pasos: form.pasos.trim() || undefined,
        importancia: form.importancia,
        correo: form.correo.trim(),
        captura_url: captura_url || undefined,
      });
      setReporte({
        numero: res.folio,
        fecha: new Date().toLocaleString('es-MX'),
        estado: res.estado || 'Pendiente',
      });
      setForm({
        tipo: '',
        modulo: '',
        descripcion: '',
        pasos: '',
        captura: null,
        importancia: '',
        correo: '',
      });
      setTipoManual(false);
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400/50 ${oscuro ? 'bg-[#0e162c] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`;
  const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`;
  const helpCls = `text-[11px] mt-1 ${oscuro ? 'text-slate-500' : 'text-slate-400'}`;
  const errCls = 'text-[11px] mt-1 text-red-400';

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
      <BarraGeneral logoTo={logoTo} />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className={`rounded-2xl border p-6 sm:p-8 ${oscuro ? 'bg-[#0e162c]/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500 mb-3">Soporte</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Reportar un problema</h1>
          <p className={`mt-3 leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Cuéntanos qué ocurrió. Entre más claro seas (módulo, pasos y descripción), más rápido podremos ayudarte. Tu reporte se envía al equipo de administración.
          </p>
        </div>

        {errorMsg && (
          <div className={`rounded-2xl border p-4 text-sm ${oscuro ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {errorMsg}
          </div>
        )}

        {reporte && (
          <div className={`rounded-2xl border p-5 sm:p-6 ${oscuro ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="font-black text-emerald-400 text-lg">Reporte enviado correctamente</p>
            <p className={`mt-2 text-sm ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              Guarda tu número de folio para dar seguimiento con el equipo administrativo.
            </p>
            <ul className={`mt-4 text-sm space-y-2 ${oscuro ? 'text-slate-200' : 'text-slate-700'}`}>
              <li><span className="font-bold text-amber-500">Folio:</span> <span className="font-mono">{reporte.numero}</span></li>
              <li><span className="font-bold">Fecha y hora:</span> {reporte.fecha}</li>
              <li><span className="font-bold">Estado:</span> {reporte.estado}</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`rounded-2xl border p-6 sm:p-8 space-y-6 ${oscuro ? 'bg-[#0e162c]/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`} noValidate>
          <div>
            <label className={labelCls} htmlFor="tipo">Tipo de problema</label>
            <select id="tipo" name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
              <option value="">Selecciona un tipo</option>
              {TIPOS_PROBLEMA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {fieldErrors.tipo && <p className={errCls}>{fieldErrors.tipo}</p>}
            {!fieldErrors.tipo && sugerido && form.tipo !== sugerido && (
              <p className={helpCls}>
                Sugerencia según tu descripción: <button type="button" onClick={aplicarSugerencia} className="text-amber-500 font-bold hover:underline">{sugerido}</button>
              </p>
            )}
            {!fieldErrors.tipo && (!sugerido || form.tipo === sugerido) && (
              <p className={helpCls}>Elige la categoría que mejor describa el caso. Si no estás seguro, usa “Otro”.</p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="modulo">Módulo donde ocurrió</label>
            <input id="modulo" name="modulo" value={form.modulo} onChange={handleChange} className={inputCls} placeholder="Ej.: Catálogo de clubes, Inscripciones, Asistencia..." />
            {fieldErrors.modulo && <p className={errCls}>{fieldErrors.modulo}</p>}
            {!fieldErrors.modulo && <p className={helpCls}>Indica la sección o pantalla donde sucedió.</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="descripcion">Descripción del problema</label>
            <textarea id="descripcion" name="descripcion" value={form.descripcion} onChange={handleChange} className={inputCls} rows={4} placeholder="¿Qué pasó? ¿Qué esperabas que ocurriera?" />
            {fieldErrors.descripcion && <p className={errCls}>{fieldErrors.descripcion}</p>}
            {!fieldErrors.descripcion && <p className={helpCls}>Describe el fallo con claridad.</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="pasos">Pasos para reproducirlo (opcional)</label>
            <textarea id="pasos" name="pasos" value={form.pasos} onChange={handleChange} className={inputCls} rows={3} placeholder={'1) ...\n2) ...\n3) ...'} />
            <p className={helpCls}>Lista breve ayuda a resolver más rápido.</p>
          </div>

          <div>
            <label className={labelCls} htmlFor="captura">Captura de pantalla (opcional)</label>
            <input id="captura" type="file" name="captura" accept="image/*" onChange={handleChange} className={inputCls} />
            <p className={helpCls}>Imagen opcional (JPG, PNG, etc.). Se sube de forma segura al enviar.</p>
          </div>

          <div>
            <label className={labelCls} htmlFor="importancia">Nivel de importancia</label>
            <select id="importancia" name="importancia" value={form.importancia} onChange={handleChange} className={inputCls}>
              <option value="">Selecciona un nivel</option>
              {NIVELES_IMPORTANCIA.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {fieldErrors.importancia && <p className={errCls}>{fieldErrors.importancia}</p>}
            {!fieldErrors.importancia && <p className={helpCls}>Bajo: molesto. Medio: afecta uso. Alto: impide una tarea. Crítico: bloquea por completo.</p>}
          </div>

          <div>
            <label className={labelCls} htmlFor="correo">Correo de contacto</label>
            <input id="correo" type="email" name="correo" value={form.correo} onChange={handleChange} className={inputCls} placeholder="tu@correo.com" />
            {fieldErrors.correo && <p className={errCls}>{fieldErrors.correo}</p>}
            {!fieldErrors.correo && <p className={helpCls}>Usaremos este correo solo para dar seguimiento a tu reporte.</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-400 text-[#0e162c] font-black hover:bg-amber-300 transition disabled:opacity-60"
            >
              {enviando ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </div>
        </form>

        <p className={`text-xs leading-relaxed ${oscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          No compartas contraseñas, información bancaria ni datos personales innecesarios. Agrega capturas solo si ayudan a explicar el problema.
        </p>
      </section>
      <PiePagina />
    </main>
  );
}
