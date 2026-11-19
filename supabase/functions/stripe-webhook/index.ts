// Edge Function: stripe-webhook
// Records paid / failed invoices into the `payments` table.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  try {
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const inv = event.data.object as Stripe.Invoice;
      const { data: profile } = await admin
        .from('profiles')
        .select('id, teacher_id')
        .eq('stripe_customer_id', inv.customer as string)
        .single();

      if (profile) {
        const paid = event.type === 'invoice.paid';
        const ts =
          (paid ? inv.status_transitions?.paid_at : inv.created) ?? inv.created;
        const d = new Date(ts * 1000);
        await admin.from('payments').upsert(
          {
            student_id: profile.id,
            teacher_id: profile.teacher_id,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            amount_cents: paid ? inv.amount_paid : inv.amount_due,
            status: paid ? 'paid' : 'failed',
            paid_at: paid ? d.toISOString() : null,
            stripe_invoice_id: inv.id,
          },
          { onConflict: 'student_id,month,year' }
        );
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await admin
        .from('profiles')
        .update({ stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id);
    }
  } catch (e) {
    console.error(e);
    return new Response((e as Error).message, { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
