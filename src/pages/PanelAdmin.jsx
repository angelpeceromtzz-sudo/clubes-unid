import { useAutenticacion } from '../contexts/AuthContext';
import { RutaProtegida } from '../components/RutaProtegida';
import { FormularioNotificacion } from '../components/FormularioNotificacion';
import { usePanelAdmin } from '../hooks/usePanelAdmin';
import { BarraLateralAdmin } from '../components/admin/AdminSidebar';
import { PestanasMovilAdmin } from '../components/admin/AdminMobileTabs';
import { AlertaRetroalimentacion } from '../components/admin/FeedbackAlert';
import { TarjetasEstadisticas } from '../components/admin/StatsCards';
import { BarraBusquedaUsuarios } from '../components/admin/UserSearchBar';
import { TablaUsuarios } from '../components/admin/UserTable';
import { TablaClubes } from '../components/admin/ClubTable';
import { ModalFormularioClub } from '../components/admin/ClubFormModal';
import { TablaHistorial } from '../components/admin/HistorialTable';

export function PanelAdmin({ tema, modoOscuro }) {
  const { usuario } = useAutenticacion();
  const d = usePanelAdmin(usuario, tema, modoOscuro);

  if (d.loading) {
    return (
      <RutaProtegida requiereAdmin>
        <div className="flex justify-center py-32">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
        </div>
      </RutaProtegida>
    );
  }

  return (
    <RutaProtegida requiereAdmin>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <BarraLateralAdmin
          vistaActiva={d.vistaActiva}
          onVistaChange={d.setVistaActiva}
          user={d.user}
          isDark={d.isDark}
          sbBg={d.sbBg}
          sbItemBase={d.sbItemBase}
          sbItemActive={d.sbItemActive}
          sbItemInactive={d.sbItemInactive}
        />

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <PestanasMovilAdmin
            vistaActiva={d.vistaActiva}
            onVistaChange={d.setVistaActiva}
            isDark={d.isDark}
          />

          <div className="mb-6 md:mb-8">
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-black break-words whitespace-normal ${tema.title}`}>Panel de Administración</h1>
            <p className={`text-sm mt-1 ${tema.subtitle}`}>
              Bienvenido, {d.user.nombre_completo}
            </p>
          </div>

          <AlertaRetroalimentacion feedback={d.feedback} errorFeedback={d.errorFeedback} />

          {d.vistaActiva === 'resumen' && (
            <TarjetasEstadisticas
              cardCls={d.cardCls}
              tema={d.tema}
              totalAlumnos={d.totalAlumnos}
              clubesActivos={d.clubesActivos}
              totalInscripciones={d.totalInscripciones}
            />
          )}

          {d.vistaActiva === 'usuarios' && (
            <div>
              <BarraBusquedaUsuarios busqueda={d.busqueda} onChange={d.setBusqueda} isDark={d.isDark} />
              <TablaUsuarios
                usuarios={d.usuarios}
                busqueda={d.busqueda}
                isDark={d.isDark}
                tableBg={d.tableBg}
                thCls={d.thCls}
                tdCls={d.tdCls}
                tdTitle={d.tdTitle}
                selectCls={d.selectCls}
                currentUser={d.user}
                clubesActivosList={d.clubesActivosList}
                asignando={d.asignando}
                onRoleChange={d.handleRoleChange}
                onRemoveFromClub={d.handleRemoveFromClub}
                onAsignarClub={d.handleAsignarClub}
              />
            </div>
          )}

          {d.vistaActiva === 'clubes' && (
            <TablaClubes
              clubes={d.clubes}
              isDark={d.isDark}
              tableBg={d.tableBg}
              thCls={d.thCls}
              tdCls={d.tdCls}
              tdTitle={d.tdTitle}
              selectCls={d.selectCls}
              tema={d.tema}
              onStatusChange={d.handleStatusChange}
              onEditar={d.abrirModalEditar}
              onCrear={d.abrirModalCrear}
            />
          )}

          {d.vistaActiva === 'anuncios' && (
            <div className="max-w-2xl">
              <div className={`${d.cardCls} rounded-2xl p-6`}>
                <h2 className={`text-lg font-black uppercase tracking-wider mb-2 ${tema.title}`}>
                  Crear Anuncio
                </h2>
                <p className={`text-sm mb-6 ${tema.subtitle}`}>
                  Redacta un anuncio y selecciona la audiencia destino.
                </p>
                <FormularioNotificacion
                  tema={tema}
                  modoOscuro={modoOscuro}
                  clubes={d.clubes}
                  onSuccess={() => d.setFeedback('Anuncio publicado correctamente')}
                />
              </div>
            </div>
          )}

          {d.vistaActiva === 'historial' && (
            <TablaHistorial
              historial={d.historial}
              historialLoading={d.historialLoading}
              isDark={d.isDark}
              tableBg={d.tableBg}
              thCls={d.thCls}
              tdCls={d.tdCls}
              tdTitle={d.tdTitle}
              onRefresh={d.cargarHistorial}
            />
          )}

          <ModalFormularioClub
            show={d.showModalCrear}
            editandoClub={d.editandoClub}
            formClub={d.formClub}
            enviando={d.enviando}
            modalError={d.modalError}
            isDark={d.isDark}
            cardCls={d.cardCls}
            inputCls={d.inputCls}
            labelCls={d.labelCls}
            tema={d.tema}
            onClose={d.cerrarModal}
            onSave={d.guardarClub}
            onFormChange={d.handleClubFormChange}
          />
        </main>
      </div>
    </RutaProtegida>
  );
}
