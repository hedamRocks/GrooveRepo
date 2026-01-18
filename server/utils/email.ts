import { Resend } from 'resend'

/**
 * Email utility for sending magic links
 * Using Resend - swap for SendGrid, Postmark, etc. as needed
 */

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const config = useRuntimeConfig()
    resendClient = new Resend(config.resendApiKey)
  }
  return resendClient
}

export async function sendMagicLink(email: string, token: string): Promise<void> {
  const config = useRuntimeConfig()
  const magicLinkUrl = `${config.public.baseUrl}/auth/verify?token=${token}`

  const resend = getResendClient()

  try {
    await resend.emails.send({
      from: config.emailFrom,
      to: email,
      subject: 'Sign in to your vinyl collection',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome back</h1>
            </div>

            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin: 0 0 20px;">Click the button below to sign in to your vinyl collection:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLinkUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                  Sign In
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin: 20px 0 0;">This link will expire in 15 minutes.</p>

              <p style="font-size: 14px; color: #666; margin: 10px 0 0;">If you didn't request this email, you can safely ignore it.</p>
            </div>

            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>Sent from your vinyl collection app</p>
            </div>
          </body>
        </html>
      `,
    })

    console.log(`[Email] Magic link sent to ${email}`)
  } catch (error) {
    console.error('[Email] Failed to send magic link:', error)
    throw new Error('Failed to send email')
  }
}
