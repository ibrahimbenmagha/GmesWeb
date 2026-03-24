'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import styles from './spider.module.css';

type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
    suit: Suit;
    value: CardValue;
    valueIndex: number;
    faceUp: boolean;
    id: string;
}

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const VALUES: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS: Record<Suit, string> = {
    spades: '♠',
    hearts: '♥',
    clubs: '♣',
    diamonds: '♦'
};

export default function SpiderSolitaire() {
    const [difficulty, setDifficulty] = useState<number | null>(null);
    const [columns, setColumns] = useState<Card[][]>(Array(10).fill([]));
    const [stock, setStock] = useState<Card[]>([]);
    const [moves, setMoves] = useState(0);
    const [score, setScore] = useState(500);
    const [sequences, setSequences] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [history, setHistory] = useState<{ columns: Card[][], stock: Card[], moves: number, score: number, sequences: number }[]>([]);

    const [draggedCoords, setDraggedCoords] = useState<{ col: number, index: number } | null>(null);
    const [dragOverCol, setDragOverCol] = useState<number | null>(null);
    const [hintCoords, setHintCoords] = useState<{ col: number, index: number }[]>([]);
    const [hintTarget, setHintTarget] = useState<number | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const saveHistory = useCallback(() => {
        setHistory(prev => {
            const newState = {
                columns: columns.map(col => [...col]),
                stock: [...stock],
                moves,
                score,
                sequences
            };
            return [...prev.slice(-49), newState];
        });
    }, [columns, stock, moves, score, sequences]);

    const initGame = (suitsCount: number) => {
        const suitsToUse = suitsCount === 1 ? ['spades'] : suitsCount === 2 ? ['spades', 'hearts'] : SUITS;
        const deck: Card[] = [];
        for (let set = 0; set < 8; set++) {
            for (let i = 0; i < VALUES.length; i++) {
                const suit = suitsToUse[set % suitsToUse.length] as Suit;
                deck.push({
                    suit,
                    value: VALUES[i],
                    valueIndex: i,
                    faceUp: false,
                    id: `${VALUES[i]}-${suit}-${set}`
                });
            }
        }

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        const newCols: Card[][] = Array(10).fill(null).map(() => []);
        let cardIdx = 0;
        for (let col = 0; col < 10; col++) {
            const count = col < 4 ? 6 : 5;
            for (let i = 0; i < count; i++) {
                const card = deck[cardIdx++];
                if (i === count - 1) card.faceUp = true;
                newCols[col].push(card);
            }
        }

        setColumns(newCols);
        setStock(deck.slice(cardIdx));
        setDifficulty(suitsCount);
        setMoves(0);
        setScore(500);
        setSequences(0);
        setTimeElapsed(0);
        setGameOver(false);
        setHistory([]);
    };

    useEffect(() => {
        if (difficulty !== null && !gameOver) {
            timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [difficulty, gameOver]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const canDrag = (colIdx: number, cardIdx: number) => {
        const col = columns[colIdx];
        if (!col[cardIdx].faceUp) return false;
        for (let i = cardIdx; i < col.length - 1; i++) {
            if (!col[i].faceUp || !col[i+1].faceUp) return false;
            if (col[i].valueIndex !== col[i+1].valueIndex + 1) return false;
            if (col[i].suit !== col[i+1].suit) return false;
        }
        return true;
    };

    const canDrop = (toColIdx: number, card: Card) => {
        const toCol = columns[toColIdx];
        if (toCol.length === 0) return true;
        const target = toCol[toCol.length - 1];
        return target.faceUp && target.valueIndex === card.valueIndex + 1;
    };

    const handleDragStart = (colIdx: number, cardIdx: number) => {
        if (canDrag(colIdx, cardIdx)) {
            setDraggedCoords({ col: colIdx, index: cardIdx });
        }
    };

    const handleDrop = (toColIdx: number) => {
        if (draggedCoords && canDrop(toColIdx, columns[draggedCoords.col][draggedCoords.index])) {
            saveHistory();
            const fromCol = [...columns[draggedCoords.col]];
            const toCol = [...columns[toColIdx]];
            const cards = fromCol.splice(draggedCoords.index);
            
            if (fromCol.length > 0) fromCol[fromCol.length - 1].faceUp = true;
            toCol.push(...cards);

            const newColumns = [...columns];
            newColumns[draggedCoords.col] = fromCol;
            newColumns[toColIdx] = toCol;
            
            setColumns(newColumns);
            setMoves(prev => prev + 1);
            setScore(prev => Math.max(0, prev - 1));
            
            checkSequence(newColumns, toColIdx);
        }
        setDraggedCoords(null);
        setDragOverCol(null);
    };

    const checkSequence = (currentCols: Card[][], colIdx: number) => {
        const col = currentCols[colIdx];
        if (col.length < 13) return;
        const last13 = col.slice(-13);
        if (last13[0].value !== 'K') return;
        
        const suit = last13[0].suit;
        const isComplete = last13.every((c, i) => c.suit === suit && c.valueIndex === 12 - i && c.faceUp);

        if (isComplete) {
            setTimeout(() => {
                const updatedCols = [...currentCols];
                updatedCols[colIdx] = updatedCols[colIdx].slice(0, -13);
                if (updatedCols[colIdx].length > 0) updatedCols[colIdx][updatedCols[colIdx].length - 1].faceUp = true;
                
                setColumns(updatedCols);
                setSequences(prev => prev + 1);
                setScore(prev => prev + 100);
                if (sequences + 1 === 8) setGameOver(true);
            }, 500);
        }
    };

    const dealFromStock = () => {
        if (stock.length === 0) return;
        if (columns.some(col => col.length === 0)) {
            alert('Remplissez toutes les colonnes vides avant de distribuer!');
            return;
        }
        saveHistory();
        const newStock = [...stock];
        const newCols = columns.map(col => [...col]);
        for (let i = 0; i < 10; i++) {
            const card = newStock.pop()!;
            card.faceUp = true;
            newCols[i].push(card);
        }
        setColumns(newCols);
        setStock(newStock);
        setMoves(prev => prev + 1);
    };

    const undo = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        
        const restoredColumns = last.columns.map((col: Card[], colIdx: number) => 
            col.map((card: Card, cardIdx: number) => {
                const currentCard = columns[colIdx]?.[cardIdx];
                const faceUp = (currentCard && currentCard.faceUp) ? true : card.faceUp;
                return {...card, faceUp};
            })
        );
        
        setColumns(restoredColumns);
        setStock(last.stock);
        setMoves(last.moves);
        setScore(last.score);
        setSequences(last.sequences);
        setHistory(prev => prev.slice(0, -1));
    };

    const evaluateMove = (fromCol: number, toCol: number, cardIndex: number, cardsToMove: Card[], currentCols: Card[][]) => {
        let score = 0;
        const fromColumn = currentCols[fromCol];
        const toColumn = currentCols[toCol];

        // 1. Uncovering a face-down card is excellent
        if (cardIndex > 0 && !fromColumn[cardIndex - 1].faceUp) {
            score += 100;
        }

        if (toColumn.length > 0) {
            const topCard = toColumn[toColumn.length - 1];
            const movingCard = cardsToMove[0];
            
            // 2. Same suit sequence building
            if (topCard.suit === movingCard.suit) {
                score += 50;
                let seqLen = 1;
                for (let i = toColumn.length - 1; i > 0; i--) {
                    if (toColumn[i].suit === toColumn[i-1].suit && toColumn[i].valueIndex === toColumn[i-1].valueIndex - 1) {
                        seqLen++;
                    } else break;
                }
                score += seqLen * 5;
            }
        }

        // 3. Empty column rules
        if (toColumn.length === 0) {
            if (cardsToMove[0].value === 'K') {
                score += 30; // Kings to empty columns
            } else if (cardsToMove.length >= 3) {
                score += 20; // Long sequences are fine
            } else if (cardIndex > 0 && !fromColumn[cardIndex - 1].faceUp) {
                score += 10; // Only to uncover
            } else {
                score -= 40; // Discourage moving small cards to empty columns
            }
        }

        // Prefer moving smaller sequences
        score += (13 - cardsToMove.length) * 2;

        if (cardIndex > 0) {
            const cardBelow = fromColumn[cardIndex - 1];
            const movingCard = cardsToMove[0];
            
            // 4. Penalty for breaking same-suit sequence
            if (cardBelow.faceUp && cardBelow.suit === movingCard.suit && cardBelow.valueIndex === movingCard.valueIndex + 1) {
                score -= 60; // Huge penalty
            }
            
            // 5. Penalty for useless lateral moves (e.g. moving a 6 from a red 7 to a black 7)
            if (toColumn.length > 0) {
                const targetTop = toColumn[toColumn.length - 1];
                if (cardBelow.faceUp && targetTop.valueIndex === cardBelow.valueIndex && targetTop.suit !== movingCard.suit) {
                    score -= 50;
                }
            }
        }

        // 6. Pointless whole column moves
        if (cardIndex === 0 && toColumn.length === 0) {
            score -= 1000;
        }

        return score;
    };

    const getHint = () => {
        setHintCoords([]);
        setHintTarget(null);

        const possibleMoves: { fromCol: number, toCol: number, cardIndex: number, score: number }[] = [];

        for (let fromCol = 0; fromCol < 10; fromCol++) {
            if (columns[fromCol].length === 0) continue;

            let startIndex = columns[fromCol].length - 1;
            while (startIndex > 0) {
                const current = columns[fromCol][startIndex];
                const prev = columns[fromCol][startIndex - 1];
                if (!prev.faceUp || prev.valueIndex !== current.valueIndex + 1 || prev.suit !== current.suit) break;
                startIndex--;
            }

            for (let k = startIndex; k < columns[fromCol].length; k++) {
                const cardsToMove = columns[fromCol].slice(k);
                for (let toCol = 0; toCol < 10; toCol++) {
                    if (fromCol === toCol) continue;
                    const toColCards = columns[toCol];
                    const canDropHere = toColCards.length === 0 || (toColCards[toColCards.length - 1].faceUp && toColCards[toColCards.length - 1].valueIndex === cardsToMove[0].valueIndex + 1);
                    
                    if (canDropHere) {
                        const score = evaluateMove(fromCol, toCol, k, cardsToMove, columns);
                        if (score > -500) { // filter out completely pointless moves like empty to empty
                            possibleMoves.push({ fromCol, toCol, cardIndex: k, score });
                        }
                    }
                }
            }
        }

        if (possibleMoves.length === 0) {
            if (stock.length > 0) alert('Aucun mouvement utile trouvé! Distribuez de nouvelles cartes.');
            else alert('Aucun mouvement possible!');
            return;
        }

        possibleMoves.sort((a, b) => b.score - a.score);
        const bestMove = possibleMoves[0];

        const srcCoords = [];
        for (let i = bestMove.cardIndex; i < columns[bestMove.fromCol].length; i++) {
            srcCoords.push({ col: bestMove.fromCol, index: i });
        }
        setHintCoords(srcCoords);
        setHintTarget(bestMove.toCol);

        setTimeout(() => {
            setHintCoords([]);
            setHintTarget(null);
        }, 2000);
    };

    return (
        <div className={styles.body}>
            <header className={styles.header}>
                <div className={styles.logo}>🕷️ Spider Solitaire</div>
                <Link href="/" className={styles.backBtn}>← Menu</Link>
            </header>

            <div className={styles.gameContainer}>
                <div className={styles.controlPanel}>
                    <div className={styles.stats}>
                        <div className={styles.stat}><div className={styles.statLabel}>Mouvements</div><div className={styles.statValue}>{moves}</div></div>
                        <div className={styles.stat}><div className={styles.statLabel}>Temps</div><div className={styles.statValue}>{formatTime(timeElapsed)}</div></div>
                        <div className={styles.stat}><div className={styles.statLabel}>Score</div><div className={styles.statValue}>{score}</div></div>
                        <div className={styles.stat}><div className={styles.statLabel}>Séquences</div><div className={styles.statValue}>{sequences}/8</div></div>
                    </div>
                    <div className={styles.controls}>
                        <button className={styles.btnSecondary} onClick={undo} disabled={history.length === 0}>↶ Annuler</button>
                        <button className={styles.btnSecondary} onClick={getHint}>💡 Indice</button>
                        <button className={styles.btnPrimary} onClick={() => setDifficulty(null)}>🎮 Nouveau Jeu</button>
                    </div>
                </div>

                <div className={styles.gameBoard}>
                    <div className={styles.tableau}>
                        {columns.map((col, colIdx) => (
                            <div key={colIdx} 
                                 className={`${styles.column} ${dragOverCol === colIdx ? styles.dragOver : ''} ${hintTarget === colIdx ? styles.hintTarget : ''}`}
                                 onDragOver={e => { e.preventDefault(); setDragOverCol(colIdx); }}
                                 onDragLeave={() => setDragOverCol(null)}
                                 onDrop={() => handleDrop(colIdx)}>
                                {col.map((card, cardIdx) => (
                                    <div key={card.id}
                                         draggable={canDrag(colIdx, cardIdx)}
                                         onDragStart={() => handleDragStart(colIdx, cardIdx)}
                                         className={`${styles.card} ${card.faceUp ? styles.faceUp : styles.faceDown} ${card.suit === 'hearts' || card.suit === 'diamonds' ? styles.red : ''} ${draggedCoords?.col === colIdx && cardIdx >= draggedCoords.index ? styles.dragging : ''} ${hintCoords.some(c => c.col === colIdx && c.index === cardIdx) ? styles.hintSource : ''}`}>
                                        {card.faceUp && (
                                            <>
                                                <div className={`${styles.cardCorner} ${styles.topLeft}`}>
                                                    <div>{card.value}</div>
                                                    <div>{SUIT_SYMBOLS[card.suit]}</div>
                                                </div>
                                                <div className={styles.cardPattern}>{SUIT_SYMBOLS[card.suit]}</div>
                                                <div className={`${styles.cardCorner} ${styles.bottomRight}`}>
                                                    <div>{card.value}</div>
                                                    <div>{SUIT_SYMBOLS[card.suit]}</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className={styles.stockContainer}>
                        <div className={styles.stockPile}>
                            {Array.from({ length: Math.ceil(stock.length / 10) }).map((_, i) => (
                                <div key={i} className={styles.stockDeck} onClick={i === Math.ceil(stock.length / 10) - 1 ? dealFromStock : undefined}>
                                    {i === Math.ceil(stock.length / 10) - 1 && <div className={styles.stockCount}>{stock.length}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {difficulty === null && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Choisir la Difficulté</h2>
                        <div className={styles.difficultyOptions}>
                            <button className={styles.difficultyBtn} onClick={() => initGame(1)}><span>🕷️ Facile</span><span>1 couleur</span></button>
                            <button className={styles.difficultyBtn} onClick={() => initGame(2)}><span>🕷️🕷️ Moyen</span><span>2 couleurs</span></button>
                            <button className={styles.difficultyBtn} onClick={() => initGame(4)}><span>🕷️🕷️🕷️🕷️ Difficile</span><span>4 couleurs</span></button>
                        </div>
                    </div>
                </div>
            )}

            {gameOver && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Félicitations!</h2>
                        <div className={styles.statValue} style={{fontSize: '4rem'}}>{score}</div>
                        <p>Vous avez terminé le jeu!</p>
                        <button className={styles.btnPrimary} style={{marginTop: '20px', width: '100%'}} onClick={() => setDifficulty(null)}>Jouer Encore</button>
                    </div>
                </div>
            )}
        </div>
    );
}
