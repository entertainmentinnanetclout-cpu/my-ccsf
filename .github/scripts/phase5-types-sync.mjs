import fs from 'node:fs';

const path = 'src/integrations/supabase/types.ts';
let source = fs.readFileSync(path, 'utf8');

const viewBlock = `Views: {
      pilot_aggregate_results: {
        Row: {
          campus: Database["public"]["Enums"]["campus_location"] | null
          category: Database["public"]["Enums"]["incident_category"] | null
          program_id: string | null
          report_count: number | null
          status: Database["public"]["Enums"]["pilot_report_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }`;

if (source.includes('Views: {\n      [_ in never]: never\n    }')) {
  source = source.replace('Views: {\n      [_ in never]: never\n    }', viewBlock);
}

const functions = `      pilot_cleanup_plan: {
        Args: { p_entity_id: string; p_kind: string; p_reason: string }
        Returns: Json
      }
      pilot_complete_cleanup: {
        Args: { p_actor_id: string; p_entity_id: string; p_kind: string; p_reason: string }
        Returns: Json
      }
      pilot_complete_entity_cleanup: {
        Args: { p_actor_id: string; p_entity_id: string; p_reason: string }
        Returns: Json
      }
      pilot_complete_session_cleanup: {
        Args: { p_actor_id: string; p_reason: string; p_session_id: string }
        Returns: Json
      }
      pilot_entity_cleanup_plan: { Args: { p_entity_id: string; p_reason: string }; Returns: Json }
      pilot_execute_expired_cleanup: { Args: never; Returns: Json }
      pilot_execute_program_cleanup: {
        Args: { p_program_id: string; p_reason: string }
        Returns: Json
      }
      pilot_finalize_delete_report: {
        Args: { p_actor_id: string; p_reason: string; p_report_id: string }
        Returns: Json
      }
      pilot_finalize_delete_session: {
        Args: { p_actor_id: string; p_reason: string; p_session_id: string }
        Returns: Json
      }
      pilot_finalize_purge_campus: {
        Args: {
          p_actor_id: string
          p_campus: Database["public"]["Enums"]["campus_location"]
          p_program_id: string
          p_reason: string
        }
        Returns: Json
      }
      pilot_finalize_purge_expired: {
        Args: { p_actor_id: string; p_session_ids: string[] }
        Returns: Json
      }
      pilot_finalize_purge_program: {
        Args: { p_actor_id: string; p_program_id: string; p_reason: string }
        Returns: Json
      }
      pilot_finish_workflow: { Args: { p_id: string; p_reason: string }; Returns: Json }
      pilot_safe_results: {
        Args: { p_campus?: Database["public"]["Enums"]["campus_location"]; p_program_id: string }
        Returns: Json
      }
      pilot_session_cleanup_plan: { Args: { p_reason: string; p_session_id: string }; Returns: Json }
      pilot_staff_message: {
        Args: {
          p_content: string
          p_kind: Database["public"]["Enums"]["pilot_notification_type"]
          p_report_id: string
          p_title: string
        }
        Returns: Database["public"]["Tables"]["pilot_notifications"]["Row"]
      }
`;

if (!source.includes('      pilot_execute_program_cleanup: {')) {
  const marker = '      pilot_consent_participation: {';
  if (!source.includes(marker)) throw new Error('Phase 5 function insertion marker not found');
  source = source.replace(marker, functions + marker);
}

for (const expected of ['pilot_aggregate_results', 'pilot_execute_expired_cleanup', 'pilot_execute_program_cleanup', 'pilot_staff_message']) {
  if (!source.includes(expected)) throw new Error(`Missing synchronized Phase 5 type: ${expected}`);
}

fs.writeFileSync(path, source);
console.log('Phase 5 Supabase types synchronized.');
