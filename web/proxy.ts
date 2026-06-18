import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)

export default async function proxy(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  const { pathname } = req.nextUrl

  if (!token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    const role = (payload as { user?: { role?: string } }).user?.role

    if (role === 'user' && pathname.startsWith('/upload')) {
      return NextResponse.redirect(new URL('/chat', req.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/', req.url))
  }
}

export const config = {
  matcher: ['/chat/:path*', '/upload/:path*'],
}

