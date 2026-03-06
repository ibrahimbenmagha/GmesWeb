'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './chess.module.css';

type Color = 'white' | 'black';
type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type Piece = { type: PieceType; color: Color };
type Board = (Piece | null)[][];
type Position = { row: number; col: number };
type Move = { from: Position; to: Position; piece: Piece; captured: Piece | null; notation: string };

const PIECES_UNICODE: Record<Color, Record<PieceType, string>> = {
    white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
    black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

const INITIAL_BOARD: Board = [
    [
        { type: 'rook', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' },
        { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' }
    ],
    Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'black' as Color })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'white' as Color })),
    [
        { type: 'rook', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' },
        { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' }
    ]
];

const PIECE_VALUES: Record<PieceType, number> = {
    pawn: 10, knight: 30, bishop: 30, rook: 50, queen: 90, king: 900
};

export default function ChessGame() {
    const [board, setBoard] = useState<Board>(INITIAL_BOARD);
    const [turn, setTurn] = useState<Color>('white');
    const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);
    const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
    const [moveHistory, setMoveHistory] = useState<Move[]>([]);
    const [capturedPieces, setCapturedPieces] = useState<Piece[]>([]);
    const [aiLevel, setAiLevel] = useState(3);
    const [showDifficultyModal, setShowDifficultyModal] = useState(true);
    const [isGameOver, setIsGameOver] = useState(false);
    const [winner, setWinner] = useState<Color | 'draw' | null>(null);
    const [time, setTime] = useState(0);
    const [isThinking, setIsThinking] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const boardRef = useRef<Board>(INITIAL_BOARD);

    useEffect(() => {
        boardRef.current = board;
    }, [board]);

    useEffect(() => {
        if (!isGameOver && !showDifficultyModal) {
            timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isGameOver, showDifficultyModal]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getMoves = useCallback((row: number, col: number, b: Board, ignoreCheck = false): Position[] => {
        const piece = b[row][col];
        if (!piece) return [];
        const moves: Position[] = [];
        const color = piece.color;

        const addMove = (r: number, c: number) => {
            if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
            const target = b[r][c];
            if (!target) {
                moves.push({ row: r, col: c });
                return true;
            }
            if (target.color !== color) {
                moves.push({ row: r, col: c });
            }
            return false;
        };

        const dirs = {
            rook: [[0, 1], [0, -1], [1, 0], [-1, 0]],
            bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
            king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
        };

        if (piece.type === 'pawn') {
            const dir = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;
            if (b[row + dir] && b[row + dir][col] === null) {
                moves.push({ row: row + dir, col });
                if (row === startRow && b[row + 2 * dir] && b[row + 2 * dir][col] === null) {
                    moves.push({ row: row + 2 * dir, col });
                }
            }
            [-1, 1].forEach(dc => {
                const nr = row + dir, nc = col + dc;
                if (b[nr] && b[nr][nc] && b[nr][nc]?.color !== color) moves.push({ row: nr, col: nc });
            });
        } else if (piece.type === 'rook' || piece.type === 'bishop' || piece.type === 'queen') {
            const directions = piece.type === 'queen' ? [...dirs.rook, ...dirs.bishop] : (piece.type === 'rook' ? dirs.rook : dirs.bishop);
            directions.forEach(([dr, dc]) => {
                let r = row + dr, c = col + dc;
                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = b[r][c];
                    if (!target) { moves.push({ row: r, col: c }); }
                    else { if (target.color !== color) moves.push({ row: r, col: c }); break; }
                    r += dr; c += dc;
                }
            });
        } else if (piece.type === 'knight' || piece.type === 'king') {
            const set = piece.type === 'knight' ? dirs.knight : dirs.king;
            set.forEach(([dr, dc]) => addMove(row + dr, col + dc));
        }

        if (ignoreCheck) return moves;

        return moves.filter(m => !wouldBeInCheck(row, col, m.row, m.col, color, b));
    }, []);

    const isInCheck = (color: Color, b: Board) => {
        let kingPos: Position | null = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c]?.type === 'king' && b[r][c]?.color === color) {
                    kingPos = { row: r, col: c };
                    break;
                }
            }
            if (kingPos) break;
        }
        if (!kingPos) return false;

        const opp = color === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c]?.color === opp) {
                    const moves = getMoves(r, c, b, true);
                    if (moves.some(m => m.row === kingPos!.row && m.col === kingPos!.col)) return true;
                }
            }
        }
        return false;
    };

    const wouldBeInCheck = (fr: number, fc: number, tr: number, tc: number, color: Color, b: Board) => {
        const nextBoard = b.map(row => [...row]);
        nextBoard[tr][tc] = nextBoard[fr][fc];
        nextBoard[fr][fc] = null;
        return isInCheck(color, nextBoard);
    };

    const getNotation = (piece: Piece, to: Position, captured: boolean) => {
        const files = 'abcdefgh';
        const rank = 8 - to.row;
        const file = files[to.col];
        const pSymbol = piece.type === 'pawn' ? '' : PIECES_UNICODE[piece.color][piece.type];
        return `${pSymbol}${captured ? 'x' : ''}${file}${rank}`;
    };

    const makeMove = useCallback((fr: number, fc: number, tr: number, tc: number) => {
        const currentBoard = boardRef.current;
        const piece = currentBoard[fr][fc]!;
        const captured = currentBoard[tr][tc];

        const nextBoard = currentBoard.map(row => [...row]);
        nextBoard[tr][tc] = piece;
        nextBoard[fr][fc] = null;

        // Promotion
        if (piece.type === 'pawn' && (tr === 0 || tr === 7)) {
            nextBoard[tr][tc] = { type: 'queen', color: piece.color };
        }

        const move: Move = {
            from: { row: fr, col: fc },
            to: { row: tr, col: tc },
            piece,
            captured,
            notation: getNotation(piece, { row: tr, col: tc }, !!captured)
        };

        setBoard(nextBoard);
        setLastMove({ from: { row: fr, col: fc }, to: { row: tr, col: tc } });
        setMoveHistory(prev => [...prev, move]);
        if (captured) setCapturedPieces(prev => [...prev, captured]);
        
        const nextTurn = piece.color === 'white' ? 'black' : 'white';
        setTurn(nextTurn);
        
        // Check game over
        let hasValidMove = false;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (nextBoard[r][c]?.color === nextTurn) {
                    if (getMoves(r, c, nextBoard).length > 0) {
                        hasValidMove = true;
                        break;
                    }
                }
            }
            if (hasValidMove) break;
        }

        if (!hasValidMove) {
            setIsGameOver(true);
            if (isInCheck(nextTurn, nextBoard)) setWinner(piece.color);
            else setWinner('draw');
        }
    }, [getMoves]);

    const evaluateBoard = (b: Board) => {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p) {
                    const val = PIECE_VALUES[p.type];
                    score += p.color === 'black' ? val : -val;
                }
            }
        }
        return score;
    };

    const minimax = useCallback((depth: number, alpha: number, beta: number, isMaximizing: boolean, currentBoard: Board): { score: number, move?: { fr: number, fc: number, tr: number, tc: number } } => {
        if (depth === 0) return { score: evaluateBoard(currentBoard) };

        const color = isMaximizing ? 'black' : 'white';
        let bestScore = isMaximizing ? -Infinity : Infinity;
        let bestMove: any = null;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (currentBoard[r][c]?.color === color) {
                    const moves = getMoves(r, c, currentBoard);
                    for (const m of moves) {
                        const nextB = currentBoard.map(row => [...row]);
                        nextB[m.row][m.col] = nextB[r][c];
                        nextB[r][c] = null;

                        const res = minimax(depth - 1, alpha, beta, !isMaximizing, nextB);
                        
                        if (isMaximizing) {
                            if (res.score > bestScore) {
                                bestScore = res.score;
                                bestMove = { fr: r, fc: c, tr: m.row, tc: m.col };
                            }
                            alpha = Math.max(alpha, bestScore);
                        } else {
                            if (res.score < bestScore) {
                                bestScore = res.score;
                                bestMove = { fr: r, fc: c, tr: m.row, tc: m.col };
                            }
                            beta = Math.min(beta, bestScore);
                        }
                        if (beta <= alpha) break;
                    }
                }
                if (beta <= alpha) break;
            }
        }

        return { score: bestScore, move: bestMove };
    }, [getMoves]);

    const aiPlay = useCallback(() => {
        if (isGameOver || turn === 'white') return;
        setIsThinking(true);
        setTimeout(() => {
            const currentBoard = boardRef.current;
            let move;
            if (aiLevel === 1) {
                // random
                const all: any[] = [];
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (currentBoard[r][c]?.color === 'black') {
                            const ms = getMoves(r, c, currentBoard);
                            ms.forEach(m => all.push({ fr: r, fc: c, tr: m.row, tc: m.col }));
                        }
                    }
                }
                move = all[Math.floor(Math.random() * all.length)];
            } else {
                move = minimax(aiLevel, -Infinity, Infinity, true, currentBoard).move;
            }

            if (move) makeMove(move.fr, move.fc, move.tr, move.tc);
            setIsThinking(false);
        }, 500);
    }, [aiLevel, getMoves, isGameOver, makeMove, minimax, turn]);

    useEffect(() => {
        if (turn === 'black' && !isGameOver) aiPlay();
    }, [turn, isGameOver, aiPlay]);

    const handleSquareClick = (r: number, c: number) => {
        if (isGameOver || turn === 'black' || isThinking) return;

        if (selectedSquare) {
            const move = validMoves.find(m => m.row === r && m.col === c);
            if (move) {
                makeMove(selectedSquare.row, selectedSquare.col, r, c);
                setSelectedSquare(null);
                setValidMoves([]);
            } else {
                const p = board[r][c];
                if (p && p.color === 'white') {
                    setSelectedSquare({ row: r, col: c });
                    setValidMoves(getMoves(r, c, board));
                } else {
                    setSelectedSquare(null);
                    setValidMoves([]);
                }
            }
        } else {
            const p = board[r][c];
            if (p && p.color === 'white') {
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getMoves(r, c, board));
            }
        }
    };

    const startNewGame = (level: number) => {
        setAiLevel(level);
        setBoard(INITIAL_BOARD);
        setTurn('white');
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove(null);
        setMoveHistory([]);
        setCapturedPieces([]);
        setIsGameOver(false);
        setWinner(null);
        setTime(0);
        setShowDifficultyModal(false);
    };

    return (
        <div className={styles.body}>
            <div className={styles.bgParticles}>
                {Array.from({ length: 20 }).map((_, i) => <div key={i} className={styles.particle} style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 10}s` }} />)}
            </div>

            <header className={styles.header}>
                <div className={styles.logo}>
                    <span>♔</span>
                    <span>Chess Master</span>
                </div>
                <a href="/" className={styles.backBtn}>
                    <span>←</span>
                    <span>Menu Principal</span>
                </a>
            </header>

            <div className={styles.gameContainer}>
                <div className={styles.boardPanel}>
                    <div className={styles.chessBoardContainer}>
                        {isInCheck(turn, board) && !isGameOver && (
                            <div className={`${styles.statusMessage} ${styles.statusCheck}`}>⚠️ Échec!</div>
                        )}
                        <div className={styles.turnIndicator}>
                            <div className={styles.turnDot} style={{ background: turn === 'white' ? '#22c55e' : '#94a3b8' }}></div>
                            <span>{turn === 'white' ? 'Votre tour (Blancs)' : isThinking ? 'IA réfléchit...' : 'Tour de l\'IA (Noirs)'}</span>
                        </div>
                        <div className={styles.chessBoard}>
                            {board.map((row, r) => row.map((piece, c) => (
                                <div 
                                    key={`${r}-${c}`}
                                    className={`
                                        ${styles.square} 
                                        ${(r + c) % 2 === 0 ? styles.light : styles.dark}
                                        ${selectedSquare?.row === r && selectedSquare?.col === c ? styles.selected : ''}
                                        ${validMoves.some(m => m.row === r && m.col === c) ? styles.validMove : ''}
                                        ${validMoves.some(m => m.row === r && m.col === c && board[r][c]) ? styles.hasPiece : ''}
                                        ${piece?.type === 'king' && isInCheck(piece.color, board) ? styles.inCheck : ''}
                                        ${lastMove?.from.row === r && lastMove?.from.col === c ? styles.lastMoveFrom : ''}
                                        ${lastMove?.to.row === r && lastMove?.to.col === c ? styles.lastMoveTo : ''}
                                    `}
                                    onClick={() => handleSquareClick(r, c)}
                                >
                                    {piece && (
                                        <div className={`${styles.piece} ${piece.color === 'white' ? styles.whitePiece : styles.blackPiece}`}>
                                            {PIECES_UNICODE[piece.color][piece.type]}
                                        </div>
                                    )}
                                </div>
                            )))}
                        </div>
                    </div>
                </div>

                <div className={styles.infoPanel}>
                    <div className={styles.controlPanel}>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <div className={styles.statLabel}>Mouvements</div>
                                <div className={styles.statValue}>{Math.floor(moveHistory.length / 2)}</div>
                            </div>
                            <div className={styles.stat}>
                                <div className={styles.statLabel}>Temps</div>
                                <div className={styles.statValue}>{formatTime(time)}</div>
                            </div>
                        </div>
                        <div className={styles.controls}>
                            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowDifficultyModal(true)}>
                                <span>🎮</span>
                                <span>Nouveau Jeu</span>
                            </button>
                        </div>
                    </div>

                    <div className={styles.capturedPieces}>
                        <div className={styles.capturedTitle}>Pièces capturées</div>
                        <div className={styles.capturedList}>
                            {capturedPieces.map((p, i) => (
                                <div key={i} className={styles.capturedPiece}>{PIECES_UNICODE[p.color][p.type]}</div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.moveHistory}>
                        <div className={styles.moveHistoryTitle}>Historique</div>
                        <div className={styles.movesList}>
                            {moveHistory.reduce((acc: any[], m, i) => {
                                if (i % 2 === 0) acc.push([m.notation]);
                                else acc[acc.length - 1].push(m.notation);
                                return acc;
                            }, []).map((pair, i) => (
                                <div key={i} className={styles.moveItem}>
                                    <span className={styles.moveNumber}>{i + 1}.</span>
                                    <span className={styles.moveNotation}>{pair.join(' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showDifficultyModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Choisir la Difficulté</h2>
                        <div className={styles.difficultyOptions}>
                            {[
                                { l: 1, n: 'Débutant', d: 'Mouvements aléatoires' },
                                { l: 2, n: 'Facile', d: 'Stratégie basique' },
                                { l: 3, n: 'Moyen', d: 'Analyse 2 coups' },
                                { l: 4, n: 'Difficile', d: 'Analyse 3 coups' }
                            ].map(level => (
                                <button key={level.l} className={styles.difficultyBtn} onClick={() => startNewGame(level.l)}>
                                    <span>{level.n}</span>
                                    <span className={styles.statLabel}>{level.d}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isGameOver && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>{winner === 'white' ? '🏆' : winner === 'black' ? '😔' : '🤝'}</div>
                        <h2 className={styles.modalTitle}>{winner === 'draw' ? 'Partie nulle' : winner === 'white' ? 'Victoire!' : 'Défaite'}</h2>
                        <p>{winner === 'draw' ? 'Égalité' : winner === 'white' ? 'Vous avez gagné!' : 'L\'IA a gagné.'}</p>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ margin: '20px auto' }} onClick={() => setShowDifficultyModal(true)}>
                            <span>🎮</span>
                            <span>Rejouer</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
