'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import styles from './minesweeper.module.css';

type Difficulty = 'easy' | 'medium' | 'hard';

interface CellData {
    r: number;
    c: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

const DIFFICULTIES = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

export default function Minesweeper() {
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [grid, setGrid] = useState<CellData[][]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [hasWon, setHasWon] = useState(false);
    const [timer, setTimer] = useState(0);
    const [flagsCount, setFlagsCount] = useState(0);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const config = DIFFICULTIES[difficulty];

    const createEmptyGrid = useCallback((rows: number, cols: number) => {
        const newGrid: CellData[][] = [];
        for (let r = 0; r < rows; r++) {
            const row: CellData[] = [];
            for (let c = 0; c < cols; c++) {
                row.push({
                    r,
                    c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                });
            }
            newGrid.push(row);
        }
        return newGrid;
    }, []);

    const newGame = useCallback((diff: Difficulty = difficulty) => {
        if (timerRef.current) clearInterval(timerRef.current);
        const { rows, cols } = DIFFICULTIES[diff];
        setGrid(createEmptyGrid(rows, cols));
        setIsGameOver(false);
        setHasWon(false);
        setTimer(0);
        setFlagsCount(0);
        setIsGameStarted(false);
        setShowModal(false);
    }, [difficulty, createEmptyGrid]);

    useEffect(() => {
        newGame();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [newGame]);

    const particles = useMemo(() => Array.from({ length: 20 }).map((_, i) => (
        <div
            key={i}
            className={styles.particle}
            style={{
                left: `${(i * 7 + 13) % 100}vw`,
                animationDelay: `${(i * 3) % 20}s`,
                animationDuration: `${15 + (i * 2) % 10}s`
            }}
        />
    )), []);

    const countNeighborMines = (r: number, c: number, checkGrid: CellData[][], maxR: number, maxC: number) => {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < maxR && nc >= 0 && nc < maxC && checkGrid[nr][nc].isMine) {
                    count++;
                }
            }
        }
        return count;
    };

    const placeMines = (firstR: number, firstC: number, currentGrid: CellData[][]) => {
        const { rows, cols, mines } = config;
        let minesPlaced = 0;
        const newGrid = currentGrid.map(row => row.map(cell => ({ ...cell })));
        
        // Use a simple seeded pseudo-random or just enough entropy that isn't naked Math.random in render
        let seed = Date.now();
        const rng = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        while (minesPlaced < mines) {
            const r = Math.floor(rng() * rows);
            const c = Math.floor(rng() * cols);
            
            const isTooClose = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1;
            
            if (!newGrid[r][c].isMine && !isTooClose) {
                newGrid[r][c].isMine = true;
                minesPlaced++;
            }
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!newGrid[r][c].isMine) {
                    newGrid[r][c].neighborMines = countNeighborMines(r, c, newGrid, rows, cols);
                }
            }
        }
        
        return newGrid;
    };

    const handleCellClick = (r: number, c: number) => {
        if (isGameOver || hasWon) return;
        
        let currentGrid = grid;
        
        if (!isGameStarted) {
            setIsGameStarted(true);
            currentGrid = placeMines(r, c, grid);
            setGrid(currentGrid);
            timerRef.current = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        }

        const cell = currentGrid[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        if (cell.isMine) {
            handleGameOver(false, currentGrid);
            return;
        }

        revealCell(r, c, currentGrid);
    };

    const revealCell = (r: number, c: number, currentGrid: CellData[][]) => {
        const { rows, cols } = config;
        const newGrid = currentGrid.map(row => row.map(cell => ({ ...cell })));
        
        const stack = [{r, c}];
        let newlyRevealed = 0;

        while(stack.length > 0) {
            const current = stack.pop()!;
            const cell = newGrid[current.r][current.c];
            
            if (cell.isRevealed || cell.isFlagged) continue;
            
            cell.isRevealed = true;
            newlyRevealed++;

            if (cell.neighborMines === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = current.r + dr;
                        const nc = current.c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            if (!newGrid[nr][nc].isRevealed && !newGrid[nr][nc].isFlagged && !newGrid[nr][nc].isMine) {
                                stack.push({r: nr, c: nc});
                            }
                        }
                    }
                }
            }
        }

        setGrid(newGrid);
        checkWin(newGrid);
    };

    const checkWin = (currentGrid: CellData[][]) => {
        const { rows, cols, mines } = config;
        let revealedCount = 0;
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (currentGrid[r][c].isRevealed) revealedCount++;
            }
        }

        if (revealedCount === (rows * cols - mines)) {
            handleGameOver(true, currentGrid);
        }
    };

    const handleGameOver = (win: boolean, currentGrid: CellData[][]) => {
        setIsGameOver(true);
        setHasWon(win);
        if (timerRef.current) clearInterval(timerRef.current);

        const finalGrid = currentGrid.map(row => row.map(cell => {
            if (cell.isMine && !win) {
                return { ...cell, isRevealed: true };
            }
            return cell;
        }));

        setGrid(finalGrid);
        setTimeout(() => setShowModal(true), 500);
    };

    const handleCellContextMenu = (e: React.MouseEvent | React.TouchEvent, r: number, c: number) => {
        e.preventDefault();
        if (isGameOver || hasWon) return;
        
        const cell = grid[r][c];
        if (cell.isRevealed) return;

        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        const newFlagState = !newGrid[r][c].isFlagged;
        newGrid[r][c].isFlagged = newFlagState;
        
        setFlagsCount(prev => prev + (newFlagState ? 1 : -1));
        setGrid(newGrid);
    };
    
    // long press handling
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onTouchStart = (e: React.TouchEvent, r: number, c: number) => {
        longPressTimeoutRef.current = setTimeout(() => {
            handleCellContextMenu(e, r, c);
            if ('vibrate' in navigator) navigator.vibrate(50);
        }, 500);
    };

    const onTouchEndOrMove = () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };

    const handleDifficultyChange = (diff: Difficulty) => {
        setDifficulty(diff);
        newGame(diff);
    };

    return (
        <div className={styles.body}>
            <Link href="/" className={styles.backToMenuBtn}>
                <span>←</span>
                <span>Menu</span>
            </Link>

            <div className={styles.particlesContainer}>
                {particles}
            </div>

            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.logo}>💣 Démineur Master</h1>
                    <p className={styles.subtitle}>Logique, intuition et rapidité.</p>
                </header>

                <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Mines</div>
                        <div className={styles.statValue}>{config.mines - flagsCount}</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Temps</div>
                        <div className={styles.statValue}>{String(Math.min(999, timer)).padStart(3, '0')}</div>
                    </div>
                </div>

                <div 
                    className={styles.gameBoard}
                    style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {grid.map((row, r) => 
                        row.map((cell, c) => (
                            <div 
                                key={`${r}-${c}`}
                                className={`
                                    ${styles.cell} 
                                    ${cell.isRevealed ? styles.revealed : ''} 
                                    ${cell.isFlagged ? styles.flagged : ''}
                                    ${cell.isMine && cell.isRevealed ? styles.mine : ''}
                                `}
                                data-count={cell.neighborMines}
                                onClick={() => handleCellClick(r, c)}
                                onContextMenu={(e) => handleCellContextMenu(e, r, c)}
                                onTouchStart={(e) => onTouchStart(e, r, c)}
                                onTouchEnd={onTouchEndOrMove}
                                onTouchMove={onTouchEndOrMove}
                            >
                                {cell.isFlagged && !cell.isRevealed && '🚩'}
                                {cell.isRevealed && cell.isMine && '💣'}
                                {cell.isRevealed && !cell.isMine && cell.neighborMines > 0 && cell.neighborMines}
                            </div>
                        ))
                    )}
                </div>

                <div className={styles.controls}>
                    <button 
                        className={`${styles.btn} ${styles.secondary} ${difficulty === 'easy' ? styles.activeDiff : ''}`} 
                        onClick={() => handleDifficultyChange('easy')}
                    >Facile</button>
                    <button 
                        className={`${styles.btn} ${styles.secondary} ${difficulty === 'medium' ? styles.activeDiff : ''}`} 
                        onClick={() => handleDifficultyChange('medium')}
                    >Moyen</button>
                    <button 
                        className={`${styles.btn} ${styles.secondary} ${difficulty === 'hard' ? styles.activeDiff : ''}`} 
                        onClick={() => handleDifficultyChange('hard')}
                    >Expert</button>
                    <button className={styles.btn} onClick={() => newGame(difficulty)}>🔄 Nouveau Jeu</button>
                </div>

                <p className={styles.instructionHint}>
                    <strong>Clic gauche</strong> pour révéler. <strong>Clic droit</strong> pour marquer.<br/>
                    Sur mobile, maintenez pour marquer d'un drapeau.
                </p>
            </div>

            {showModal && (
                <div className={`${styles.modalOverlay} ${styles.active}`}>
                    <div className={styles.modalContent}>
                        <h2 className={`${styles.modalTitle} ${hasWon ? styles.win : styles.lose}`}>
                            {hasWon ? 'Victoire !' : 'BOUM !'}
                        </h2>
                        <div className={styles.modalStats}>
                            <p>Temps : <span>{timer}</span>s</p>
                            <p>Difficulté : <span>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span></p>
                        </div>
                        <div className={styles.modalBtns}>
                            <button className={styles.btn} onClick={() => newGame(difficulty)}>🔄 Rejouer</button>
                            <Link href="/" className={`${styles.btn} ${styles.secondary} ${styles.menuLink}`}>🏠 Menu Principal</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
