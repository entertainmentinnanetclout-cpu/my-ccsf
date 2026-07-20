import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { ensurePilotParticipant } from '../_shared/pilot/enrolment.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { enumValue, optionalText, requiredText } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const CAMPUSES = [
  'pretoria_west_main',
  'soshanguve_north',
  'soshanguve_south',
  'mbombela',
  'emalahleni',
  'polokwane',
  'giyani',
  'arts',
  'garankuwa',
  'arcadia',
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCTION_ORIGIN = 'https://my-ccsf.vercel.app';

function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (origin === PRODUCTION_ORIGIN || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') return true;
  return /^https:\/\/my-ccsf(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    if (!originAllowed(req.headers.get('origin'))) {
      throw new PilotHttpError(403, 'Pilot registration is available only through the official My CCSF application.', 'origin_denied');
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      throw new PilotHttpError(500, 'Pilot registration configuration is incomplete.', 'configuration_error');
    }

    const body = await readJson(req);
    const email = requiredText(body.email, 'email', 255).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw new PilotHttpError(400, 'Enter a valid email address.', 'validation_error');
    const password = requiredText(body.password, 'password', 100);
    if (password.length < 8) throw new PilotHttpError(400, 'Password must contain at least 8 characters.', 'validation_error');
    const fullName = requiredText(body.full_name, 'full_name', 100);
    const studentNumber = optionalText(body.student_number, 'student_number', 20);
    const campus = enumValue(body.campus, 'campus', CAMPUSES);

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('cf-connecting-ip')
      ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? 'unknown';
    const [fingerprintHash, emailHash] = await Promise.all([
      sha256(`${forwardedFor}|${userAgent}`),
      sha256(email),
    ]);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: fingerprintCount, error: fingerprintError }, { count: emailCount, error: emailError }] = await Promise.all([
      adminClient.from('pilot_signup_attempts').select('id', { count: 'exact', head: true }).eq('fingerprint_hash', fingerprintHash).gte('created_at', oneHourAgo),
      adminClient.from('pilot_signup_attempts').select('id', { count: 'exact', head: true }).eq('email_hash', emailHash).gte('created_at', oneDayAgo),
    ]);
    if (fingerprintError || emailError) throw fingerprintError ?? emailError;
    if ((fingerprintCount ?? 0) >= 10 || (emailCount ?? 0) >= 3) {
      throw new PilotHttpError(429, 'Too many Pilot registration attempts. Try again later or contact Pilot support.', 'rate_limited');
    }

    const { error: attemptError } = await adminClient.from('pilot_signup_attempts').insert({
      fingerprint_hash: fingerprintHash,
      email_hash: emailHash,
    });
    if (attemptError) throw attemptError;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        student_number: studentNumber ?? '',
        campus,
        role: 'student',
        pilot_signup: true,
      },
    });

    if (createError || !created.user) {
      const duplicate = createError?.message.toLowerCase().includes('already') || createError?.message.toLowerCase().includes('registered');
      if (duplicate) throw new PilotHttpError(409, 'An account with this email already exists. Sign in instead.', 'account_exists');
      throw createError ?? new Error('Pilot account creation returned no user.');
    }

    try {
      const enrolment = await ensurePilotParticipant(adminClient, created.user.id, campus);
      await writePilotAudit(adminClient, {
        programId: enrolment.program.id,
        actorId: created.user.id,
        actorRole: 'student',
        actorCampus: campus,
        action: 'pilot_student_account_created',
        entityType: 'pilot_participant',
        entityId: enrolment.participant.id,
        metadata: { edge_function: 'pilot-student-signup', confirmation_required: false },
      });

      return jsonResponse({ created: true, programme_id: enrolment.program.id }, 201);
    } catch (enrolmentError) {
      await adminClient.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      throw enrolmentError;
    }
  } catch (error) {
    return handleError(error);
  }
});
