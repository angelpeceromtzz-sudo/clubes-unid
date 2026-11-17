import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

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

export default function PaginaReportarProblemas() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  const [form, setForm] = useState({
    tipo: '',
    modulo: '',
    descripcion: '',
    pasos: '',
    captura: null,
    importancia: '',
    correo: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [reporte, setReporte] = useState(null);

  function handleChange(e) {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] || null : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setTimeout(() => {
      const numero = `REP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      setReporte({
        numero,
        fecha: new Date().toLocaleString('es-MX'),
        estado: 'Pendiente',
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
      setEnviando(false);
    }, 600);
  }

  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/50 ${oscuro ? 'bg-[#0e162c] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`;
  const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1 ${oscuro ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Reportar un problema</h1>
          <p className={`mt-2 leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            ¿Encontraste un error o tienes dificultades para utilizar Clubs UNID? Utiliza este formulario para enviarnos los detalles. Tu reporte ayudará a mejorar la plataforma y atender los problemas de manera oportuna.
          </p>
        </div>

        {reporte && (
          <div className={`rounded-2xl border p-5 ${oscuro ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="font-black text-emerald-500">Tu reporte fue enviado correctamente.</p>
            <p className={`mt-2 text-sm ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              El equipo responsable revisará la información y dará seguimiento cuando sea necesario. Guarda tu número de reporte para futuras consultas.
            </p>
            <ul className={`mt-3 text-sm space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              <li><span className="font-bold">Número de reporte:</span> {reporte.numero}</li>
              <li><span className="font-bold">Fecha y hora:</span> {reporte.fecha}</li>
              <li><span className="font-bold">Estado:</span> {reporte.estado}</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Tipo de problema</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls} required>
              <option value="">Selecciona un tipo</option>
              {TIPOS_PROBLEMA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Módulo donde ocurrió</label>
            <input name="modulo" value={form.modulo} onChange={handleChange} className={inputCls} required />
          </div>

          <div>
            <label className={labelCls}>Descripción del problema</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className={inputCls} rows={4} required />
          </div>

          <div>
            <label className={labelCls}>Pasos para reproducirlo</label>
            <textarea name="pasos" value={form.pasos} onChange={handleChange} className={inputCls} rows={3} />
          </div>

          <div>
            <label className={labelCls}>Captura de pantalla (opcional)</label>
            <input type="file" name="captura" accept="image/*" onChange={handleChange} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Nivel de importancia</label>
            <select name="importancia" value={form.importancia} onChange={handleChange} className={inputCls} required>
              <option value="">Selecciona un nivel</option>
              {NIVELES_IMPORTANCIA.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Correo de contacto</label>
            <input type="email" name="correo" value={form.correo} onChange={handleChange} className={inputCls} required />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-amber-400 text-[#0e162c] font-black hover:bg-amber-300 transition disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </form>

        <p className={`text-xs ${oscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          No compartas contraseñas, información bancaria ni datos personales innecesarios en este formulario. Utiliza una descripción clara y agrega una captura de pantalla únicamente cuando sea necesario.
        </p>
      </section>
      <PiePagina />
    </main>
  );
}
