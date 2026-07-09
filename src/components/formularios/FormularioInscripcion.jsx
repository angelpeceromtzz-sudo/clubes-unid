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

  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  function validar() {
    const errs = {};
    if (!formulario.nombre_completo.trim()) errs.nombre_completo = 'El nombre es obligatorio';

    if (!usuario?.institutional_id) {
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

  const { tema, modoOscuro } = useTheme();
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5';
  const errorCls = 'text-red-400 text-xs mt-1 font-medium';

  return (
    <>
      <ModalBase show={true} onClose={onClose}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-xl font-black ${tema.title}`}>Formulario de Inscripción</h2>
            <p className={`text-sm mt-0.5 ${tema.subtitle}`}>{club.nombre_club}</p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
          </button>
        </div>

        {limiteAlcanzado && <Alerta tipo="error" mensaje="Has alcanzado el límite de 3 postulaciones. No puedes enviar más formularios." />}

        {yaPostulado && !limiteAlcanzado && <Alerta tipo="warning" mensaje="Ya te has postulado a este club anteriormente." />}

        <form onSubmit={manejarEnvio} className="space-y-4">
          <CampoTexto label="Nombre Completo" name="nombre_completo" value={formulario.nombre_completo} onChange={manejarCambio} placeholder="Tu nombre completo" required error={errores.nombre_completo} />

          {usuario?.institutional_id ? (
            <CampoTexto label="Matrícula" name="matricula" value={formulario.matricula} disabled={true} required error={errores.matricula} />
          ) : (
            <CampoTexto label="Matrícula" name="matricula" value={formulario.matricula} onChange={manejarCambio} placeholder="Ej: 00906641" required error={errores.matricula} />
          )}

          <CampoSelect label="Carrera" name="carrera" value={formulario.carrera} onChange={manejarCambio} opciones={CARRERAS} placeholder="Selecciona tu carrera" required error={errores.carrera} />

          <div className="grid grid-cols-2 gap-4">
            <CampoTexto label="Cuatrimestre" name="cuatrimestre" value={formulario.cuatrimestre} onChange={manejarCambio} type="number" placeholder="Ej: 3" required error={errores.cuatrimestre} />
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
            {enviando ? 'Enviando formulario...' : 'Enviar Formulario'}
          </button>
        </form>
      </ModalBase>

      {enviado && <ModalExito onClose={onClose} />}
    </>
  );
}
