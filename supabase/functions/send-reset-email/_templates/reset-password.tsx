import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ResetPasswordEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  email: string
}

export const ResetPasswordEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  email,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Sodhi password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Img
            src="https://xero-cash-navigator.lovable.app/src/assets/sodhi-logo.svg"
            width="120"
            height="36"
            alt="Sodhi"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>
          Hi there,
        </Text>
        
        <Text style={text}>
          We received a request to reset the password for your Sodhi account ({email}). 
          Click the button below to create a new password:
        </Text>
        
        <Section style={buttonContainer}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            style={button}
          >
            Reset Password
          </Link>
        </Section>
        
        <Text style={text}>
          This link will expire in 24 hours for security reasons.
        </Text>
        
        <Text style={text}>
          If you didn't request this password reset, you can safely ignore this email. 
          Your password will remain unchanged.
        </Text>
        
        <Section style={divider} />
        
        <Text style={footer}>
          If you're having trouble clicking the button, copy and paste the URL below into your web browser:
        </Text>
        
        <Text style={footerLink}>
          {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
        </Text>
        
        <Text style={footer}>
          Best regards,<br />
          The Sodhi Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ResetPasswordEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#f97316',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  minWidth: '200px',
}

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '32px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
}

const footerLink = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
  wordBreak: 'break-all' as const,
  padding: '8px',
  backgroundColor: '#f3f4f6',
  borderRadius: '4px',
}