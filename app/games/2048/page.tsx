import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './2048.module.css';

class Tile {
    r: number;
    c: number;
    value: number;
    mergedThisTurn: boolean;
    id: number;
    isNew: boolean;
    isMerged: boolean;

    constructor(r: number, c: number, value: number, id: number) {
        this.r = r;
        this.c = c;
        this.value = value;
        this.mergedThisTurn = false;
        this.id = id;
        this.isNew = true;
        this.isMerged = false;
    }

    setPosition(r: number, c: number) {
        this.r = r;
        this.c = c;
    }
}

export default function Game2048() {
    const [grid, setGrid] = useState<(Tile | null)[][]>(() => Array(4).fill(null).map(() => Array(4).fill(null)));
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [keepPlaying, setKeepPlaying] = useState(false);
    const [isClient, setIsClient] = useState(false);

    const isAnimatingRef = useRef(false);
    const gridRef = useRef<(Tile | null)[][]>([]);
    const scoreRef = useRef(0);
    const gameOverRef = useRef(false);
    const wonRef = useRef(false);
    const keepPlayingRef = useRef(false);
    
    // Auto-incrementing ID for React keys to handle animations
    const tileIdCounter = useRef(0);
    const particlesRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state with refs for event listeners
    useEffect(() => {
        gridRef.current = grid;
        scoreRef.current = score;
        gameOverRef.current = gameOver;
        wonRef.current = won;
        keepPlayingRef.current = keepPlaying;
    }, [grid, score, gameOver, won, keepPlaying]);

    useEffect(() => {
        setIsClient(true);
        const storedBest = localStorage.getItem('2048-best');
        if (storedBest) {
            setBestScore(parseInt(storedBest));
        }
        createParticles();
        newGame();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                handleMove(e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right');
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const createParticles = () => {
        if (!particlesRef.current) return;
        const container = particlesRef.current;
        container.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = styles.particle;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (10 + Math.random() * 10) + 's';
            container.appendChild(particle);
        }
    };

    const addRandomTile = useCallback((currentGrid: (Tile | null)[][]): {grid: (Tile | null)[][], added: boolean} => {
        const emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (!currentGrid[r][c]) {
                    emptyCells.push({ r, c });
                }
            }
        }
        
        if (emptyCells.length === 0) return { grid: currentGrid, added: false };
        
        const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        
        const newGrid = currentGrid.map(row => [...row]);
        const newTile = new Tile(r, c, value, tileIdCounter.current++);
        newGrid[r][c] = newTile;
        
        // Remove "new" animation state after a short delay
        setTimeout(() => {
            newTile.isNew = false;
            setGrid(g => [...g]);
        }, 200);
        
        return { grid: newGrid, added: true };
    }, []);

    const newGame = useCallback(() => {
        setGameOver(false);
        setWon(false);
        setKeepPlaying(false);
        setScore(0);
        isAnimatingRef.current = false;
        
        let initialGrid = Array(4).fill(null).map(() => Array(4).fill(null));
        let result1 = addRandomTile(initialGrid);
        let result2 = addRandomTile(result1.grid);
        
        setGrid(result2.grid);
    }, [addRandomTile]);

    const handleMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (gameOverRef.current || isAnimatingRef.current) return;
        
        const currentGrid = gridRef.current;
        let moved = false;
        let newScore = scoreRef.current;
        
        const getVector = () => {
            if (direction === 'up') return { x: 0, y: -1 };
            if (direction === 'right') return { x: 1, y: 0 };
            if (direction === 'down') return { x: 0, y: 1 };
            if (direction === 'left') return { x: -1, y: 0 };
            return { x: 0, y: 0 };
        };
        
        const vector = getVector();
        
        const buildTraversals = (vector: {x: number, y: number}) => {
            const traversals = { x: [0, 1, 2, 3], y: [0, 1, 2, 3] };
            if (vector.x === 1) traversals.x = traversals.x.reverse();
            if (vector.y === 1) traversals.y = traversals.y.reverse();
            return traversals;
        };

        const traversals = buildTraversals(vector);
        
        // Deep copy grid to mutate
        const nextGrid: (Tile | null)[][] = currentGrid.map(row => [...row]);
        
        // Reset merged flags
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (nextGrid[r][c]) {
                    nextGrid[r][c]!.mergedThisTurn = false;
                }
            }
        }
        
        const tilesToMerge: {tile: Tile, newValue: number}[] = [];
        
        traversals.x.forEach(c => {
            traversals.y.forEach(r => {
                const tile = nextGrid[r][c];
                if (tile) {
                    let previous;
                    let current = { r: tile.r, c: tile.c };
                    
                    do {
                        previous = { r: current.r, c: current.c };
                        current.r += vector.y;
                        current.c += vector.x;
                    } while (
                        current.r >= 0 && current.r < 4 && current.c >= 0 && current.c < 4 && 
                        !nextGrid[current.r][current.c]
                    );
                    
                    const farthest = previous;
                    const next = current;
                    
                    const nextCell = (next.r >= 0 && next.r < 4 && next.c >= 0 && next.c < 4) 
                        ? nextGrid[next.r][next.c] 
                        : null;
                    
                    if (nextCell && nextCell.value === tile.value && !nextCell.mergedThisTurn) {
                        // Merge!
                        const mergedTile = new Tile(next.r, next.c, tile.value * 2, tileIdCounter.current++);
                        mergedTile.mergedThisTurn = true;
                        mergedTile.isMerged = true;
                        mergedTile.isNew = false;
                        
                        nextGrid[r][c] = null;
                        nextGrid[next.r][next.c] = mergedTile;
                        
                        tilesToMerge.push({tile: mergedTile, newValue: tile.value * 2});
                        newScore += tile.value * 2;
                        moved = true;
                        
                        // Clear the 'merged' animation class shortly after
                        setTimeout(() => {
                            mergedTile.isMerged = false;
                            setGrid(g => [...g]);
                        }, 200);
                        
                    } else {
                        // Move to farthest empty slot if applicable
                        if (farthest.r !== r || farthest.c !== c) {
                            nextGrid[r][c] = null;
                            nextGrid[farthest.r][farthest.c] = tile;
                            tile.setPosition(farthest.r, farthest.c);
                            moved = true;
                        }
                    }
                }
            });
        });
        
        if (moved) {
            isAnimatingRef.current = true;
            setGrid(nextGrid);
            setScore(newScore);
            
            setBestScore(prevBest => {
                const newB = Math.max(prevBest, newScore);
                localStorage.setItem('2048-best', newB.toString());
                return newB;
            });
            
            setTimeout(() => {
                let finalGrid = addRandomTile(nextGrid).grid;
                setGrid(finalGrid);
                isAnimatingRef.current = false;
                
                // Check Win
                let hasWon = false;
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 4; c++) {
                        if (finalGrid[r][c] && finalGrid[r][c]!.value >= 2048) {
                            hasWon = true;
                        }
                    }
                }
                
                if (hasWon && !wonRef.current && !keepPlayingRef.current) {
                    setWon(true);
                }
                
                // Check Game Over
                let gameOver = true;
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 4; c++) {
                        if (!finalGrid[r][c]) {
                            gameOver = false;
                            break;
                        }
                    }
                }
                if (gameOver) {
                    for (let r = 0; r < 4; r++) {
                        for (let c = 0; c < 4; c++) {
                            const val = finalGrid[r][c]!.value;
                            if (c < 3 && finalGrid[r][c + 1] && finalGrid[r][c + 1]!.value === val) gameOver = false;
                            if (r < 3 && finalGrid[r + 1][c] && finalGrid[r + 1][c]!.value === val) gameOver = false;
                        }
                    }
                }
                
                if (gameOver) {
                    setGameOver(true);
                }
            }, 150);
        }
    }, [addRandomTile]);

    // Touch Support
    const touchStartRef = useRef<{x: number, y: number} | null>(null);
    
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (Math.max(absDx, absDy) > 30) {
            if (absDx > absDy) {
                handleMove(dx > 0 ? 'right' : 'left');
            } else {
                handleMove(dy > 0 ? 'down' : 'up');
            }
        }
        touchStartRef.current = null;
    };

    // Calculate flat active tiles array for rendering
    const activeTiles = grid.flat().filter((tile): tile is Tile => tile !== null);

    return (
        <div className={styles.body}>
            <a href="/" className={styles.backToMenuBtn}>
                <span>←</span>
                <span>Menu</span>
            </a>

            <div className={styles.particles} ref={particlesRef}></div>

            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.logo}>2048</h1>
                    <p className={styles.subtitle}>Fusionnez les tuiles pour atteindre 2048!</p>
                </header>

                <div className={styles.scoreContainer}>
                    <div className={styles.scoreBox}>
                        <div className={styles.scoreLabel}>Score</div>
                        <div className={styles.scoreValue}>{score}</div>
                    </div>
                    <div className={styles.scoreBox}>
                        <div className={styles.scoreLabel}>Meilleur</div>
                        <div className={styles.scoreValue}>{isClient ? bestScore : 0}</div>
                    </div>
                </div>

                <div 
                    className={styles.gameWrapper} 
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className={styles.grid}>
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={`cell-${i}`} className={styles.cell}></div>
                        ))}
                    </div>
                    
                    <div className={styles.tilesContainer}>
                        {activeTiles.map((tile) => {
                            // Calculate position based on grid row/col
                            // Assumes max-width: 500px logic
                            // In a real responsive setup, we use %-based translation or calculate rects.
                            // For simplicity, we use % positioning for stable layout across sizes
                            return (
                                <div 
                                    key={tile.id}
                                    className={`${styles.tile} ${tile.isNew ? styles.new : ''} ${tile.isMerged ? styles.merged : ''}`}
                                    data-value={tile.value > 2048 ? 'super' : tile.value}
                                    style={{
                                        transform: `translate(calc(${tile.c * 100}% + ${tile.c * 12}px), calc(${tile.r * 100}% + ${tile.r * 12}px))`,
                                        width: 'calc(25% - 9px)',
                                        height: 'calc(25% - 9px)' 
                                    }}
                                >
                                    {tile.value}
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className={`${styles.gameOverlay} ${gameOver ? styles.active : ''}`}>
                        <div className={styles.overlayTitle}>Game Over!</div>
                        <div className={styles.overlayScore}>Score: <span>{score}</span></div>
                        <button className={styles.btn} onClick={newGame}>🔄 Réessayer</button>
                    </div>

                    <div className={`${styles.gameOverlay} ${won && !keepPlaying ? styles.active : ''}`}>
                        <div className={styles.overlayTitle}>🎉 Victoire!</div>
                        <div className={styles.overlayScore}>Vous avez atteint 2048!</div>
                        <button className={styles.btn} onClick={() => setKeepPlaying(true)}>▶️ Continuer</button>
                        <button className={`${styles.btn} ${styles.secondary}`} onClick={newGame}>🔄 Nouvelle Partie</button>
                    </div>
                </div>

                <div className={styles.controls}>
                    <button className={styles.btn} onClick={newGame}>🔄 Nouvelle Partie</button>
                </div>

                <p className={styles.instructions}>
                    Utilisez les <strong>flèches du clavier</strong> ou <strong>glissez</strong> pour déplacer les tuiles.
                </p>
            </div>
        </div>
    );
}
