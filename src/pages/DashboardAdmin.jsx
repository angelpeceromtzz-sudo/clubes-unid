import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { NotificacionForm } from '../components/NotificacionForm';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminMobileTabs } from '../components/admin/AdminMobileTabs';
import { FeedbackAlert } from '../components/admin/FeedbackAlert';
import { StatsCards } from '../components/admin/StatsCards';
import { UserSearchBar } from '../components/admin/UserSearchBar';
import { UserTable } from '../components/admin/UserTable';
import { ClubTable } from '../components/admin/ClubTable';
import { ClubFormModal } from '../components/admin/ClubFormModal';
import { HistorialTable } from '../components/admin/HistorialTable';

export function DashboardAdmin({ tema, modoOscuro }) {
  const { user } = useAuth();
  const d = useAdminDashboard(user, tema, modoOscuro);

  if (d.loading) {
    return (
      <ProtectedRoute requiereAdmin>
        <div className="flex justify-center py-32">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiereAdmin>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar
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
          <AdminMobileTabs
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

          <FeedbackAlert feedback={d.feedback} errorFeedback={d.errorFeedback} />

          {d.vistaActiva === 'resumen' && (
            <StatsCards
              cardCls={d.cardCls}
              tema={d.tema}
              totalAlumnos={d.totalAlumnos}
              clubesActivos={d.clubesActivos}
              totalInscripciones={d.totalInscripciones}
            />
          )}

          {d.vistaActiva === 'usuarios' && (
            <div>
              <UserSearchBar busqueda={d.busqueda} onChange={d.setBusqueda} isDark={d.isDark} />
              <UserTable
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
            <ClubTable
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
                <NotificacionForm
                  tema={tema}
                  modoOscuro={modoOscuro}
                  clubes={d.clubes}
                  onSuccess={() => d.setFeedback('Anuncio publicado correctamente')}
                />
              </div>
            </div>
          )}

          {d.vistaActiva === 'historial' && (
            <HistorialTable
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

          <ClubFormModal
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
    </ProtectedRoute>
  );
}
