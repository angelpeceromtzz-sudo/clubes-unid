import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

export default function PaginaTerminosCondiciones() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Términos y Condiciones de Uso de Clubs UNID</h1>
          <p className={`mt-2 text-sm ${oscuro ? 'text-slate-400' : 'text-slate-500'}`}>Última actualización: 30 de octubre de 2026</p>
        </div>

        <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
          Bienvenido a Clubs UNID, una plataforma institucional destinada a facilitar la creación, organización, difusión y participación en clubes universitarios de la Universidad Interamericana para el Desarrollo.
        </p>
        <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
          Al acceder o utilizar la plataforma, el usuario acepta cumplir con los presentes Términos y Condiciones.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-black">1. Uso de la plataforma</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Clubs UNID permite a los usuarios consultar clubes, participar en convocatorias, registrar actividades y consultar información relacionada con la vida estudiantil.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            El uso de la plataforma debe realizarse exclusivamente con fines académicos, institucionales y de participación universitaria.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">2. Usuarios</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La plataforma puede ser utilizada por:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Alumnos.</li>
            <li>Presidentes y responsables de clubes.</li>
            <li>Personal administrativo autorizado.</li>
            <li>Otros usuarios autorizados por la institución.</li>
          </ul>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Cada usuario es responsable de mantener segura su cuenta y de utilizar únicamente sus propias credenciales de acceso.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">3. Creación y administración de clubes</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los usuarios autorizados podrán proponer o administrar clubes conforme a las reglas establecidas por la institución.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La creación de un club no implica su aprobación automática. La institución podrá revisar, aprobar, rechazar, suspender o cancelar cualquier club cuando sea necesario.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La información proporcionada al crear un club debe ser verdadera, clara y estar actualizada.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">4. Convocatorias y cupos</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los responsables de los clubes deberán publicar información correcta sobre sus convocatorias, horarios, actividades y requisitos.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            El cupo máximo de un club deberá seleccionarse entre las opciones permitidas por la plataforma. El responsable no podrá establecer cupos negativos, iguales a cero o superiores al límite autorizado.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La inscripción estará sujeta a la disponibilidad de lugares y a las reglas de cada club.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">5. Conducta de los usuarios</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los usuarios se comprometen a:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Respetar a los demás integrantes de la comunidad universitaria.</li>
            <li>Proporcionar información verídica.</li>
            <li>Utilizar la plataforma de forma responsable.</li>
            <li>No publicar contenido ofensivo, discriminatorio, ilegal o inapropiado.</li>
            <li>No suplantar la identidad de otra persona.</li>
            <li>No intentar acceder a información o funciones no autorizadas.</li>
            <li>No utilizar la plataforma para actividades ajenas a su propósito institucional.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">6. Contenido publicado</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los usuarios son responsables de la información, imágenes y materiales que publiquen en la plataforma.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Clubs UNID podrá ocultar, modificar o retirar contenido que incumpla estos términos, las políticas institucionales o las disposiciones aplicables.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">7. Asistencias y actividades</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los registros de asistencia y participación deberán realizarse de manera honesta y conforme a las funciones autorizadas para cada usuario.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La alteración, falsificación o manipulación de registros podrá generar la suspensión de permisos o la aplicación de medidas institucionales.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">8. Disponibilidad del servicio</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La institución procurará mantener disponible la plataforma; sin embargo, pueden presentarse interrupciones por mantenimiento, actualizaciones, problemas técnicos o causas externas.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            En caso de detectar una falla, el usuario podrá reportarla mediante la sección Reportar Problemas.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">9. Suspensión de cuentas</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La institución podrá restringir temporal o permanentemente el acceso de un usuario cuando:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Incumpla estos términos.</li>
            <li>Utilice indebidamente la plataforma.</li>
            <li>Proporcione información falsa.</li>
            <li>Realice actividades que afecten la seguridad o funcionamiento del sistema.</li>
            <li>Incumpla reglamentos institucionales.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">10. Cambios a estos términos</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Clubs UNID podrá actualizar estos Términos y Condiciones cuando sea necesario. La versión vigente estará disponible dentro de la plataforma e indicará su fecha de actualización.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">11. Contacto</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Para dudas relacionadas con el uso de la plataforma, el usuario puede comunicarse mediante:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Correo: 00906641@red.unid.mx</li>
            <li>Teléfono:+52 981 224 0307</li>
            <li>Institución responsable: Universidad Interamericana para el Desarrollo</li>
          </ul>
        </div>
      </section>
      <PiePagina />
    </main>
  );
}
