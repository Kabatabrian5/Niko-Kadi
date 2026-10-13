import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Coins, Phone, X } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';
import './wallet.css';

type Props = {
  onClose: () => void;
  onBalanceChange?: (points: number) => void;
};

type Status = 'idle' | 'sending' | 'waiting' | 'success' | 'failed';

// Accepts 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX or 2547XXXXXXXX and returns 2547XXXXXXXX.
function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, '');
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

export function WalletModal({ onClose, onBalanceChange }: Props) {
  const [points, setPoints] = useState<number | null>(null);
  const [amount, setAmount] = useState('50');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const stopWatching = useRef<() => void>(() => {});

  const loadBalance = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('points_balance').select('points').maybeSingle();
    const value = data?.points ?? 0;
    setPoints(value);
    onBalanceChange?.(value);
  }, [onBalanceChange]);

  useEffect(() => {
    void loadBalance();
    return () => stopWatching.current();
  }, [loadBalance]);

  // Watch one payment until it succeeds/fails: realtime first, polling as a fallback.
  const watchPayment = (paymentId: string) => {
    const supabase = getSupabaseClient();
    let finished = false;

    const finish = (row: { status: string; result_desc?: string | null }) => {
      if (finished || row.status === 'pending') return;
      finished = true;
      stopWatching.current();
      if (row.status === 'success') {
        setStatus('success');
        setMessage('Payment received. Your Kadi points have been added.');
        void loadBalance();
      } else {
        setStatus('failed');
        setMessage(row.status === 'cancelled' ? 'You cancelled the M-Pesa prompt.' : 'The payment did not go through. Please try again.');
      }
    };

    const channel = supabase
      .channel(`payment-${paymentId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${paymentId}` },
        (payload) => finish(payload.new as { status: string }))
      .subscribe();

    const startedAt = Date.now();
    const timer = window.setInterval(async () => {
      const { data } = await supabase.from('payments').select('status,result_desc').eq('id', paymentId).maybeSingle();
      if (data) finish(data);
      if (!finished && Date.now() - startedAt > 90_000) {
        finished = true;
        stopWatching.current();
        setStatus('failed');
        setMessage('No confirmation yet. If money left your M-Pesa, your points will appear shortly. Reopen this window to check.');
      }
    }, 4000);

    stopWatching.current = () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  };
  
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const kes = Math.floor(Number(amount));
    const normalized = normalizePhone(phone);
    if (!(kes >= 10 && kes <= 150000)) {
      setMessage('Enter an amount from KES 10 to KES 150,000.');
      setStatus('failed');
      return;
    }
    if (!normalized) {
      setMessage('Enter a valid Safaricom number, like 0712345678.');
      setStatus('failed');
      return;
    }

    setStatus('sending');
    setMessage('Starting payment…');
    const { data, error } = await getSupabaseClient().functions.invoke('mpesa-deposit', {
      body: { amount: kes, phone: normalized },
    });

    if (error || !data?.paymentId) {
      setStatus('failed');
      setMessage('Could not start the payment. Please try again.');
      return;
    }
    setStatus('waiting');
    setMessage('Check your phone and enter your M-Pesa PIN to finish.');
    watchPayment(data.paymentId);
  };

  const busy = status === 'sending' || status === 'waiting';

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title"
        onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close wallet"><X size={20} /></button>

        <p className="auth-kicker">Wallet</p>
        <h2 id="wallet-title">Add Kadi points</h2>

        <div className="wallet-balance">
          <Coins size={20} aria-hidden="true" />
          <span>Your balance</span>
          <strong>{points === null ? '…' : points.toLocaleString()} pts</strong>
        </div>

        <form className="wallet-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>Amount (KES)</span>
            <input type="number" inputMode="numeric" min={10} value={amount} disabled={busy}
              onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            <span>M-Pesa number</span>
            <span className="wallet-input-wrap">
              <Phone size={16} aria-hidden="true" />
              <input type="tel" inputMode="tel" placeholder="0712 345 678" value={phone} disabled={busy}
                onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </span>
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {status === 'sending' ? 'Sending…' : status === 'waiting' ? 'Waiting for M-Pesa…' : 'Deposit with M-Pesa'}
          </button>
        </form>

        {message && (
          <p className={`wallet-status wallet-${status}`} role="status">{message}</p>
        )}
      </section>
    </div>
  );
}