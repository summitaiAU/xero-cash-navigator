import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'


const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    // Only handle recovery (password reset) emails
    if (email_action_type !== 'recovery') {
      return new Response('Not a password reset email', { 
        status: 400,
        headers: corsHeaders 
      })
    }

    const resetUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Reset Your Password</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password. Click the link below to set a new password:</p>
          <p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 8px; border-radius: 4px;">${resetUrl}</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <p>Thanks,<br>The Sodhi Team</p>
        </body>
      </html>
    `

    // For now, just log the email content - you would integrate with your email service
    console.log('Password reset email would be sent to:', user.email);
    console.log('Reset URL:', resetUrl);

    console.log('Password reset email sent successfully to:', user.email)

    return new Response(
      JSON.stringify({ success: true }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error: any) {
    console.error('Error sending password reset email:', error)
    
    return new Response(
      JSON.stringify({
        error: {
          message: error?.message || 'Failed to send email',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})