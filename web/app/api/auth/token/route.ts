import { auth } from '@/lib/auth'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)

// Returns a short-lived HS256 JWT for use as a Bearer token when calling the Fastify API
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await new SignJWT({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)

  return Response.json({ token })
}
