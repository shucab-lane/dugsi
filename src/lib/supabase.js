import { createClient } from '@supabase/supabase-js';
import { demoClient, demoCallFunction, demoSignUpStudent } from './demo.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Demo mode runs the whole app against seeded in-browser data (used for the public live demo). */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
export const IS_CONFIGURED = IS_DEMO || Boolean(url && key);

if (!IS_CONFIGURED) {
  // Friendly notice in the dev console; the UI shows its own setup screen.
  // eslint-disable-next-line no-console
  console.warn(
    '[Dugsi] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in, then restart `npm run dev`.'
  );
}

// We still create a client when configured; otherwise export a stub that throws
// on use (so calls fail with a clear message instead of the page crashing).
export const supabase = IS_DEMO
  ? demoClient
  : IS_CONFIGURED
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
        },
      }
    );

/**
 * Sign up a new student WITHOUT touching the current (teacher) session.
 * Uses a separate Supabase client with persistSession:false so the teacher
 * stays signed in. Returns the new auth user.
 *
 * Requires Supabase Auth → "Confirm email" to be OFF (Authentication →
 * Sign in / Providers → Email → uncheck "Confirm email"). Otherwise the
 * student can't sign in until they click a confirmation link.
 */
export async function signUpStudentSideClient({ email, password, full_name, teacher_id }) {
  if (IS_DEMO) return demoSignUpStudent({ email, password, full_name, teacher_id });
  if (!IS_CONFIGURED) throw new Error('Supabase is not configured.');
  const ghost = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await ghost.auth.signUp({
    email,
    password,
    options: { data: { full_name, teacher_id } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup succeeded but no user returned. Is "Confirm email" enabled in Supabase Auth? Turn it off for this prototype.');
  return data.user;
}

/**
 * Send a Supabase Auth password-reset email. The student clicks the link in
 * the email and lands on /reset-password where they pick a new one.
 * Works without any Edge Function — but uses Supabase's email rate limits
 * unless you've configured custom SMTP.
 */
export async function sendPasswordResetEmail(email) {
  if (IS_DEMO) return;
  if (!IS_CONFIGURED) throw new Error('Supabase is not configured.');
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

// Convenience wrapper that calls a Supabase Edge Function and forwards the user's JWT.
export async function callFunction(name, body) {
  if (IS_DEMO) return demoCallFunction(name, body);
  if (!IS_CONFIGURED) throw new Error('Supabase is not configured.');
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? key}`,
      apikey: key,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) throw new Error(parsed.error ?? `Function ${name} failed (${res.status})`);
  return parsed;
}
