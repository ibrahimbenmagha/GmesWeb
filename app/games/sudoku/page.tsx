'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import styles from './sudoku.module.css';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const CELLS_TO_REMOVE = {
    easy: 35,
    medium: 45,
    hard: 52,
    expert: 58
};

// --- Sudoku Logic Helpers ---
const isValid = (grid: number[][], row: number, col: number, num: number) => {
    for (let x = 0; x < 9; x++) if (grid[row][x] === num) return false;
    for (let x = 0; x < 9; x++) if (grid[x][col] === num) return false;
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
};

const findEmpty = (grid: number[][]) => {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) return [r, c];
        }
    }
    return null;
};

const solveSudoku = (grid: number[][]): boolean => {
    const empty = findEmpty(grid);
    if (!empty) return true;
    const [r, c] = empty;
    for (let num = 1; num <= 9; num++) {
        if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0;
        }
    }
    return false;
};

const generateSolution = () => {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    const fill = (g: number[][]): boolean => {
        const empty = findEmpty(g);
        if (!empty) return true;
        const [r, c] = empty;
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
            if (isValid(g, r, c, num)) {
                g[r][c] = num;
                if (fill(g)) return true;
                g[r][c] = 0;
            }
        }
        return false;
    };
    fill(grid);
    return grid;
};

const generatePuzzle = (difficulty: Difficulty) => {
    const solution = generateSolution();
    const puzzle = solution.map(row => [...row]);
    let removed = 0;
    const target = CELLS_TO_REMOVE[difficulty];
    const positions = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) positions.push([r, c]);
    positions.sort(() => Math.random() - 0.5);

    for (const [r, c] of positions) {
        if (removed >= target) break;
        puzzle[r][c] = 0;
        removed++;
    }
    return { puzzle, solution };
};

