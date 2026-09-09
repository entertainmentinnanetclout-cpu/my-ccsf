-- Release hardening for high-volume student onboarding and safety mobility.
-- Semantics are preserved; auth.uid() is hoisted to an initplan so PostgreSQL does not
-- re-evaluate it once per scanned row on the high-traffic policies.

DROP POLICY IF EXISTS "safety_presence_owner_read" ON public.student_safety_presence;
CREATE POLICY "safety_presence_owner_read"
ON public.student_safety_presence
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "safety_sessions_owner_read" ON public.safety_mobility_sessions;
CREATE POLICY "safety_sessions_owner_read"
ON public.safety_mobility_sessions
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::public.user_role)
  OR (
    has_role((SELECT auth.uid()), 'security'::public.user_role)
    AND (status = 'alerted' OR share_scope = 'campus_security')
    AND EXISTS (
      SELECT 1 FROM public.admin_access a
      WHERE a.admin_id = (SELECT auth.uid())
        AND a.campus = safety_mobility_sessions.campus
    )
  )
);

DROP POLICY IF EXISTS "safety_updates_owner_read" ON public.safety_mobility_location_updates;
CREATE POLICY "safety_updates_owner_read"
ON public.safety_mobility_location_updates
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.safety_mobility_sessions s
    WHERE s.id = safety_mobility_location_updates.session_id
      AND (
        has_role((SELECT auth.uid()), 'admin'::public.user_role)
        OR (
          has_role((SELECT auth.uid()), 'security'::public.user_role)
          AND (s.status = 'alerted' OR s.share_scope = 'campus_security')
          AND EXISTS (
            SELECT 1 FROM public.admin_access a
            WHERE a.admin_id = (SELECT auth.uid())
              AND a.campus = s.campus
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "safety_events_owner_read" ON public.safety_mobility_events;
CREATE POLICY "safety_events_owner_read"
ON public.safety_mobility_events
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::public.user_role)
  OR EXISTS (
    SELECT 1 FROM public.safety_mobility_sessions s
    WHERE s.id = safety_mobility_events.session_id
      AND has_role((SELECT auth.uid()), 'security'::public.user_role)
      AND (s.status = 'alerted' OR s.share_scope = 'campus_security')
      AND EXISTS (
        SELECT 1 FROM public.admin_access a
        WHERE a.admin_id = (SELECT auth.uid())
          AND a.campus = s.campus
      )
  )
);

DROP POLICY IF EXISTS "community_profiles_own" ON public.community_profiles;
CREATE POLICY "community_profiles_own"
ON public.community_profiles
FOR ALL TO public
USING (user_id = (SELECT auth.uid()) OR community_is_admin())
WITH CHECK (user_id = (SELECT auth.uid()) OR community_is_admin());

DROP POLICY IF EXISTS "Developers manage user access" ON public.user_access;
CREATE POLICY "Developers manage user access"
ON public.user_access
FOR ALL TO authenticated
USING (is_developer_aal2((SELECT auth.uid())))
WITH CHECK (is_developer_aal2((SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view own access status" ON public.user_access;
CREATE POLICY "Users can view own access status"
ON public.user_access
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR is_developer((SELECT auth.uid())));

-- Trigger functions do not need direct client RPC execution. Keep trigger execution intact
-- while removing the externally callable SECURITY DEFINER surface flagged by the linter.
REVOKE EXECUTE ON FUNCTION public.enforce_ccsf_write_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_ccsf_module_write_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ccsf_runtime_alert_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.community_is_admin() FROM anon;
