import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

export interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  slug: string;
  highScore: number;
  features: string[];
}

export interface Database {
  games: Game[];
}

export async function readDb(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading DB:', error);
    return { games: [] };
  }
}

export async function writeDb(data: Database): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

export async function updateHighScore(gameId: string, score: number): Promise<void> {
  const db = await readDb();
  const game = db.games.find(g => g.id === gameId);
  if (game && score > game.highScore) {
    game.highScore = score;
    await writeDb(db);
  }
}
