import { NextResponse } from 'next/server';
import { readDb, updateHighScore } from '@/lib/db';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.games);
}

export async function POST(request: Request) {
  try {
    const { id, score } = await request.json();
    if (!id || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    await updateHighScore(id, score);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
