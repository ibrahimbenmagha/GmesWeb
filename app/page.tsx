import Link from 'next/link';
import { readDb } from '@/lib/db';

export default async function Home() {
  const db = await readDb();

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-16 text-center">
        <h1 className="mb-4 text-6xl font-extrabold tracking-tight">
          <span className="text-gradient">Gaming Hub</span>
        </h1>
        <p className="text-xl text-slate-400">
          Une collection de jeux web classiques revisités.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {db.games.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl glass-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-4xl">{game.icon}</span>
              {game.highScore > 0 && (
                <div className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400">
                  Best: {game.highScore}
                </div>
              )}
            </div>
            
            <h2 className="mb-2 text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {game.title}
            </h2>
            
            <p className="mb-6 flex-grow text-sm leading-relaxed text-slate-400 font-medium">
              {game.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {game.features.map((feature, i) => (
                <span key={i} className="text-[10px] uppercase tracking-wider font-bold text-slate-500 border border-slate-700 rounded px-2 py-0.5">
                  {feature}
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center text-sm font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
              Jouer maintenant <span className="ml-2">→</span>
            </div>
            
            {/* Background Glow Effect */}
            <div className="absolute -right-4 -top-4 -z-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
          </Link>
        ))}
      </div>

      <footer className="mt-24 text-center text-slate-500">
        <p>© 2026 Gaming Hub - Fait avec ❤️</p>
      </footer>
    </div>
  );
}
