import { NextResponse } from 'next/server';
import { updateHighScore } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { id, score } = await request.json();
    if (!id || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    await updateHighScore(id, score);
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
