# Phase 1 — Supabase Migration Reconciliation Manifest

Generated from the authoritative live `supabase_migrations.schema_migrations` table on 19 July 2026.

- Project: `MY CCSF` (`lfelzsubrlqwcsnetpov`)
- Recovered versions: **119**
- Exact SQL bytes: **208894**
- Live migration-history mutations: **0**
- Rule: Supabase CLI compares timestamps to reconcile local and remote histories.

The recovered files preserve the exact live statement text. Blank legacy migration names use the local suffix `remote_commit`; the timestamp remains authoritative.

| Version | Live name | Statements | Bytes | Live SQL MD5 |
|---|---|---:|---:|---|
| `20251209185226` | `(blank legacy name)` | 1 | 3690 | `cd20acb9312c4a2b4bc388a167a6a136` |
| `20251209185239` | `(blank legacy name)` | 1 | 649 | `c8c1fbc6c37192bf09123bfa66d5a50d` |
| `20251209185631` | `(blank legacy name)` | 1 | 955 | `89ce4ba4409aff5b6a028ca97ac34580` |
| `20251209191133` | `(blank legacy name)` | 1 | 1080 | `fbf03ae41851fd756a177fa1316df5ff` |
| `20251209191514` | `(blank legacy name)` | 1 | 571 | `9aa1d75ed8484d22d5eb8b58bd979263` |
| `20251209195830` | `(blank legacy name)` | 1 | 1390 | `666a79bb1bc395f5bfbe4c23c4110fa2` |
| `20251210050559` | `(blank legacy name)` | 1 | 1877 | `dea5d947058cc4147f4e2521e96e681c` |
| `20251210051859` | `(blank legacy name)` | 1 | 2504 | `6e0308db922431a31ccadc6fb0644b2b` |
| `20251210052605` | `(blank legacy name)` | 1 | 2284 | `235c2fa1bf95ccf3eb5cbc3cbd1bc737` |
| `20251210054159` | `(blank legacy name)` | 1 | 2424 | `7f3a924b37ca73c9c86cc026fbad7798` |
| `20251210060316` | `(blank legacy name)` | 1 | 1076 | `a141fd5a511558aa1fff012eb0af02a9` |
| `20251210060641` | `(blank legacy name)` | 1 | 1431 | `11b659886b26958ceebaa5576d23beca` |
| `20251210061707` | `(blank legacy name)` | 1 | 1208 | `855e2776ce7c8765b85fc006c1597056` |
| `20251210062302` | `(blank legacy name)` | 1 | 141 | `2a6f5af0e26af4f277ec9b826fff5306` |
| `20251210063952` | `(blank legacy name)` | 1 | 1617 | `7418a78598b357e264afd63dbcf1df7e` |
| `20251210071222` | `(blank legacy name)` | 1 | 1461 | `8be1a878ad078a6081f45fb7084ee361` |
| `20251210160221` | `(blank legacy name)` | 1 | 179 | `e8e66cfdd92537623277d570b6ee30c5` |
| `20251210162956` | `(blank legacy name)` | 1 | 181 | `efd79a5095e48fc4bbf0369b344d0174` |
| `20251211225729` | `(blank legacy name)` | 1 | 1228 | `7be53823183f636a423e58675107a2d0` |
| `20251211232442` | `(blank legacy name)` | 1 | 1038 | `31994f11295abb523c8a8c41f15c0d92` |
| `20251211234101` | `(blank legacy name)` | 1 | 775 | `4c6c01aca5933eeaa70d31a82d228b44` |
| `20251211235406` | `(blank legacy name)` | 1 | 1060 | `d1d130b306b72fea811ede11a3f11330` |
| `20251212080756` | `(blank legacy name)` | 1 | 5478 | `f1d422764432f7d667e2fd1c1136a77e` |
| `20251212081500` | `(blank legacy name)` | 1 | 2140 | `19a9e73e96a33928d1139875f6a88e7c` |
| `20251218062007` | `(blank legacy name)` | 1 | 1340 | `0fe11e549e98441ea9e6197c7e2d4441` |
| `20251218070830` | `(blank legacy name)` | 1 | 4103 | `538cbcbd04db061b580a7653583ca0e9` |
| `20251221142300` | `(blank legacy name)` | 1 | 4683 | `fbb911526f118e7fc1a9f1765e2ce50e` |
| `20260408061105` | `(blank legacy name)` | 1 | 295 | `cd3192d429181d41a6040f55847951a9` |
| `20260409201730` | `(blank legacy name)` | 1 | 624 | `159b96dc5e325a066e2530f0a35a7069` |
| `20260409202451` | `(blank legacy name)` | 1 | 1270 | `4d650586d757c69d149b9949f0ecbb14` |
| `20260410044515` | `(blank legacy name)` | 1 | 1343 | `c950672345f3c157b69c316dc018ba99` |
| `20260717055733` | `create_app_settings_table` | 1 | 221 | `256399b66fa35d2ab57fbb1d65078398` |
| `20260717055742` | `secure_app_settings` | 1 | 565 | `d33342c51c2c4632210145ce72e180b1` |
| `20260717055805` | `create_campus_emergency_contacts` | 1 | 559 | `121892209752aab2f53bdd543fe29425` |
| `20260717055833` | `index_campus_emergency_contacts` | 1 | 312 | `c080c297d503c2bc3911bd7eea4cb79c` |
| `20260717055841` | `enable_rls_campus_emergency_contacts` | 1 | 71 | `23adaa788abaad3426c86b62c127763b` |
| `20260717055852` | `policy_read_campus_emergency_contacts` | 1 | 439 | `28ca905434e8195d757fcb3c98306b05` |
| `20260717055912` | `policy_insert_campus_emergency_contacts` | 1 | 283 | `862cab461342e1c97b0d8033e1959078` |
| `20260717055924` | `policy_update_campus_emergency_contacts` | 1 | 334 | `f4be740c53c41606ff9945da7c44c657` |
| `20260717055936` | `add_incident_submitter_tracking` | 1 | 396 | `e5fa52f0e1e09d285388787e91f54450` |
| `20260717060000` | `drop_open_location_insert_policy` | 1 | 108 | `a4ae5bfafab2b1efb4ffab7199cef3d3` |
| `20260717060009` | `create_authorised_location_insert_policy` | 1 | 480 | `f6c294e888da85d090553f9c9faccde4` |
| `20260717060020` | `drop_open_incident_media_insert_policy` | 1 | 86 | `4e68a44e9a6a001706cde518c07a345e` |
| `20260717060032` | `create_authorised_incident_media_insert_policy` | 1 | 467 | `cc7e7e3a09f74c7839b89b05bf58df8f` |
| `20260717060106` | `create_incident_update_guard_function` | 1 | 1493 | `f85db1c150f7a1c6f18d834a18112193` |
| `20260717060124` | `attach_incident_update_guard` | 1 | 256 | `c7fb46af797c3fb3486f40bfe362d75c` |
| `20260717060134` | `drop_legacy_incident_update_delete_policies` | 1 | 145 | `5da55873c42a75b94dd2058a83d847fe` |
| `20260717060147` | `create_scoped_incident_update_policy` | 1 | 571 | `5f98404351795713c2e42940508ca711` |
| `20260717060202` | `create_super_admin_incident_delete_policy` | 1 | 149 | `921bc1f03119c0297fa37d239762d58a` |
| `20260717060216` | `replace_incident_insert_policy` | 1 | 302 | `edeb2591c43eec4935b412b9985367ef` |
| `20260717060229` | `drop_legacy_incident_storage_policies` | 1 | 251 | `f2aa57797bda0526f8cc92cedd0402b1` |
| `20260717060243` | `create_incident_storage_upload_policy` | 1 | 633 | `c5580a3d5c0143e2b4265dd9ac259471` |
| `20260717060255` | `create_incident_storage_read_policy` | 1 | 626 | `576acedda5744efafe2c2896957b7b65` |
| `20260717060311` | `create_incident_storage_delete_policy` | 1 | 510 | `6d4e2c76ec664255ed3b52d28607a1cc` |
| `20260717060324` | `harden_storage_bucket_limits` | 1 | 494 | `1448db3ba45bbd8531ffe6bcaba1121a` |
| `20260717060334` | `remove_public_bucket_listing_policies` | 1 | 143 | `5f2f4448f5cfe9230fd880b7438e61a0` |
| `20260717060345` | `make_chat_media_private` | 1 | 406 | `84e689d131bd2efa1cd222113db6e3eb` |
| `20260717060358` | `secure_private_chat_media_policies` | 1 | 689 | `ee7c4c6ee33d5f2de2fc0cdc12b19929` |
| `20260717060411` | `add_missing_foreign_key_indexes` | 1 | 1222 | `595fccc93c1019687d929d3cb9b625d3` |
| `20260717060424` | `secure_trigger_function_execution` | 1 | 725 | `08fa22202ed909c0a248c5776eb4f144` |
| `20260717060450` | `restrict_admin_assignment_rpcs` | 1 | 425 | `08bdcbce05b1b3fed270ccc543a73768` |
| `20260717060621` | `restrict_role_helper_functions_from_anonymous` | 1 | 660 | `bbf2b744061eaf57171f1a1d98282802` |
| `20260717060638` | `grant_role_helpers_only_to_authenticated` | 1 | 1393 | `0a227f617c8268a2279b46800411fa6d` |
| `20260717060651` | `add_emergency_contact_delete_policy` | 1 | 278 | `79b8db208335faab4daa30faa986f2a3` |
| `20260717060706` | `set_update_timestamp_triggers_for_new_tables` | 1 | 489 | `822f04e94e562449aa267ecec6b9ff39` |
| `20260717060718` | `restrict_incident_media_delete_to_campus_scope` | 1 | 427 | `8d9b16ef5e2b2a35875c16ea8c3140ce` |
| `20260717060732` | `scope_case_updates_security_visibility` | 1 | 417 | `642c734b9c42c68b0fdb25f94ef32914` |
| `20260717060752` | `scope_case_update_creation` | 1 | 459 | `c5e7dcfc3a055ad35553d89bc449fe78` |
| `20260717061244` | `restore_chat_media_public_delivery_without_listing` | 1 | 143 | `139887af8f5dac5b7b5fc897e178995f` |
| `20260717061343` | `drop_app_settings_manage_policy` | 1 | 84 | `06a2466767b43d0611e71ac47bc785f9` |
| `20260717061352` | `add_app_settings_insert_policy` | 1 | 160 | `e85cdb07b38fb1b4e2dbc3c106df67fa` |
| `20260717061402` | `add_app_settings_update_policy` | 1 | 211 | `cca7a1f68737c102a24919e5d41efadd` |
| `20260717061414` | `add_app_settings_delete_policy` | 1 | 155 | `67ab7409113887b5d7dc0cfd78d5715d` |
| `20260717061428` | `replace_incident_select_policy_with_submitter_access` | 1 | 456 | `791a12920900c41f61b07fc666f7bbeb` |
| `20260717061444` | `drop_legacy_case_update_policy` | 1 | 82 | `5fdfe0ef0ea358ebf228c31b17aa77bd` |
| `20260717061456` | `add_scoped_case_update_policy` | 1 | 643 | `09e3c905a487961af85a5aa821c33f86` |
| `20260717145859` | `phase_1_5_incident_submitter_default` | 1 | 737 | `f4cc6f31070e96984e55611f0df39512` |
| `20260717151522` | `phase_1_5_private_chat_media` | 1 | 1454 | `8af28c4c07a467a0c8df854ed1913f5e` |
| `20260717152319` | `phase_1_5_role_helper_and_admin_rpc_hardening` | 1 | 10596 | `6a76254108ef507ffa6cc5700ca55f20` |
| `20260717152551` | `phase_1_5_private_security_helpers` | 1 | 11730 | `67c8c88deaeea3369d366d08d2e6a53a` |
| `20260717152759` | `phase_1_5_rls_policy_consolidation` | 1 | 11004 | `8e9f23d216655e09fb5486743b48a160` |
| `20260717195452` | `phase_3_pilot_enums_and_tables` | 1 | 14357 | `328ba2e58ecb00c6eccda177754a5188` |
| `20260717195654` | `phase_3_pilot_indexes_and_access_helpers` | 1 | 8039 | `a4dbe8640cb27eebf40f760eadf7cf6f` |
| `20260717195737` | `phase_3_pilot_integrity_triggers` | 1 | 12347 | `af7059a86119f1af4508394d5fd05d88` |
| `20260717195901` | `phase_3_pilot_defaults_and_rls` | 1 | 1503 | `1ea16e395f6f58b3a5b7ff797ae55bcc` |
| `20260717195931` | `phase_3_pilot_restrict_anon_privileges` | 1 | 1362 | `80122d0ba57d5a1949ed43db28542742` |
| `20260717195948` | `phase_3_pilot_authenticated_privileges` | 1 | 2243 | `bbbfaf259ad0a555c607ebda93cdbb1f` |
| `20260717200010` | `phase_3_pilot_rls_programs_participants_sessions` | 1 | 3185 | `efca6cc5f3a17793de6e053901e2c61f` |
| `20260717200033` | `phase_3_pilot_rls_reports_events_storage_metadata` | 1 | 2135 | `ca76948249dcdb71ba191442a04d8ef3` |
| `20260717200049` | `phase_3_pilot_rls_tests_feedback_audit` | 1 | 1714 | `9fabd88c06d91d173a6f80f6b6abdda5` |
| `20260717200124` | `phase_3_pilot_private_attachment_storage` | 1 | 1723 | `955fedc30b8c032955466645e2f8e508` |
| `20260717200247` | `phase_3_pilot_private_schema` | 1 | 179 | `a0e0ae670f001af9c70a5ea3e28c2336` |
| `20260717200310` | `phase_3_pilot_consent_rpc` | 1 | 2324 | `ef8155fe8a2aff4b727bd076a4d11150` |
| `20260717200355` | `phase_3_pilot_report_transition_core` | 1 | 3683 | `bc3cd1f4f1f5582aa975b85ffa88edc7` |
| `20260717200408` | `phase_3_pilot_report_transition_wrapper` | 1 | 851 | `540a3e55a4668420a150a7b4a3a2432b` |
| `20260717200424` | `phase_3_pilot_notes_notifications_core` | 1 | 3009 | `cc18d6d017c7e585752fbfe3e7bd93c0` |
| `20260717200439` | `phase_3_pilot_notes_notifications_wrappers` | 1 | 1705 | `c4a2e84db1ba5b96d1aadde2d43e452e` |
| `20260717200502` | `phase_3_pilot_withdrawal_rpc` | 1 | 2629 | `5e52f21f910f20ecd9d87a168386afb5` |
| `20260717200538` | `phase_3_pilot_report_session_deletion_plans` | 1 | 4623 | `2774e8aa35290a76fbe6e25f61bcbf67` |
| `20260717200644` | `phase_3_pilot_campus_purge_plan` | 1 | 3155 | `0c3cb96d9a5238c8943fe7752595b97e` |
| `20260717200736` | `phase_3_pilot_program_plan_core` | 1 | 1458 | `edd75f6fe312f35e39c23b4c99b7cdf7` |
| `20260717200748` | `phase_3_pilot_program_plan_wrapper` | 1 | 600 | `d4d3f2ccb04ee3a9418140417ba6cbf4` |
| `20260717200804` | `phase_3_pilot_retention_plan` | 1 | 1673 | `519a1a7ee6211c67ead28e7fc757c3d6` |
| `20260717200842` | `phase_3_pilot_export_rpc` | 1 | 4635 | `06145241225816e36f2cd10624602eff` |
| `20260717200901` | `phase_3_pilot_realtime_configuration` | 1 | 1170 | `fa3c192d71344feea271531580fe5095` |
| `20260717201047` | `phase_3_pilot_foreign_key_indexes` | 1 | 1823 | `e520bf306d2fb8a432209f185c0057da` |
| `20260718044546` | `phase_5_pilot_storage_cleanup_guard` | 1 | 666 | `2a9f71d256b1f02fd899cfef0a4c6fad` |
| `20260718044606` | `phase_5_pilot_report_session_finalizers` | 1 | 4305 | `513281fb4398d4f52ad4df94cd820e8b` |
| `20260718044639` | `phase_5_pilot_bulk_finalizers` | 1 | 7929 | `1ebb20345eb6503b0da1866f0b4177cf` |
| `20260718050127` | `phase_5_pilot_staff_message_wrapper` | 1 | 561 | `e894c5fec670358b70b47f38fe2c0d68` |
| `20260718050423` | `phase_5_pilot_session_cleanup_aliases` | 1 | 915 | `86da8dbb60033c4af8bc823116d3a140` |
| `20260718050527` | `phase_5_pilot_entity_cleanup_aliases` | 1 | 905 | `e00918a44960ea877d5d68cb7d1fad97` |
| `20260718050603` | `phase_5_pilot_generic_cleanup_contract` | 1 | 1312 | `0856872ca702e707d995295be7de0c0b` |
| `20260718050810` | `phase_5_pilot_finish_workflow_wrapper` | 1 | 392 | `b61f156f850452698d358ea255084d96` |
| `20260718050920` | `phase_5_pilot_safe_results_wrapper` | 1 | 464 | `ab245e53a68540b073ed6b6903ef6e09` |
| `20260718051044` | `phase_5_pilot_aggregate_export_view` | 1 | 357 | `da48fccdde2e698535f63a9149bcc614` |
| `20260718051342` | `phase_5_pilot_authorized_program_completion` | 1 | 1459 | `c9967b2e2d9a806ad6368ac20280ebc5` |
| `20260718051513` | `phase_5_pilot_authorized_expired_completion` | 1 | 1655 | `6198ad51d66d414b4f10d8c53adbfed2` |
| `20260719090610` | `temporary_brand_asset_transfer_bucket` | 1 | 815 | `2ee9dcadb233206caffd31b6a048a1a3` |

## Verification contract

1. The local timestamp set must equal the remote timestamp set exactly.
2. Each recovered file's SQL must match the recorded byte length and MD5 above.
3. `supabase db push --dry-run` must report no pending production migration.
4. No `migration repair`, replay, reset, or remote history edit is permitted for this reconciliation.
