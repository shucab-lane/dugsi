// Edge Function: create-subscription
// Called by a student (or their parent) when saving a payment method for the first time.
// Creates a Stripe Customer + Subscription in "default_incomplete" mode and returns a
// client_secret. The front-end then opens Stripe's Payment Element to confirm the first
// payment (Apple Pay / Google Pay / card). After that, the saved card auto-charges every month.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@16.2.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const priceId = Deno.env.get('STRIPE_MONTHLY_PRICE_ID')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
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

    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, role, full_name, teacher_id, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();
    if (error || !profile) return json({ error: 'profile not found' }, 404);
    if (profile.role !== 'student') return json({ error: 'only students subscribe' }, 403);

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const cust = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile.full_name,
        metadata: { profile_id: profile.id, teacher_id: profile.teacher_id ?? '' },
      });
      customerId = cust.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', profile.id);
    }

    // Re-use an existing incomplete subscription if there is one
    if (profile.stripe_subscription_id) {
      const existing = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
        expand: ['latest_invoice.payment_intent'],
      });
      if (['incomplete', 'active', 'trialing', 'past_due'].includes(existing.status)) {
        const pi = (existing.latest_invoice as Stripe.Invoice)?.payment_intent as
          | Stripe.PaymentIntent
          | undefined;
        return json({
          subscriptionId: existing.id,
          status: existing.status,
          clientSecret: pi?.client_secret ?? null,
        });
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    await admin
      .from('profiles')
      .update({ stripe_subscription_id: subscription.id })
      .eq('id', profile.id);

    const pi = (subscription.latest_invoice as Stripe.Invoice)?.payment_intent as
      | Stripe.PaymentIntent
      | undefined;

    return json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: pi?.client_secret ?? null,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
