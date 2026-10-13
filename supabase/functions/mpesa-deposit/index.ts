import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const BASE = Deno.env.get('DARAJA_ENV') === 'production'
  ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'

async function darajaToken() {
  const auth = btoa(`${Deno.env.get('DARAJA_KEY')}:${Deno.env.get('DARAJA_SECRET')}`)
  const r = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } })
  return (await r.json()).access_token as string
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await admin.auth.getUser(jwt)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { amount, phone } = await req.json()
  const kes = Math.floor(Number(amount))
  if (!/^254(7|1)\d{8}$/.test(String(phone)) || !(kes >= 10 && kes <= 150000))
    return json({ error: 'Invalid phone or amount' }, 400)

  const { data: cfg } = await admin.from('app_config').select('value').eq('key', 'kes_per_point').single()
  const rate = Number(cfg?.value ?? 1)

  const { data: pay, error } = await admin.from('payments').insert({
    user_id: user.id, kind: 'deposit', phone, amount_kes: kes, points: Math.floor(kes / rate),
  }).select().single()
  if (error || !pay) return json({ error: 'Could not create payment' }, 500)
      const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const shortcode = Deno.env.get('DARAJA_SHORTCODE')!
  const password = btoa(shortcode + Deno.env.get('DARAJA_PASSKEY') + ts)

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await darajaToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode, Password: password, Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline', Amount: kes,
      PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
      CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback?s=${Deno.env.get('CALLBACK_SECRET')}`,
      AccountReference: 'NikoKadi', TransactionDesc: 'Kadi points',
    }),
  }).then(r => r.json())

  console.log('STK response', JSON.stringify(res))

  if (res.ResponseCode !== '0') {
    await admin.from('payments').update({ status: 'failed', result_desc: res.errorMessage ?? res.ResponseDescription ?? 'stk failed' }).eq('id', pay.id)
    return json({ error: 'Could not start payment' }, 502)
  }
  await admin.from('payments').update({ checkout_request_id: res.CheckoutRequestID }).eq('id', pay.id)
  return json({ paymentId: pay.id })
})