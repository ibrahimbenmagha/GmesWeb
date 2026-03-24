'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './snake.module.css';

type Point = { x: number; y: number };
type SpeedSetting = 'slow' | 'normal' | 'fast';
type GameMode = 'classic' | 'obstacles';

const GRID_SIZE = 20;
const TILE_COUNT = 20;
const BASE_SPEEDS = { slow: 150, normal: 100, fast: 70 };
const SPECIAL_FOOD_MAX_TIME = 8000;

export default function SnakeGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [bestScore, setBestScore] = useState(0);
    const [speedSetting, setSpeedSetting] = useState<SpeedSetting>('normal');
    const [gameMode, setGameMode] = useState<GameMode>('classic');
    const [gameState, setGameState] = useState<'start' | 'playing' | 'paused' | 'gameOver'>('start');

    // Using refs for game state to avoid closure issues in the game loop
    const snakeRef = useRef<Point[]>([]);
    const directionRef = useRef<Point>({ x: 1, y: 0 });
    const nextDirectionRef = useRef<Point>({ x: 1, y: 0 });
    const foodRef = useRef<Point>({ x: 5, y: 5 });
    const specialFoodRef = useRef<Point | null>(null);
    const specialFoodTimerRef = useRef<number>(0);
    const obstaclesRef = useRef<Point[]>([]);
    const foodCounterRef = useRef<number>(0);
    const loopRef = useRef<NodeJS.Timeout | null>(null);
    const updateRef = useRef<() => void>(() => {});
    const [particles, setParticles] = useState<{id: number, left: string, delay: string, duration: string}[]>([]);

    // Initialize best score from local storage
    useEffect(() => {
        const saved = localStorage.getItem('snake-best');
        if (saved) setBestScore(parseInt(saved));
    }, []);

    const isOccupied = useCallback((x: number, y: number) => {
        if (snakeRef.current.some(s => s.x === x && s.y === y)) return true;
        if (foodRef.current.x === x && foodRef.current.y === y) return true;
        if (specialFoodRef.current && specialFoodRef.current.x === x && specialFoodRef.current.y === y) return true;
        if (obstaclesRef.current.some(o => o.x === x && o.y === y)) return true;
        return false;
    }, []);

    const spawnFood = useCallback(() => {
        let newPos: Point;
        do {
            newPos = {
                x: Math.floor(Math.random() * TILE_COUNT),
                y: Math.floor(Math.random() * TILE_COUNT)
            };
        } while (isOccupied(newPos.x, newPos.y));
        foodRef.current = newPos;

        if (foodCounterRef.current > 0 && foodCounterRef.current % 5 === 0 && !specialFoodRef.current) {
            let specPos: Point;
            do {
                specPos = {
                    x: Math.floor(Math.random() * TILE_COUNT),
                    y: Math.floor(Math.random() * TILE_COUNT)
                };
            } while (isOccupied(specPos.x, specPos.y));
            specialFoodRef.current = specPos;
            specialFoodTimerRef.current = SPECIAL_FOOD_MAX_TIME;
        }
    }, [isOccupied]);

    const generateObstacles = useCallback((currentLevel: number) => {
        const obs: Point[] = [];
        const count = 5 + currentLevel * 2;
        for (let i = 0; i < count; i++) {
            let pos: Point;
            do {
                pos = {
                    x: Math.floor(Math.random() * TILE_COUNT),
                    y: Math.floor(Math.random() * TILE_COUNT)
                };
            } while (isOccupied(pos.x, pos.y));
            obs.push(pos);
        }
        obstaclesRef.current = obs;
    }, [isOccupied]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        for (let i = 0; i <= TILE_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(i * GRID_SIZE, 0);
            ctx.lineTo(i * GRID_SIZE, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * GRID_SIZE);
            ctx.lineTo(canvas.width, i * GRID_SIZE);
            ctx.stroke();
        }

        // Obstacles
        ctx.fillStyle = '#5f27cd';
        obstaclesRef.current.forEach(obs => {
            ctx.fillRect(obs.x * GRID_SIZE + 1, obs.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        });

        // Food
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.arc(foodRef.current.x * GRID_SIZE + GRID_SIZE / 2, foodRef.current.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Special Food
        if (specialFoodRef.current) {
            const pulse = Math.sin(Date.now() / 150) * 3;
            const x = specialFoodRef.current.x * GRID_SIZE;
            const y = specialFoodRef.current.y * GRID_SIZE;
            ctx.shadowBlur = 15 + pulse;
            ctx.shadowColor = '#edc531';
            ctx.fillStyle = '#edc531';
            ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            ctx.fillStyle = '#ff4757';
            ctx.fillRect(x + GRID_SIZE / 2 - 2, y + 2, 4, GRID_SIZE - 4);
            ctx.fillRect(x + 2, y + GRID_SIZE / 2 - 2, GRID_SIZE - 4, 4);
            ctx.shadowBlur = 0;

            const timerWidth = (specialFoodTimerRef.current / SPECIAL_FOOD_MAX_TIME) * canvas.width;
            ctx.fillStyle = '#edc531';
            ctx.fillRect(0, 0, timerWidth, 6);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(0, 0, canvas.width, 6);
        }

        // Snake
        snakeRef.current.forEach((segment, index) => {
            const isHead = index === 0;
            const gradient = ctx.createRadialGradient(
                segment.x * GRID_SIZE + GRID_SIZE / 2,
                segment.y * GRID_SIZE + GRID_SIZE / 2,
                0,
                segment.x * GRID_SIZE + GRID_SIZE / 2,
                segment.y * GRID_SIZE + GRID_SIZE / 2,
                GRID_SIZE / 2
            );
            if (isHead) {
                gradient.addColorStop(0, '#2ed573');
                gradient.addColorStop(1, '#26de81');
            } else {
                const alpha = 1 - (index / snakeRef.current.length) * 0.4;
                gradient.addColorStop(0, `rgba(38, 222, 129, ${alpha})`);
                gradient.addColorStop(1, `rgba(32, 191, 107, ${alpha})`);
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);

            if (isHead) {
                ctx.fillStyle = '#1a1a2e';
                const eyeSize = 3;
                const eyeOffset = 5;
                const centerX = segment.x * GRID_SIZE + GRID_SIZE / 2;
                const centerY = segment.y * GRID_SIZE + GRID_SIZE / 2;
                let eye1 = { x: 0, y: 0 }, eye2 = { x: 0, y: 0 };
                const dir = directionRef.current;
                if (dir.x === 1) {
                    eye1 = { x: centerX + 3, y: centerY - eyeOffset };
                    eye2 = { x: centerX + 3, y: centerY + eyeOffset };
                } else if (dir.x === -1) {
                    eye1 = { x: centerX - 3, y: centerY - eyeOffset };
                    eye2 = { x: centerX - 3, y: centerY + eyeOffset };
                } else if (dir.y === -1) {
                    eye1 = { x: centerX - eyeOffset, y: centerY - 3 };
                    eye2 = { x: centerX + eyeOffset, y: centerY - 3 };
                } else {
                    eye1 = { x: centerX - eyeOffset, y: centerY + 3 };
                    eye2 = { x: centerX + eyeOffset, y: centerY + 3 };
                }
                ctx.beginPath();
                ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }, []);

    const getSpeed = useCallback((currentLevel: number) => {
        const base = BASE_SPEEDS[speedSetting];
        const levelBonus = (currentLevel - 1) * 5;
        return Math.max(50, base - levelBonus);
    }, [speedSetting]);

    const gameOver = useCallback(() => {
        setGameState('gameOver');
        if (loopRef.current) clearInterval(loopRef.current);
        
        setScore(currentScore => {
            setBestScore(prev => {
                const newBest = Math.max(prev, currentScore);
                localStorage.setItem('snake-best', newBest.toString());
                return newBest;
            });
            return currentScore;
        });
    }, []);

    const update = useCallback(() => {
        // ... (unmodified)
        directionRef.current = { ...nextDirectionRef.current };
        const head = {
            x: snakeRef.current[0].x + directionRef.current.x,
            y: snakeRef.current[0].y + directionRef.current.y
        };

        // Wall collision
        if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
            if (gameMode === 'classic') {
                head.x = (head.x + TILE_COUNT) % TILE_COUNT;
                head.y = (head.y + TILE_COUNT) % TILE_COUNT;
            } else {
                gameOver();
                return;
            }
        }

        // Self collision
        if (snakeRef.current.some(s => s.x === head.x && s.y === head.y)) {
            gameOver();
            return;
        }

        // Obstacle collision
        if (obstaclesRef.current.some(o => o.x === head.x && o.y === head.y)) {
            gameOver();
            return;
        }

        const newSnake = [head, ...snakeRef.current];
        let ate = false;

        // Regular food
        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
            setScore(s => {
                const newScore = s + 10;
                const newLevel = Math.floor(newScore / 100) + 1;
                setLevel(prevLevel => {
                    if (newLevel > prevLevel) {
                        if (loopRef.current) clearInterval(loopRef.current);
                        loopRef.current = setInterval(updateRef.current!, getSpeed(newLevel));
                        if (gameMode === 'obstacles') generateObstacles(newLevel);
                        return newLevel;
                    }
                    return prevLevel;
                });
                return newScore;
            });
            foodCounterRef.current++;
            ate = true;
            spawnFood();
        }

        // Special food
        if (specialFoodRef.current && head.x === specialFoodRef.current.x && head.y === specialFoodRef.current.y) {
            const ratio = specialFoodTimerRef.current / SPECIAL_FOOD_MAX_TIME;
            const bonus = Math.ceil(ratio * 100);
            setScore(s => s + bonus);
            
            const reductionPercent = 0.05 + (ratio * 0.45);
            const numToRemove = Math.floor(newSnake.length * reductionPercent);
            for (let i = 0; i < numToRemove && newSnake.length > 3; i++) {
                newSnake.pop();
            }
            specialFoodRef.current = null;
            specialFoodTimerRef.current = 0;
            ate = true;
        }

        if (!ate) newSnake.pop();
        snakeRef.current = newSnake;

        if (specialFoodRef.current) {
            specialFoodTimerRef.current -= getSpeed(level);
            if (specialFoodTimerRef.current <= 0) {
                specialFoodRef.current = null;
                specialFoodTimerRef.current = 0;
            }
        }

        draw();
    }, [gameMode, gameOver, getSpeed, level, spawnFood, generateObstacles, draw]);

    useEffect(() => {
        updateRef.current = update;
    }, [update]);

    const startGame = useCallback(() => {
        snakeRef.current = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        directionRef.current = { x: 1, y: 0 };
        nextDirectionRef.current = { x: 1, y: 0 };
        setScore(0);
        setLevel(1);
        foodCounterRef.current = 0;
        specialFoodRef.current = null;
        specialFoodTimerRef.current = 0;
        
        setGameState('playing');
        spawnFood();
        if (gameMode === 'obstacles') generateObstacles(1);
        
        if (loopRef.current) clearInterval(loopRef.current);
        loopRef.current = setInterval(update, getSpeed(1));
    }, [gameMode, getSpeed, spawnFood, generateObstacles, update]);

    const togglePause = useCallback(() => {
        if (gameState === 'playing') {
            setGameState('paused');
            if (loopRef.current) clearInterval(loopRef.current);
        } else if (gameState === 'paused') {
            setGameState('playing');
            loopRef.current = setInterval(update, getSpeed(level));
        }
    }, [gameState, level, getSpeed, update]);

    const setDirection = useCallback((x: number, y: number) => {
        const dir = directionRef.current;
        if (dir.x === -x && dir.y === -y) return;
        if (x !== 0 && dir.x !== 0) return;
        if (y !== 0 && dir.y !== 0) return;
        nextDirectionRef.current = { x, y };
    }, []);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (e.code === 'Space') {
                e.preventDefault();
                if (gameState === 'start' || gameState === 'gameOver') startGame();
                else togglePause();
                return;
            }
            if (key === 'arrowup' || key === 'z' || key === 'w') { e.preventDefault(); setDirection(0, -1); }
            else if (key === 'arrowdown' || key === 's') { e.preventDefault(); setDirection(0, 1); }
            else if (key === 'arrowleft' || key === 'q' || key === 'a') { e.preventDefault(); setDirection(-1, 0); }
            else if (key === 'arrowright' || key === 'd') { e.preventDefault(); setDirection(1, 0); }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [gameState, setDirection, startGame, togglePause]);

    // Initial draw
    useEffect(() => {
        if (gameState === 'start' && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = TILE_COUNT * GRID_SIZE;
            canvas.height = TILE_COUNT * GRID_SIZE;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [gameState]);

    // Particles
    useEffect(() => {
        setParticles(Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 15}s`,
            duration: `${10 + Math.random() * 10}s`
        })));
    }, []);

    return (
        <div className={styles.body}>
            <Link href="/" className={styles.backToMenuBtn}>
                <span>←</span>
                <span>Menu</span>
            </Link>

            <div className={styles.particles}>
                {particles.map(p => (
                    <div 
                        key={p.id} 
                        className={styles.particle}
                        style={{
                            left: p.left,
                            animationDelay: p.delay,
                            animationDuration: p.duration
                        }}
                    />
                ))}
            </div>

            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.logo}>🐍 Snake Master</h1>
                    <p className={styles.subtitle}>Mangez, grandissez, survivez!</p>
                </header>

                <div className={styles.gameInfo}>
                    <div className={styles.infoBox}>
                        <div className={styles.infoLabel}>Score</div>
                        <div className={styles.infoValue}>{score}</div>
                    </div>
                    <div className={styles.infoBox}>
                        <div className={styles.infoLabel}>Niveau</div>
                        <div className={styles.infoValue}>{level}</div>
                    </div>
                    <div className={styles.infoBox}>
                        <div className={styles.infoLabel}>Meilleur</div>
                        <div className={styles.infoValue}>{bestScore}</div>
                    </div>
                </div>

                {(gameState === 'start' || gameState === 'gameOver') && (
                    <div className={styles.settingsPanel}>
                        <div className={styles.settingsRow}>
                            <span className={styles.settingsLabel}>🚀 Vitesse initiale</span>
                            <div className={styles.settingsOptions}>
                                {(['slow', 'normal', 'fast'] as SpeedSetting[]).map(s => (
                                    <button 
                                        key={s}
                                        className={`${styles.optionBtn} ${speedSetting === s ? styles.optionBtnActive : ''}`}
                                        onClick={() => setSpeedSetting(s)}
                                    >
                                        {s === 'slow' ? 'Lent' : s === 'normal' ? 'Normal' : 'Rapide'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.settingsRow}>
                            <span className={styles.settingsLabel}>🧱 Mode de jeu</span>
                            <div className={styles.settingsOptions}>
                                {(['classic', 'obstacles'] as GameMode[]).map(m => (
                                    <button 
                                        key={m}
                                        className={`${styles.optionBtn} ${gameMode === m ? styles.optionBtnActive : ''}`}
                                        onClick={() => setGameMode(m)}
                                    >
                                        {m === 'classic' ? 'Classique' : 'Obstacles'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.gameWrapper}>
                    <canvas ref={canvasRef} className={styles.gameBoard}></canvas>
                    
                    {gameState === 'start' && (
                        <div className={styles.gameOverlay}>
                            <div className={styles.overlayTitle}>🐍 Snake</div>
                            <div className={styles.overlayHint}>Appuyez sur ESPACE ou le bouton pour commencer</div>
                            <button className={styles.btn} onClick={startGame}>▶️ Jouer</button>
                        </div>
                    )}

                    {gameState === 'gameOver' && (
                        <div className={styles.gameOverlay}>
                            <div className={styles.overlayTitle}>💀 Game Over!</div>
                            <div className={styles.overlayScore}>Score: {score}</div>
                            <div className={styles.overlayScore}>Niveau atteint: {level}</div>
                            <button className={styles.btn} onClick={startGame}>🔄 Rejouer</button>
                        </div>
                    )}
                </div>

                <div className={styles.controls}>
                    <button className={`${styles.btn} ${styles.secondary}`} onClick={togglePause}>
                        {gameState === 'paused' ? '▶️ Reprendre' : '⏸️ Pause'}
                    </button>
                </div>

                <div className={styles.mobileControls}>
                    <div className={styles.dPad}>
                        <div className={styles.empty}></div>
                        <button className={styles.dPadBtn} onClick={() => setDirection(0, -1)}>⬆️</button>
                        <div className={styles.empty}></div>
                        <button className={styles.dPadBtn} onClick={() => setDirection(-1, 0)}>⬅️</button>
                        <div className={styles.empty}></div>
                        <button className={styles.dPadBtn} onClick={() => setDirection(1, 0)}>➡️</button>
                        <div className={styles.empty}></div>
                        <button className={styles.dPadBtn} onClick={() => setDirection(0, 1)}>⬇️</button>
                        <div className={styles.empty}></div>
                    </div>
                </div>

                <p className={styles.instructions}>
                    Utilisez les <strong>flèches</strong> ou <strong>ZQSD</strong> pour diriger le serpent.
                </p>
            </div>
        </div>
    );
}
