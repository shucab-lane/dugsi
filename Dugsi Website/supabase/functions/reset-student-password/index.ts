// Edge Function: reset-student-password
// Called by a teacher to set a new password for one of their students.
// Verifies the caller is a teacher AND that the target user belongs to them.

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

  // Caller must be a teacher.
  const { data: caller } = await admin
    .from('profiles').select('role').eq('id', user.id).single();
  if (!caller || caller.role !== 'teacher') return json({ error: 'forbidden' }, 403);

  const { student_id, new_password } = await req.json().catch(() => ({}));
  if (!student_id || !new_password) return json({ error: 'student_id and new_password required' }, 400);
  if (String(new_password).length < 6) return json({ error: 'password must be at least 6 characters' }, 400);

  // Target must be a student belonging to this teacher.
  const { data: target } = await admin
    .from('profiles').select('role, teacher_id').eq('id', student_id).single();
  if (!target) return json({ error: 'student not found' }, 404);
  if (target.role !== 'student' || target.teacher_id !== user.id) {
    return json({ error: 'this student does not belong to you' }, 403);
  }

  const { error } = await admin.auth.admin.updateUserById(student_id, { password: new_password });
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
