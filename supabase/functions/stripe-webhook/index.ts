import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')
    const body = await req.text()

    try {
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
            undefined,
            cryptoProvider
        )

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object
            const amount = paymentIntent.amount / 100 // Convert back to dollars

            // Ideally we get the user ID from metadata attached to the payment intent
            // For this demo, we might need to assume we passed it in metadata in step 1
            const userId = paymentIntent.metadata.user_id

            if (userId) {
                const supabase = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                // 1. Get Wallet
                const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('user_id', userId).single()

                if (wallet) {
                    // 2. Update Balance
                    const newBalance = wallet.balance + amount
                    await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)

                    // 3. Record Transaction
                    await supabase.from('transactions').insert({
                        wallet_id: wallet.id,
                        amount: amount,
                        type: 'deposit',
                        description: 'Stripe Top Up',
                        // stripe_payment_id: paymentIntent.id // if we had this column
                    })
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})
