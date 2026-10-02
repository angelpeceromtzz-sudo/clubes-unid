import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { ModalExito } from '../../modals/ModalExito';
import { api } from '../../../services/api';
import { useAutenticacion } from '../../../contexts/AuthContext';
import { Icono } from '../../ui/Icono';
import { Alerta } from '../../ui/Alerta';
import { CampoTexto } from '../../ui/CampoTexto';
import { CampoSelect } from '../../ui/CampoSelect';
import { ModalBase } from '../../ui/ModalBase';
import { CARRERAS } from '../../../constants/inscripcion';
import { validarFormularioInscripcion } from '../../../utils/inscripcion';
import { PasoConfirmacionInscripcion } from './PasoConfirmacionInscripcion';

export function FormularioInscripcion({ club, onClose }) {
  const { usuario, clubesPostulados, actualizarClubesPostulados, refrescarInscripcionActiva } = useAutenticacion();
  const [formulario, setFormulario] = useState({
    id_club: club.id_club || club.id,
    nombre_completo: usuario?.nombre_completo || '',
    matricula: usuario?.institutional_id || '',
    carrera: '',
    cuatrimestre: '',

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
    return validarFormularioInscripcion(formulario, datosPrecargados);
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
          <PasoConfirmacionInscripcion
            formulario={formulario}
            errorApi={errorApi}
            confirmado={confirmado}
            setConfirmado={setConfirmado}
            enviando={enviando}
            manejarEnvio={manejarEnvio}
            onEditar={() => { setConfirmando(false); setConfirmado(false); setErrorApi(''); }}
            modoOscuro={modoOscuro}
            tema={tema}
          />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoSelect label="Carrera" name="carrera" value={formulario.carrera} onChange={manejarCambio} opciones={CARRERAS} placeholder="Selecciona tu carrera" required error={errores.carrera} />
              <CampoSelect label="Cuatrimestre" name="cuatrimestre" value={formulario.cuatrimestre} onChange={manejarCambio} opciones={['1','2','3','4','5','6','7','8','9']} placeholder="Selecciona" required error={errores.cuatrimestre} />
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

            <p className={`text-xs text-center ${tema.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              No puedes cancelar tu postulación una vez enviada
            </p>
          </form>
        )}
      </ModalBase>

      {enviado && <ModalExito onClose={onClose} />}
    </>
  );
}
