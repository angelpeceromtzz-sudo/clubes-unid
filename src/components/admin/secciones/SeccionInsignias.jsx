import { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api, request } from '../../../services/api';
import { Spinner } from '../../ui/Spinner';
import { Alerta } from '../../ui/Alerta';

export function SeccionInsignias() {
  const { modoOscuro, tema } = useTheme();
  const [insignias, setInsignias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Formulario de creación/edición
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Asignación
  const [asignarId, setAsignarId] = useState(null);
  const [idUsuarioAsignar, setIdUsuarioAsignar] = useState('');
  const [idEdicionAsignar, setIdEdicionAsignar] = useState('');
  const [asignando, setAsignando] = useState(false);

  const borde = modoOscuro ? 'border-slate-700' : 'border-slate-200';
  const entrada = `w-full rounded-xl border px-3 py-2 text-sm ${modoOscuro ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`;

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await request('/insignias');
      setInsignias(Array.isArray(datos) ? datos : []);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las insignias.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const resetForm = () => {
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setImagen('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const body = { nombre, descripcion: descripcion || null, imagen: imagen || null };
      if (editandoId) {
        await request(`/insignias/${editandoId}`, { method: 'PUT', body: JSON.stringify(body) });
        setMensaje('Insignia actualizada.');
      } else {
        await request('/insignias', { method: 'POST', body: JSON.stringify(body) });
        setMensaje('Insignia creada.');
      }
      resetForm();
      await cargar();
    } catch (err) {
      setError(err?.message || 'No se pudo guardar la insignia.');
    } finally {
      setGuardando(false);
    }
  };

  const editar = (ins) => {
    setEditandoId(ins.id_insignia);
    setNombre(ins.nombre || '');
    setDescripcion(ins.descripcion || '');
    setImagen(ins.imagen || '');
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Desactivar esta insignia? Los alumnos que ya la tienen la seguirán viendo.')) return;
    try {
      await request(`/insignias/${id}`, { method: 'DELETE' });
      setMensaje('Insignia desactivada.');
      await cargar();
    } catch (err) {
      setError(err?.message || 'No se pudo desactivar la insignia.');
    }
  };

  const otorgar = async (e) => {
    e.preventDefault();
    if (!asignarId || !idUsuarioAsignar) return;
    setAsignando(true);
    setError('');
    setMensaje('');
    try {
      const res = await request(`/insignias/${asignarId}/otorgar`, {
        method: 'POST',
        body: JSON.stringify({ id_usuario: Number(idUsuarioAsignar), id_edicion: idEdicionAsignar ? Number(idEdicionAsignar) : null }),
      });
      setMensaje(`Insignia otorgada (folio ${res.id_reconocimiento}).`);
      setIdUsuarioAsignar('');
    } catch (err) {
      setError(err?.message || 'No se pudo otorgar la insignia.');
    } finally {
      setAsignando(false);
    }
  };

  const otorgarPorEdicion = async (idInsignia) => {
    const idEdicion = window.prompt('ID de la edición:');
    if (!idEdicion) return;
    const filtro = window.prompt('¿Solo ganadores? (s/n)')?.toLowerCase() === 's';
    try {
      const res = await request(`/insignias/${idInsignia}/otorgar-por-edicion`, {
        method: 'POST',
        body: JSON.stringify({ id_edicion: Number(idEdicion) }),
      });
      setMensaje(`Se otorgaron ${res.otorgadas} de ${res.total_elegibles} insignias.`);
    } catch (err) {
      setError(err?.message || 'No se pudo otorgar por edición.');
    }
  };

  if (cargando) return <Spinner className="py-32" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-black ${tema.title}`}>Insignias</h2>
        <p className={`mt-1 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Catálogo global. Las insignias se otorgan por edición de actividad (asistentes reales) o manualmente.
        </p>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}
      {mensaje && <p role="status" className="text-sm font-semibold text-emerald-500">{mensaje}</p>}

      <form onSubmit={guardar} className={`space-y-4 rounded-2xl border p-5 ${borde}`}>
        <h3 className={`text-lg font-black ${tema.title}`}>{editandoId ? 'Editar insignia' : 'Nueva insignia'}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold sm:col-span-2">
            Nombre (máx. 60)
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={entrada} required maxLength={60} />
          </label>
          <label className="block text-sm font-bold sm:col-span-2">
            Descripción
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={entrada} rows={3} maxLength={500} />
          </label>
          <label className="block text-sm font-bold sm:col-span-2">
            Imagen (nombre de archivo en /images/insignias/)
            <input type="text" value={imagen} onChange={(e) => setImagen(e.target.value)} className={entrada} placeholder="staff.png" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={guardando} className="cursor-pointer rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">
            {guardando ? 'Guardando…' : (editandoId ? 'Guardar cambios' : 'Crear insignia')}
          </button>
          {editandoId && (
            <button type="button" onClick={resetForm} className="text-sm font-bold text-amber-600 underline underline-offset-4 dark:text-amber-400">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {insignias.map((ins) => (
          <div key={ins.id_insignia} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${borde}`}>
            {ins.imagen && (
              <img src={ins.imagen.startsWith('http') ? ins.imagen : (/\.[a-z0-9]+$/i.test(ins.imagen) ? `/images/insignias/${ins.imagen}` : `/images/insignias/${ins.imagen}.png`)} alt="" className="h-12 w-12 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            <div className="min-w-0 flex-1">
              <p className={`font-black ${tema.title}`}>{ins.nombre}</p>
              {ins.descripcion && <p className={`mt-1 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{ins.descripcion}</p>}
              <p className={`mt-1 text-xs ${ins.activa ? 'text-emerald-500' : 'text-red-500'}`}>{ins.activa ? 'Activa' : 'Inactiva'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => editar(ins)} className="cursor-pointer rounded-lg bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-400/25 dark:text-amber-300">Editar</button>
              <button type="button" onClick={() => { setAsignarId(ins.id_insignia); setIdUsuarioAsignar(''); setIdEdicionAsignar(''); }} className="cursor-pointer rounded-lg bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-400/25 dark:text-amber-300">Otorgar</button>
              <button type="button" onClick={() => otorgarPorEdicion(ins.id_insignia)} className="cursor-pointer rounded-lg bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-400/25 dark:text-amber-300">Por edición</button>
              <button type="button" onClick={() => eliminar(ins.id_insignia)} className="cursor-pointer rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-500/25 dark:text-red-400">Desactivar</button>
            </div>
          </div>
        ))}
        {insignias.length === 0 && <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>No hay insignias en el catálogo.</p>}
      </div>

      {asignarId && (
        <form onSubmit={otorgar} className={`space-y-4 rounded-2xl border p-5 ${borde}`}>
          <h3 className={`text-lg font-black ${tema.title}`}>Otorgar insignia (individual)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              ID de usuario
              <input type="number" value={idUsuarioAsignar} onChange={(e) => setIdUsuarioAsignar(e.target.value)} className={entrada} required />
            </label>
            <label className="block text-sm font-bold">
              ID de edición (opcional)
              <input type="number" value={idEdicionAsignar} onChange={(e) => setIdEdicionAsignar(e.target.value)} className={entrada} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={asignando} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">
              {asignando ? 'Otorgando…' : 'Otorgar'}
            </button>
            <button type="button" onClick={() => setAsignarId(null)} className="text-sm font-bold text-amber-600 underline underline-offset-4 dark:text-amber-400">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
