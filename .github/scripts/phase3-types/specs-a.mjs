const E = (name) => `Database["public"]["Enums"]["${name}"]`;

export default [
  {
    name: 'pilot_attachments',
    fields: [
      ['checksum','string | null'],['created_at','string'],['id','string'],['mime_type','string',1],
      ['original_filename','string | null'],['program_id','string',1],['report_id','string',1],
      ['session_id','string',1],['size_bytes','number',1],['storage_path','string',1],['uploaded_by','string'],
    ],
    relationships: [
      ['pilot_attachments_program_id_fkey','program_id','pilot_programs'],
      ['pilot_attachments_report_id_fkey','report_id','pilot_reports'],
      ['pilot_attachments_session_id_fkey','session_id','pilot_sessions'],
      ['pilot_attachments_uploaded_by_fkey','uploaded_by','profiles'],
    ],
  },
  {
    name: 'pilot_audit_logs',
    fields: [
      ['action','string',1],['actor_campus',`${E('campus_location')} | null`],['actor_id','string',1],
      ['actor_role',E('user_role'),1],['affected_count','number'],['created_at','string'],
      ['entity_id','string | null'],['entity_type','string',1],['id','string'],['metadata','Json'],
      ['program_id','string | null'],['reason','string | null'],
    ],
    relationships: [['pilot_audit_logs_program_id_fkey','program_id','pilot_programs']],
  },
  {
    name: 'pilot_feature_tests',
    fields: [
      ['created_at','string'],['duration_ms','number | null'],['error_code','string | null'],
      ['feature_key','string',1],['id','string'],['metadata','Json'],['outcome',E('pilot_test_outcome'),1],
      ['program_id','string',1],['report_id','string | null'],['session_id','string',1],['user_id','string'],
    ],
    relationships: [
      ['pilot_feature_tests_program_id_fkey','program_id','pilot_programs'],
      ['pilot_feature_tests_report_id_fkey','report_id','pilot_reports'],
      ['pilot_feature_tests_session_id_fkey','session_id','pilot_sessions'],
      ['pilot_feature_tests_user_id_fkey','user_id','profiles'],
    ],
  },
  {
    name: 'pilot_feedback',
    fields: [
      ['clarity_rating','number | null'],['comments','string | null'],['confidence_rating','number | null'],
      ['created_at','string'],['ease_of_use_rating','number | null'],['id','string'],['program_id','string',1],
      ['report_id','string | null'],['session_id','string',1],['updated_at','string'],['user_id','string'],
      ['would_use_in_emergency','boolean | null'],
    ],
    relationships: [
      ['pilot_feedback_program_id_fkey','program_id','pilot_programs'],
      ['pilot_feedback_report_id_fkey','report_id','pilot_reports'],
      ['pilot_feedback_session_id_fkey','session_id','pilot_sessions'],
      ['pilot_feedback_user_id_fkey','user_id','profiles'],
    ],
  },
  {
    name: 'pilot_location_events',
    fields: [
      ['accuracy','number | null'],['altitude','number | null'],['captured_at','string'],['created_at','string'],
      ['heading','number | null'],['id','string'],['latitude','number',1],['longitude','number',1],
      ['program_id','string',1],['report_id','string',1],['session_id','string',1],
      ['source',E('pilot_location_source'),1],['speed','number | null'],['user_id','string',1],
    ],
    relationships: [
      ['pilot_location_events_program_id_fkey','program_id','pilot_programs'],
      ['pilot_location_events_report_id_fkey','report_id','pilot_reports'],
      ['pilot_location_events_session_id_fkey','session_id','pilot_sessions'],
      ['pilot_location_events_user_id_fkey','user_id','profiles'],
    ],
  },
  {
    name: 'pilot_notifications',
    fields: [
      ['created_at','string'],['created_by','string',1],['id','string'],['is_read','boolean'],
      ['message','string',1],['notification_type',E('pilot_notification_type'),1],['program_id','string',1],
      ['read_at','string | null'],['report_id','string | null'],['session_id','string | null'],
      ['title','string',1],['user_id','string',1],
    ],
    relationships: [
      ['pilot_notifications_program_id_fkey','program_id','pilot_programs'],
      ['pilot_notifications_report_id_fkey','report_id','pilot_reports'],
      ['pilot_notifications_session_id_fkey','session_id','pilot_sessions'],
      ['pilot_notifications_user_id_fkey','user_id','profiles'],
    ],
  },
];
