import { useState, useMemo } from 'react';
import { BotonAccion } from '../ui/BotonAccion';

export function AsignarAlumnoClub({ usuarios, clubesActivos, modoOscuro, onAsignar }) {
  const [idUsuario, setIdUsuario] = useState('');
  const [idClub, setIdClub] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alumnosSinClub = useMemo(
    () => usuarios.filter((u) => u.id_rol === 1 && !u.nombre_club),
    [usuarios]
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!idUsuario || !idClub) return;
    setEnviando(true);
    onAsignar(Number(idUsuario), Number(idClub)).finally(() => {
      setEnviando(false);
      setIdUsuario('');
      setIdClub('');
    });
  }

  const c = {
    bg: modoOscuro ? 'bg-[#0e162c] border-slate-800' : 'bg-white border-slate-200',
    text: modoOscuro ? 'text-slate-300' : 'text-slate-600',
    title: modoOscuro ? 'text-white' : 'text-slate-900',
    input: modoOscuro
      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
    muted: modoOscuro ? 'text-slate-500' : 'text-slate-400',
  };

  return (
    <div className={`rounded-2xl border p-6 md:p-8 ${c.bg}`}>
      <h2 className={`text-xl font-black tracking-tight mb-1 ${c.title}`}>Asignar Alumno a Club</h2>
      <p className={`text-sm mb-6 ${c.text}`}>
        Selecciona un alumno sin club y asígnalo a un club activo.
      </p>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${c.title}`}>
            Alumno
          </label>
          <select
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value)}
            required
            className={`w-full px-3 py-2.5 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50 ${c.input}`}
          >
            <option value="">-- Seleccionar alumno --</option>
            {alumnosSinClub.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>
                {u.nombre_completo} ({u.correo_institucional})
              </option>
            ))}
          </select>
          {alumnosSinClub.length === 0 && (
            <p className={`text-xs mt-1 ${c.muted}`}>Todos los alumnos ya están asignados a un club.</p>
          )}
        </div>

        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${c.title}`}>
            Club
          </label>
          <select
            value={idClub}
            onChange={(e) => setIdClub(e.target.value)}
            required
            className={`w-full px-3 py-2.5 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400/50 ${c.input}`}
          >
            <option value="">-- Seleccionar club --</option>
            {clubesActivos.map((c) => (
              <option key={c.id_club} value={c.id_club}>
                {c.nombre_club} — {c.categoria} (cupo: {c.cupo_actual ?? '?'}/{c.cupo_maximo})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <BotonAccion
            type="submit"
            disabled={enviando || !idUsuario || !idClub}
            variant="primary"
          >
            {enviando ? 'Asignando...' : 'Asignar al Club'}
          </BotonAccion>
        </div>
      </form>
    </div>
  );
}
