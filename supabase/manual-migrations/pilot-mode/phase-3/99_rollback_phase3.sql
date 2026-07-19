-- PHASE 3 PILOT BACKEND ROLLBACK
--
-- DESTRUCTIVE: removes every pilot table, record, function, enum, Realtime
-- publication entry and the private pilot attachment bucket.
--
-- Preconditions:
--   1. Create and verify a database backup.
--   2. Export any pilot data that must be retained.
--   3. Delete every object from `pilot-report-attachments`.
--   4. Obtain project-owner approval.
--   5. Begin a transaction and set the confirmation value manually:
--
--      begin;
--      set local app.phase3_rollback_confirm = 'CONFIRM_DROP_PHASE_3_PILOT_MODE';
--      \i 99_rollback_phase3.sql
--
-- Do not add the confirmation SET statement permanently to this file.

DO $$
BEGIN
  IF current_setting('app.phase3_rollback_confirm', true)
       IS DISTINCT FROM 'CONFIRM_DROP_PHASE_3_PILOT_MODE' THEN
    RAISE EXCEPTION 'Phase 3 rollback confirmation is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'pilot-report-attachments'
  ) THEN
    RAISE EXCEPTION 'pilot-report-attachments is not empty; remove objects before rollback';
  END IF;
END
$$;

-- Remove pilot-only Realtime publication entries.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pilot_notifications',
    'pilot_report_events',
    'pilot_reports',
    'pilot_sessions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format(
        'alter publication supabase_realtime drop table public.%I',
        table_name
      );
    END IF;
  END LOOP;
END
$$;

-- Remove private Storage access policies and the empty bucket.
DROP POLICY IF EXISTS pilot_attachment_objects_insert ON storage.objects;
DROP POLICY IF EXISTS pilot_attachment_objects_select ON storage.objects;
DROP POLICY IF EXISTS pilot_attachment_objects_update ON storage.objects;
DROP POLICY IF EXISTS pilot_attachment_objects_delete ON storage.objects;

DELETE FROM storage.buckets
WHERE id = 'pilot-report-attachments';

-- Remove exposed invoker wrappers.
DROP FUNCTION IF EXISTS public.pilot_add_report_note(uuid, text);
DROP FUNCTION IF EXISTS public.pilot_consent_participation(uuid, text);
DROP FUNCTION IF EXISTS public.pilot_create_notification(uuid, public.pilot_notification_type, text, text);
DROP FUNCTION IF EXISTS public.pilot_delete_report(uuid, text);
DROP FUNCTION IF EXISTS public.pilot_delete_session(uuid, text);
DROP FUNCTION IF EXISTS public.pilot_export_data(uuid, public.campus_location, boolean);
DROP FUNCTION IF EXISTS public.pilot_mark_notification_read(uuid);
DROP FUNCTION IF EXISTS public.pilot_purge_campus(uuid, public.campus_location, text);
DROP FUNCTION IF EXISTS public.pilot_purge_expired();
DROP FUNCTION IF EXISTS public.pilot_purge_program(uuid, text);
DROP FUNCTION IF EXISTS public.pilot_transition_report(uuid, public.pilot_report_status, text, uuid);
DROP FUNCTION IF EXISTS public.pilot_withdraw_session(uuid, text);

-- Remove private operational cores.
DROP SCHEMA IF EXISTS pilot_private CASCADE;

-- Remove private access and trigger helpers.
DROP FUNCTION IF EXISTS private.pilot_actor_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_is_security(uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_is_head(uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_user_campus(uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_can_access_campus(uuid, public.campus_location) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_is_active_participant(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_can_access_program(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_owns_session(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_owns_report(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_can_access_report(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_can_manage_report(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS private.pilot_validate_participant() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_validate_session() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_guard_session_update() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_prepare_report() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_after_report_insert() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_validate_location_event() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_validate_attachment() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_validate_feature_test() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_validate_feedback() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_guard_notification_update() CASCADE;
DROP FUNCTION IF EXISTS private.pilot_touch_updated_at() CASCADE;

-- Drop relational objects in reverse dependency order.
DROP TABLE IF EXISTS
  public.pilot_audit_logs,
  public.pilot_feedback,
  public.pilot_feature_tests,
  public.pilot_notifications,
  public.pilot_attachments,
  public.pilot_location_events,
  public.pilot_report_events,
  public.pilot_reports,
  public.pilot_sessions,
  public.pilot_participants,
  public.pilot_scenarios,
  public.pilot_programs
CASCADE;

-- Drop pilot-only enum types.
DROP TYPE IF EXISTS public.pilot_event_type;
DROP TYPE IF EXISTS public.pilot_location_source;
DROP TYPE IF EXISTS public.pilot_notification_type;
DROP TYPE IF EXISTS public.pilot_participant_status;
DROP TYPE IF EXISTS public.pilot_program_status;
DROP TYPE IF EXISTS public.pilot_report_status;
DROP TYPE IF EXISTS public.pilot_scenario_type;
DROP TYPE IF EXISTS public.pilot_session_status;
DROP TYPE IF EXISTS public.pilot_test_outcome;

-- Review the transaction results before issuing COMMIT.
-- ROLLBACK; is the safe default if any unexpected object is affected.