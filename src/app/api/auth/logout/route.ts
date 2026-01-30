import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // For JWT-based auth, logout is handled client-side by removing the token
  // This endpoint can be used for logging or cleanup if needed
  return NextResponse.json({ success: true });
}
