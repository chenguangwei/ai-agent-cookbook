import { NextRequest, NextResponse } from 'next/server'

interface DuplicateHostRouteContext {
  params: Promise<{ path: string[] }>
}

async function redirectToCleanPath(
  request: NextRequest,
  context: DuplicateHostRouteContext
) {
  const { path } = await context.params
  const url = request.nextUrl.clone()
  url.pathname = `/${path.join('/')}`

  return NextResponse.redirect(url, 308)
}

export async function GET(
  request: NextRequest,
  context: DuplicateHostRouteContext
) {
  return redirectToCleanPath(request, context)
}

export async function HEAD(
  request: NextRequest,
  context: DuplicateHostRouteContext
) {
  return redirectToCleanPath(request, context)
}
