-- Auditoría de solo lectura para RLS y privilegios directos en public.
-- No lee filas de negocio ni muestra expresiones de políticas.
WITH tablas AS (
  SELECT
    c.oid,
    c.relname,
    c.relrowsecurity AS rls,
    c.relforcerowsecurity AS rls_forzado,
    COALESCE(anon.oid IS NOT NULL AND (
      has_table_privilege(anon.oid, c.oid, 'SELECT') OR
      has_table_privilege(anon.oid, c.oid, 'INSERT') OR
      has_table_privilege(anon.oid, c.oid, 'UPDATE') OR
      has_table_privilege(anon.oid, c.oid, 'DELETE')
    ), FALSE) AS acceso_anon,
    COALESCE(authenticated.oid IS NOT NULL AND (
      has_table_privilege(authenticated.oid, c.oid, 'SELECT') OR
      has_table_privilege(authenticated.oid, c.oid, 'INSERT') OR
      has_table_privilege(authenticated.oid, c.oid, 'UPDATE') OR
      has_table_privilege(authenticated.oid, c.oid, 'DELETE')
    ), FALSE) AS acceso_authenticated,
    COALESCE(p.cantidad, 0) AS politicas
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_roles anon ON anon.rolname = 'anon'
  LEFT JOIN pg_roles authenticated ON authenticated.rolname = 'authenticated'
  LEFT JOIN LATERAL (
    SELECT count(*)::INTEGER AS cantidad
    FROM pg_policy pol
    WHERE pol.polrelid = c.oid
  ) p ON TRUE
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
)
SELECT jsonb_build_object(
  'base', current_database(),
  'tablas_publicas', count(*),
  'rls_habilitado', count(*) FILTER (WHERE rls),
  'rls_forzado', count(*) FILTER (WHERE rls_forzado),
  'politicas_totales', COALESCE(sum(politicas), 0),
  'rls_habilitado_sin_politicas', COALESCE(
    jsonb_agg(relname ORDER BY relname) FILTER (WHERE rls AND politicas = 0),
    '[]'::jsonb
  ),
  'sin_rls_con_acceso_anon', COALESCE(
    jsonb_agg(relname ORDER BY relname) FILTER (WHERE NOT rls AND acceso_anon),
    '[]'::jsonb
  ),
  'sin_rls_con_acceso_authenticated', COALESCE(
    jsonb_agg(relname ORDER BY relname) FILTER (WHERE NOT rls AND acceso_authenticated),
    '[]'::jsonb
  )
) AS auditoria_rls
FROM tablas;
