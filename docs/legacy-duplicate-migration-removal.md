# Legacy Duplicate Migration Removal

Completed: 19 July 2026

Supabase's post-merge branch scan found UUID-named legacy files whose timestamps differed from the already-applied remote versions. Each file below was compared byte-for-byte with the authoritative SQL stored in `supabase_migrations.schema_migrations`.

- Duplicate files removed: **30**
- Exact SQL matches: **30**
- Production migration-history changes: **0**
- Production migration replays: **0**
- Canonical timestamp-matched recovered files retained: **119**

| Removed local path | Authoritative remote version | SQL match |
|---|---|---|
| `supabase/migrations/20251209185227_6e712445-e979-4c06-9fb1-292231d946aa.sql` | `20251209185226` | exact |
| `supabase/migrations/20251209185239_95c44c09-bec7-4fd2-a16d-4ec8dd4daee9.sql` | `20251209185239` | exact |
| `supabase/migrations/20251209185632_d9712fbc-4d30-4a93-b3be-61d8d7829043.sql` | `20251209185631` | exact |
| `supabase/migrations/20251209191133_0e191cdd-f8ee-4546-a09f-3068af68923e.sql` | `20251209191133` | exact |
| `supabase/migrations/20251209195831_2bfcf50d-4bc4-4a6d-9d32-d29ac8dc33d2.sql` | `20251209195830` | exact |
| `supabase/migrations/20251210050559_fd843a34-7ae6-456d-90fc-ab43a102d6f3.sql` | `20251210050559` | exact |
| `supabase/migrations/20251210051859_e0cb331a-8702-43cb-909d-be351e8019bf.sql` | `20251210051859` | exact |
| `supabase/migrations/20251210052605_95af195a-eb57-4e33-9696-05e5a41aae87.sql` | `20251210052605` | exact |
| `supabase/migrations/20251210054200_3b939133-4caf-4498-ae15-45a1936f1b28.sql` | `20251210054159` | exact |
| `supabase/migrations/20251210060316_ec8a3261-5cde-4593-9dca-2b05598cc8b1.sql` | `20251210060316` | exact |
| `supabase/migrations/20251210060642_ec0ce1a2-dc88-43f3-9733-9605e3dc49c9.sql` | `20251210060641` | exact |
| `supabase/migrations/20251210061708_7522a363-7c1f-4589-9969-f5f8c399d25f.sql` | `20251210061707` | exact |
| `supabase/migrations/20251210062302_b9b445e3-d833-4741-aa2e-c14e60e791d5.sql` | `20251210062302` | exact |
| `supabase/migrations/20251210063953_d1aaf52c-4e86-42ad-8926-0500c34179a6.sql` | `20251210063952` | exact |
| `supabase/migrations/20251210071222_fcf65c1a-f8dc-4f00-8e48-607bb2485554.sql` | `20251210071222` | exact |
| `supabase/migrations/20251210160221_9f9002cc-abc8-4896-b53b-fbe9cad46c08.sql` | `20251210160221` | exact |
| `supabase/migrations/20251210162957_4634bc12-821b-4174-bedb-f2ea67bbe123.sql` | `20251210162956` | exact |
| `supabase/migrations/20251211225729_4fafa539-c70a-45a2-a10a-644016610d27.sql` | `20251211225729` | exact |
| `supabase/migrations/20251211232443_fe9ede6b-00a7-47e6-bd04-2ff3041cd927.sql` | `20251211232442` | exact |
| `supabase/migrations/20251211234102_a6a696cc-625d-43f8-a6de-a9466cbbcf70.sql` | `20251211234101` | exact |
| `supabase/migrations/20251211235407_8ac1ac20-76ba-4bef-92b3-678f19aea8df.sql` | `20251211235406` | exact |
| `supabase/migrations/20251212080757_c0e80f15-fd11-4e67-b491-55a49c898ae6.sql` | `20251212080756` | exact |
| `supabase/migrations/20251212081501_e4b183a5-b1d4-44ad-ab56-3214e6c9e4ac.sql` | `20251212081500` | exact |
| `supabase/migrations/20251218062008_f59e825e-a7fc-4103-9bc8-4ee78d08a3dc.sql` | `20251218062007` | exact |
| `supabase/migrations/20251218070830_a1c85211-3a43-463d-a454-ac3e0bf9bcc4.sql` | `20251218070830` | exact |
| `supabase/migrations/20251221142301_158eb0c4-f574-4c0c-a503-730214e8b1b9.sql` | `20251221142300` | exact |
| `supabase/migrations/20260408061106_5d094d90-744a-4902-b06c-b28ef7072f97.sql` | `20260408061105` | exact |
| `supabase/migrations/20260409201731_d487e7a7-dc27-490a-a4b2-2828bfc4e517.sql` | `20260409201730` | exact |
| `supabase/migrations/20260409202453_a1c5bbb1-e839-4f34-b17a-b539ecfd98ba.sql` | `20260409202451` | exact |
| `supabase/migrations/20260410044516_b540a4df-8eb8-424b-833b-0192cf91e742.sql` | `20260410044515` | exact |

These removals prevent Supabase from treating already-applied SQL as new work. The authoritative version-matched files under `supabase/migrations` remain unchanged.
