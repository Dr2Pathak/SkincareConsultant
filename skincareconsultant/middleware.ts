import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** Page routes that require an authenticated Supabase session (cookie-based). */
const PROTECTED_PREFIXES = ["/ingredients", "/product-check", "/routine", "/chat"] as const

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const pathname = request.nextUrl.pathname
  if (!isProtectedPath(pathname)) {
    return response
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (typeof url !== "string" || !url || typeof anonKey !== "string" || !anonKey) {
    return response
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const login = new URL("/login", request.url)
    login.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon\\.svg|apple-icon\\.png|icon-light-32x32\\.png|icon-dark-32x32\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
