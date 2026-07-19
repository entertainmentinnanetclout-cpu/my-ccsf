const E = (name) => `Database["public"]["Enums"]["${name}"]`;

export default [
  {
    name: 'pilot_participants',
    fields: [
      ['campus',E('campus_location'),1],['consent_version','string | null'],['consented_at','string | null'],
      ['created_at','string'],['id','string'],['invited_at','string'],['invited_by','string'],
      ['program_id','string',1],['status',E('pilot_participant_status')],['updated_at','string'],
      ['user_id','string',1],['withdrawal_reason','string | null'],['withdrawn_at','string | null'],
    ],
    relationships: [
      ['pilot_participants_invited_by_fkey','invited_by','profiles'],
      ['pilot_participants_program_id_fkey','program_id','pilot_programs'],
      ['pilot_participants_user_id_fkey','user_id','profiles'],
    ],
  },
  {
    name: 'pilot_programs',
    fields: [
      ['archived_at','string | null'],['created_at','string'],['created_by','string'],
      ['description','string | null'],['eligible_campuses',`${E('campus_location')}[]`,1],
      ['ends_at','string | null'],['id','string'],['name','string',1],['retention_days','number'],
      ['starts_at','string | null'],['status',E('pilot_program_status')],['updated_at','string'],
    ],
    relationships: [['pilot_programs_created_by_fkey','created_by','profiles']],
  },
  {
    name: 'pilot_report_events',
    fields: [
      ['actor_id','string',1],['actor_role',E('user_role'),1],['created_at','string'],
      ['event_type',E('pilot_event_type'),1],['from_status',`${E('pilot_report_status')} | null`],
      ['id','string'],['metadata','Json'],['notes','string | null'],['program_id','string',1],
      ['report_id','string',1],['session_id','string',1],['to_status',`${E('pilot_report_status')} | null`],
    ],
    relationships: [
      ['pilot_report_events_program_id_fkey','program_id','pilot_programs'],
      ['pilot_report_events_report_id_fkey','report_id','pilot_reports'],
      ['pilot_report_events_session_id_fkey','session_id','pilot_sessions'],
    ],
  },
  {
    name: 'pilot_reports',
    fields: [
      ['assigned_to','string | null'],['campus',E('campus_location'),1],['category',E('incident_category'),1],
      ['created_at','string'],['deleted_at','string | null'],['description','string',1],['id','string'],
      ['is_anonymous','boolean'],['location_accuracy','number | null'],['location_description','string | null'],
      ['location_lat','number | null'],['location_lng','number | null'],['participant_id','string',1],
      ['program_id','string',1],['reference_number','string'],['scenario_id','string | null'],
      ['session_id','string',1],['simulation_completed_at','string | null'],['status',E('pilot_report_status')],
      ['submitted_at','string'],['submitted_by','string'],['title','string',1],['updated_at','string'],
    ],
    relationships: [
      ['pilot_reports_assigned_to_fkey','assigned_to','profiles'],
      ['pilot_reports_participant_id_fkey','participant_id','pilot_participants'],
      ['pilot_reports_program_id_fkey','program_id','pilot_programs'],
      ['pilot_reports_scenario_id_fkey','scenario_id','pilot_scenarios'],
      ['pilot_reports_session_id_fkey','session_id','pilot_sessions'],
      ['pilot_reports_submitted_by_fkey','submitted_by','profiles'],
    ],
  },
  {
    name: 'pilot_scenarios',
    fields: [
      ['created_at','string'],['created_by','string'],['display_order','number'],
      ['expected_category',`${E('incident_category')} | null`],['id','string'],['instructions','string',1],
      ['is_active','boolean'],['program_id','string',1],['requires_attachment','boolean'],
      ['requires_live_tracking','boolean'],['requires_location','boolean'],['requires_notification','boolean'],
      ['requires_resource_download','boolean'],['scenario_type',E('pilot_scenario_type'),1],
      ['title','string',1],['updated_at','string'],
    ],
    relationships: [
      ['pilot_scenarios_created_by_fkey','created_by','profiles'],
      ['pilot_scenarios_program_id_fkey','program_id','pilot_programs'],
    ],
  },
  {
    name: 'pilot_sessions',
    fields: [
      ['browser_name','string | null'],['browser_version','string | null'],['campus',E('campus_location'),1],
      ['completed_at','string | null'],['created_at','string'],['device_type','string | null'],
      ['expires_at','string'],['id','string'],['last_activity_at','string'],['network_type','string | null'],
      ['operating_system','string | null'],['participant_id','string',1],['program_id','string',1],
      ['started_at','string'],['status',E('pilot_session_status')],['updated_at','string'],['user_id','string'],
      ['viewport_height','number | null'],['viewport_width','number | null'],
    ],
    relationships: [
      ['pilot_sessions_participant_id_fkey','participant_id','pilot_participants'],
      ['pilot_sessions_program_id_fkey','program_id','pilot_programs'],
      ['pilot_sessions_user_id_fkey','user_id','profiles'],
    ],
  },
];
