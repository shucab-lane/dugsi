import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

/**
 * Renders Stripe's Payment Element (Apple Pay / Google Pay / cards / bank).
 * Confirms the subscription's first PaymentIntent using `clientSecret`.
 * After success, future months auto-charge the saved payment method.
 */
export default function PaymentMethodForm({ clientSecret, onSuccess }) {
  if (!pk) {
    return (
      <div className="card bg-amber-50 border-amber-200 text-amber-900 text-sm">
        Stripe isn't configured yet. Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to your <code>.env</code>
        and deploy the <code>create-subscription</code> + <code>stripe-webhook</code> Edge Functions.
      </div>
    );
  }
  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: 'stripe' } }}
    >
      <Inner onSuccess={onSuccess} />
    </Elements>
  );
}

function Inner({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setMsg(null); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setMsg(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    setBusy(false);
    if (error) setMsg(error.message ?? 'Payment failed');
    else if (paymentIntent?.status === 'succeeded') {
      setMsg('Payment method saved. Future months will auto-charge.');
      onSuccess?.();
    } else {
      setMsg(`Status: ${paymentIntent?.status ?? 'unknown'}`);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button className="btn-primary w-full" disabled={!stripe || busy}>
        {busy ? 'Processing…' : 'Save & pay first month'}
      </button>
      {msg && <div className="text-sm text-slate-700">{msg}</div>}
    </form>
  );
}
