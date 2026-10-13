import { createClient } from 'npm:@supabase/supabase-js@2'

const ok = () => new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'ok' }),
  { headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get('s') !== Deno.env.get('CALLBACK_SECRET'))
    return new Response('forbidden', { status: 403 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body = await req.json()
  console.log('callback', JSON.stringify(body))
  const cb = body?.Body?.stkCallback
  if (!cb) return ok()

  const { data: pay } = await admin.from('payments').select('*')
    .eq('checkout_request_id', cb.CheckoutRequestID).maybeSingle()
  if (!pay || pay.status !== 'pending') return ok()   // unknown or already handled

  if (cb.ResultCode === 0) {
    const items = Object.fromEntries((cb.CallbackMetadata?.Item ?? []).map((i: any) => [i.Name, i.Value]))
    if (Number(items.Amount) !== pay.amount_kes) {
      await admin.from('payments').update({ status: 'failed', result_desc: 'amount mismatch', updated_at: new Date() }).eq('id', pay.id)
    } else {
      await admin.from('payments').update({
        status: 'success', mpesa_receipt: items.MpesaReceiptNumber, updated_at: new Date(),
      }).eq('id', pay.id)
      await admin.from('points_ledger').insert({
        user_id: pay.user_id, delta: pay.points, reason: 'deposit', payment_id: pay.id,
      })
    }
  } else {
    await admin.from('payments').update({
      status: cb.ResultCode === 1032 ? 'cancelled' : 'failed',
      result_desc: cb.ResultDesc, updated_at: new Date(),
    }).eq('id', pay.id)
  }
  return ok()
})