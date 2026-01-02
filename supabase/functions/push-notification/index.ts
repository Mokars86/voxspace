import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts"

// Initialize Firebase Admin (using raw REST API for Deno compatibility without complex npm setup)
// We use a service account JSON which should be in secrets
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

const getAccessToken = async () => {
    if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) throw new Error("Missing Firebase Credentials");

    const jwt = await new jose.SignJWT({
        iss: FIREBASE_CLIENT_EMAIL,
        sub: FIREBASE_CLIENT_EMAIL,
        aud: "https://oauth2.googleapis.com/token",
        scope: "https://www.googleapis.com/auth/firebase.messaging"
    })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setExpirationTime("1h")
        .setIssuedAt()
        .sign(await jose.importPKCS8(FIREBASE_PRIVATE_KEY, "RS256"));

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt
        })
    });

    const data = await response.json();
    return data.access_token;
}

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Webhook payload from Database Insert
        const payload = await req.json()
        const { record } = payload

        // record is the new message row
        if (!record || !record.chat_id || !record.sender_id) {
            return new Response("Invalid payload", { status: 400 })
        }

        const chatId = record.chat_id
        const senderId = record.sender_id
        const content = record.content || (record.type === 'image' ? 'Image' : 'New Message')

        // 1. Get Sender Name
        const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', senderId)
            .maybeSingle()

        const senderName = sender?.full_name || 'Someone'

        // 2. Get Recipients (Participants of the chat, excluding sender)
        const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chatId)
            .neq('user_id', senderId)

        if (!participants || participants.length === 0) {
            return new Response("No recipients", { status: 200 })
        }

        const recipientIds = participants.map(p => p.user_id)

        // 3. Get FCM Tokens for recipients
        const { data: profiles } = await supabase
            .from('profiles')
            .select('fcm_token')
            .in('id', recipientIds)
            .not('fcm_token', 'is', null)

        if (!profiles || profiles.length === 0) {
            return new Response("No valid tokens found", { status: 200 })
        }

        const tokens = profiles.map(p => p.fcm_token).filter(t => t)

        if (tokens.length === 0) {
            return new Response("No tokens to send to", { status: 200 })
        }

        // 4. Send Notification via FCM v1 API
        const accessToken = await getAccessToken();

        const promises = tokens.map(token => {
            return fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: {
                            title: senderName,
                            body: content
                        },
                        data: {
                            url: `/chat/${chatId}`,
                            chatId: chatId,
                            type: 'new_message'
                        }
                    }
                })
            })
        })

        await Promise.all(promises)

        return new Response(JSON.stringify({ success: true, count: tokens.length }), { headers: { "Content-Type": "application/json" } })

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }
})
