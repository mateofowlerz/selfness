import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BOOKMARKS_USERNAME = process.env.BOOKMARKS_USERNAME;
const BOOKMARKS_PASSWORD = process.env.BOOKMARKS_PASSWORD;

function isAuthorized(request: NextRequest): boolean {
  if (!BOOKMARKS_USERNAME || !BOOKMARKS_PASSWORD) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  const encodedCredentials = authorization.slice("Basic ".length);
  let credentials = "";

  try {
    credentials = Buffer.from(encodedCredentials, "base64").toString("utf-8");
  } catch {
    return false;
  }

  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex === -1) return false;

  const username = credentials.slice(0, separatorIndex);
  const password = credentials.slice(separatorIndex + 1);

  return username === BOOKMARKS_USERNAME && password === BOOKMARKS_PASSWORD;
}

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Bookmarks", charset="UTF-8"',
    },
  });
}

export function proxy(request: NextRequest) {
  if (isAuthorized(request)) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: "/bookmarks/:path*",
};