export default function Sudoku() {
    const [screen, setScreen] = useState<'level' | 'game'>('level');
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [puzzle, setPuzzle] = useState<number[][]>([]);
    const [solution, setSolution] = useState<number[][]>([]);
    const [board, setBoard] = useState<number[][]>([]);
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [notes, setNotes] = useState<Set<number>[][]>([]);
    const [notesMode, setNotesMode] = useState(false);
    const [score, setScore] = useState(0);
    const [errors, setErrors] = useState(0);
    const [timer, setTimer] = useState(0);
    const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const initBoard = useCallback((diff: Difficulty) => {
        const { puzzle: p, solution: s } = generatePuzzle(diff);
        setPuzzle(p);
        setSolution(s);
        setBoard(p.map(row => [...row]));
        setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set<number>())));
        setScore(0);
        setErrors(0);
        setTimer(0);
        setGameOver(null);
        setScreen('game');
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }, []);

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const handleCellClick = (r: number, c: number) => {
        setSelected([r, c]);
    };

    const handleNumberInput = (num: number) => {
        if (!selected || gameOver) return;
        const [r, c] = selected;
        if (puzzle[r][c] !== 0) return; // Original cell

        if (notesMode) {
            // Create a deep copy of notes to ensure React detects state change
            const newNotes = notes.map(row => row.map(cellNotes => new Set(cellNotes)));
            if (newNotes[r][c].has(num)) {
                newNotes[r][c].delete(num);
            } else {
                newNotes[r][c].add(num);
            }
            setNotes(newNotes);
            return;
        }

        const newBoard = board.map(row => [...row]);
        if (num === solution[r][c]) {
            newBoard[r][c] = num;
            setBoard(newBoard);
            setScore(s => s + 100);
            if (checkWin(newBoard)) {
                setGameOver('win');
                if (timerRef.current) clearInterval(timerRef.current);
            }
        } else {
            setErrors(e => e + 1);
            setScore(s => Math.max(0, s - 50));
            // Visual error feedback handled by class
            setTimeout(() => {
                // optional: clear error after a delay
            }, 500);
        }
    };

    const checkWin = (b: number[][]) => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (b[r][c] !== solution[r][c]) return false;
            }
        }
        return true;
    };

    const formatTime = (t: number) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getCellClass = (r: number, c: number) => {
        let cls = styles.cell;
        if (selected && selected[0] === r && selected[1] === c) cls += ` ${styles.cellSelected}`;
        if (puzzle[r][c] !== 0) cls += ` ${styles.cellFixed}`;
        // Error check
        if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) cls += ` ${styles.cellError}`;
        // Highlight related
        if (selected) {
            const [sr, sc] = selected;
            const sbRow = Math.floor(sr / 3) * 3;
            const sbCol = Math.floor(sc / 3) * 3;
            const bRow = Math.floor(r / 3) * 3;
            const bCol = Math.floor(c / 3) * 3;
            if (r === sr || c === sc || (sbRow === bRow && sbCol === bCol)) {
                if (!(sr === r && sc === c)) cls += ` ${styles.cellHighlight}`;
            }
            if (board[r][c] !== 0 && board[r][c] === board[sr][sc]) cls += ` ${styles.sameNumber}`;
        }
        return cls;
    };

    if (screen === 'level') {
        return (
            <div className={styles.body}>
                <Link href="/" className={styles.backBtn}>← Menu</Link>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1 className={styles.logo}>Sudoku Master</h1>
                        <p className={styles.subtitle}>Choose your challenge</p>
                    </header>
                    <div className={styles.levelCards}>
                        {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(d => (
                            <div key={d} className={`${styles.levelCard} ${styles[d]}`} onClick={() => { setDifficulty(d); initBoard(d); }}>
                                <span className={styles.levelIcon}>{d === 'easy' ? '🌱' : d === 'medium' ? '🌿' : d === 'hard' ? '🔥' : '💎'}</span>
                                <div className={styles.levelName}>{d.toUpperCase()}</div>
                                <div className={styles.levelDesc}>{d === 'easy' ? 'Beginner' : d === 'medium' ? 'Balanced' : d === 'hard' ? 'Advanced' : 'Pro'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.body}>
            <button className={styles.backBtn} onClick={() => setScreen('level')}>← Exit</button>
            <div className={styles.container}>
                <div className={styles.gameHeader}>
                    <div className={styles.infoBox}><div className={styles.infoLabel}>Score</div><div className={styles.infoValue}>{score}</div></div>
                    <div className={styles.infoBox}><div className={styles.infoLabel}>Time</div><div className={styles.infoValue}>{formatTime(timer)}</div></div>
                    <div className={styles.infoBox}><div className={styles.infoLabel}>Errors</div><div className={styles.infoValue} style={{color: '#ef4444'}}>{errors}</div></div>
                </div>

                <div className={styles.boardContainer}>
                    <div className={styles.sudokuBoard}>
                        {board.map((row, r) => row.map((val, c) => (
                            <div key={`${r}-${c}`} className={getCellClass(r, c)} onClick={() => handleCellClick(r, c)}>
                                {val !== 0 ? val : (
                                    <div className={styles.notesGrid}>
                                        {[1,2,3,4,5,6,7,8,9].map(n => (
                                            <div key={n} className={styles.noteNum}>{notes[r][c].has(n) ? n : ''}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )))}
                    </div>
                </div>

                <div className={styles.modeContainer}>
                    <button className={`${styles.modeBtn} ${!notesMode ? styles.modeActive : ''}`} onClick={() => setNotesMode(false)}>✏️ Normal</button>
                    <button className={`${styles.modeBtn} ${notesMode ? styles.modeActive : ''}`} onClick={() => setNotesMode(true)}>📝 Notes</button>
                </div>

                <div className={styles.numberPad}>
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                        <button key={n} className={styles.numBtn} onClick={() => handleNumberInput(n)}>{n}</button>
                    ))}
                </div>

                <div className={styles.actionButtons}>
                    <button className={styles.actionBtn} onClick={() => { const {puzzle:p, solution:s} = generatePuzzle(difficulty); setPuzzle(p); setSolution(s); setBoard(p.map(row=>[...row])); setNotes(Array(9).fill(null).map(()=>Array(9).fill(null).map(()=>new Set<number>()))); setTimer(0); setScore(0); setErrors(0); }}>🔄 New Game</button>
                    <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => { if (selected) { const [r,c] = selected; handleNumberInput(solution[r][c]); } }}>💡 Hint</button>
                </div>
            </div>

            {gameOver && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>{gameOver === 'win' ? '🎉 Congratulations!' : '😢 Game Over'}</h2>
                        <p>Difficulty: {difficulty.toUpperCase()}</p>
                        <p>Score: {score}</p>
                        <p>Time: {formatTime(timer)}</p>
                        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} style={{marginTop: '20px', width: '100%'}} onClick={() => setScreen('level')}>Play Again</button>
                    </div>
                </div>
            )}
        </div>
    );
}
