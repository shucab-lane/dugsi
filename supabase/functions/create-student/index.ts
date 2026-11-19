// Edge Function: create-student
// Called by the teacher UI. Creates an auth user + student profile pre-linked to the teacher.
// Requires the caller to be a teacher.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'missing auth' }, 401);

  // Identify the caller using their JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'not signed in' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: caller } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!caller || caller.role !== 'teacher') return json({ error: 'forbidden' }, 403);

  const { email, password, full_name } = await req.json().catch(() => ({}));
  if (!email || !password || !full_name) return json({ error: 'email, password, full_name required' }, 400);

  // Create auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createErr || !created.user) return json({ error: createErr?.message ?? 'create failed' }, 400);

  // The on_auth_user_created trigger already inserted a profile row. Force it to student + link teacher.
  const { error: updErr } = await admin
    .from('profiles')
    .update({ role: 'student', full_name, teacher_id: user.id })
    .eq('id', created.user.id);
  if (updErr) return json({ error: updErr.message }, 400);

  return json({ student_id: created.user.id, email }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
