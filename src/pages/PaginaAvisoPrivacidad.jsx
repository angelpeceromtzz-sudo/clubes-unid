import { useTheme } from '../contexts/ThemeContext';
import { BarraGeneral } from '../components/layout/barra-navegacion/BarraGeneral';
import { PiePagina } from '../components/layout/PiePagina';

export default function PaginaAvisoPrivacidad() {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <main className={oscuro ? 'bg-[#0b111e] text-white' : 'bg-slate-50 text-slate-900'}>
      <BarraGeneral />
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Aviso de Privacidad de Clubs UNID</h1>
          <p className={`mt-2 text-sm ${oscuro ? 'text-slate-400' : 'text-slate-500'}`}>Última actualización: 30 de octubre de 2026</p>
        </div>

        <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
          La Universidad Interamericana para el Desarrollo, en adelante "UNID", es responsable del tratamiento de los datos personales recopilados a través de la plataforma Clubs UNID.
        </p>

        <div className="space-y-4">
          <h2 className="text-xl font-black">1. Datos que podemos recopilar</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Dependiendo de las funciones utilizadas, la plataforma puede recopilar:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Nombre completo.</li>
            <li>Matrícula o identificador institucional.</li>
            <li>Correo institucional.</li>
            <li>Campus.</li>
            <li>Programa académico o licenciatura.</li>
            <li>Semestre o nivel académico.</li>
            <li>Rol dentro de la plataforma.</li>
            <li>Clubes en los que participa.</li>
            <li>Registros de inscripción y asistencia.</li>
            <li>Información relacionada con actividades y convocatorias.</li>
            <li>Reportes de problemas enviados al sistema.</li>
            <li>Imágenes o archivos adjuntos proporcionados voluntariamente.</li>
          </ul>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La plataforma no deberá solicitar datos personales que no sean necesarios para su funcionamiento.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">2. Finalidades del tratamiento</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los datos personales podrán utilizarse para:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Permitir el acceso a Clubs UNID.</li>
            <li>Identificar a los usuarios.</li>
            <li>Gestionar clubes y convocatorias.</li>
            <li>Registrar inscripciones y asistencias.</li>
            <li>Facilitar la comunicación institucional.</li>
            <li>Generar estadísticas de participación.</li>
            <li>Atender reportes, dudas o problemas técnicos.</li>
            <li>Mantener la seguridad y funcionamiento de la plataforma.</li>
            <li>Cumplir obligaciones institucionales o legales aplicables.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">3. Uso de la información</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los datos serán utilizados únicamente para las finalidades relacionadas con la operación de Clubs UNID y la gestión de actividades universitarias.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            No se deberán utilizar para fines comerciales ni compartirse con terceros no autorizados, salvo que exista una obligación legal o autorización correspondiente.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">4. Acceso a los datos</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            El acceso a la información estará limitado de acuerdo con el rol de cada usuario.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Por ejemplo:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Un alumno podrá consultar su propia información y sus clubes.</li>
            <li>Un responsable podrá consultar información necesaria para administrar su club.</li>
            <li>El personal administrativo autorizado podrá consultar información relacionada con la gestión institucional.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">5. Protección de la información</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            UNID implementará medidas administrativas, técnicas y de seguridad razonables para proteger los datos personales contra pérdida, daño, acceso no autorizado, alteración o uso indebido.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los usuarios también deberán proteger sus credenciales y evitar compartir sus contraseñas.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">6. Conservación de los datos</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Los datos se conservarán durante el tiempo necesario para cumplir con las finalidades descritas, las obligaciones institucionales y los periodos de conservación aplicables.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Cuando ya no sean necesarios, podrán eliminarse, anonimizarse o conservarse únicamente cuando exista una razón institucional o legal para ello.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">7. Derechos del titular</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            El usuario podrá solicitar información sobre el tratamiento de sus datos personales y, cuando corresponda, ejercer sus derechos de acceso, rectificación, cancelación u oposición.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La solicitud deberá enviarse a:
          </p>
          <ul className={`list-disc pl-6 space-y-1 ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <li>Correo de contacto: 00906641@red.unid.mx</li>
            <li>Área responsable: Universidad Interamericana para el Desarrollo</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">8. Cambios al aviso</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Este Aviso de Privacidad podrá actualizarse cuando cambien las funciones de la plataforma, las finalidades del tratamiento o las disposiciones aplicables.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            La versión vigente estará disponible dentro de Clubs UNID.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black">9. Aceptación</h2>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Al utilizar Clubs UNID, el usuario reconoce haber leído el presente Aviso de Privacidad.
          </p>
          <p className={`leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            Si se requiere consentimiento expreso, la plataforma deberá mostrar una casilla como:
          </p>
          <p className={`italic leading-relaxed ${oscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            He leído y acepto el Aviso de Privacidad de Clubs UNID.
          </p>
        </div>
      </section>
      <PiePagina />
    </main>
  );
}
