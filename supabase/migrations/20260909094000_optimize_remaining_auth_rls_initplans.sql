-- Clear the remaining Supabase auth_rls_initplan warnings without changing policy semantics.
-- Only direct auth.uid() calls are rewritten. Existing init-plan-safe SELECT auth.uid()
-- expressions are left untouched so this migration remains idempotent in intent.

DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname,
           c.relname AS tablename,
           p.polname AS policyname,
           pg_get_expr(p.polqual, p.polrelid) AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ~ '(?<!SELECT )auth\.uid\(\)'
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '(?<!SELECT )auth\.uid\(\)'
      )
  LOOP
    new_qual := CASE
      WHEN r.qual IS NULL THEN NULL
      ELSE regexp_replace(r.qual, '(?<!SELECT )auth\.uid\(\)', '(SELECT auth.uid())', 'g')
    END;

    new_check := CASE
      WHEN r.with_check IS NULL THEN NULL
      ELSE regexp_replace(r.with_check, '(?<!SELECT )auth\.uid\(\)', '(SELECT auth.uid())', 'g')
    END;

    stmt := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    IF new_qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;

    IF new_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE stmt;
  END LOOP;
END
$$;
