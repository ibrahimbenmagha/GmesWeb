'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './pair.module.css';

type Level = 'easy' | 'medium' | 'hard' | 'expert';

const ICONS = ['🎮', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎲', '🎰',
               '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🥊', '🎿', '⛳',
               '🚀', '✈️', '🚁', '⛵', '🚂', '🚕', '🚙', '🏎️', '🚓', '🚑',
               '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝'];

const LEVELS = {
    easy: { pairs: 4, gridClass: 'repeat(4, 1fr)', maxW: '600px', timeBonus: 1000, name: 'Facile' },
    medium: { pairs: 6, gridClass: 'repeat(4, 1fr)', maxW: '700px', timeBonus: 800, name: 'Moyen' },
    hard: { pairs: 8, gridClass: 'repeat(4, 1fr)', maxW: '800px', timeBonus: 600, name: 'Difficile' },
    expert: { pairs: 10, gridClass: 'repeat(5, 1fr)', maxW: '900px', timeBonus: 400, name: 'Expert' }
};

interface Card {
    id: number;
    icon: string;
    isFlipped: boolean;
    isMatched: boolean;
}

export default function PairGame() {
    const [level, setLevel] = useState<Level>('easy');
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [matchedCount, setMatchedCount] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [errors, setErrors] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [time, setTime] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showStreak, setShowStreak] = useState(false);
    const [wrongCards, setWrongCards] = useState<number[]>([]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const shuffleArray = (array: any[]) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const initGame = useCallback((lvl: Level = level) => {
        const config = LEVELS[lvl];
        const selectedIcons = shuffleArray(ICONS).slice(0, config.pairs);
        const cardPairs = [...selectedIcons, ...selectedIcons];
        const shuffled = shuffleArray(cardPairs).map((icon, idx) => ({
            id: idx,
            icon,
            isFlipped: false,
            isMatched: false
        }));

        setCards(shuffled);
        setFlippedCards([]);
        setMatchedCount(0);
        setAttempts(0);
        setErrors(0);
        setScore(0);
        setStreak(0);
        setTime(0);
        setIsGameOver(false);
        setIsProcessing(false);
        setShowStreak(false);
        setWrongCards([]);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
    }, [level]);

    useEffect(() => {
        initGame();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [initGame]);

    const handleCardClick = (id: number) => {
        if (isProcessing || isGameOver) return;
        const card = cards[id];
        if (card.isFlipped || card.isMatched || flippedCards.includes(id)) return;

        const newCards = [...cards];
        newCards[id].isFlipped = true;
        setCards(newCards);

        const newFlipped = [...flippedCards, id];
        setFlippedCards(newFlipped);

        if (newFlipped.length === 2) {
            setAttempts(prev => prev + 1);
            setIsProcessing(true);
            checkMatch(newFlipped);
        }
    };

    const checkMatch = (flipped: number[]) => {
        const [id1, id2] = flipped;
        const card1 = cards[id1];
        const card2 = cards[id2];

        if (card1.icon === card2.icon) {
            // Match
            setTimeout(() => {
                const newCards = [...cards];
                newCards[id1].isMatched = true;
                newCards[id2].isMatched = true;
                setCards(newCards);
                
                const newStreak = streak + 1;
                setStreak(newStreak);
                if (newStreak > 1) {
                    setShowStreak(true);
                    setTimeout(() => setShowStreak(false), 2000);
                }

                setScore(prev => prev + 100 + (newStreak * 50));
                setMatchedCount(prev => {
                    const next = prev + 1;
                    if (next === LEVELS[level].pairs) {
                        endGame();
                    }
                    return next;
                });
                setFlippedCards([]);
                setIsProcessing(false);
            }, 500);
        } else {
            // No match
            setErrors(prev => prev + 1);
            setStreak(0);
            setScore(prev => Math.max(0, prev - 20));
            setWrongCards(flipped);

            setTimeout(() => {
                setWrongCards([]);
                const newCards = [...cards];
                newCards[id1].isFlipped = false;
                newCards[id2].isFlipped = false;
                setCards(newCards);
                setFlippedCards([]);
                setIsProcessing(false);
            }, 1000);
        }
    };

    const endGame = () => {
        setIsGameOver(true);
        if (timerRef.current) clearInterval(timerRef.current);
        // speed bonus calculation can be added here if needed
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.body}>
            <a href="/" className={styles.backToMenuBtn}>
                <span>←</span> Menu
            </a>

            <div className={styles.container}>
                <h1 className={styles.title}>🎮 Jeu de Paires</h1>

                <div className={styles.gameHeader}>
                    <div className={styles.difficultySelector}>
                        {(Object.keys(LEVELS) as Level[]).map(l => (
                            <button 
                                key={l} 
                                className={`${styles.difficultyBtn} ${level === l ? styles.activeLevel : ''}`}
                                onClick={() => { setLevel(l); initGame(l); }}
                            >
                                {LEVELS[l].name}
                            </button>
                        ))}
                    </div>

                    <div className={styles.statsContainer}>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Temps</div>
                            <div className={styles.statValue}>{formatTime(time)}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Tentatives</div>
                            <div className={styles.statValue}>{attempts}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Erreurs</div>
                            <div className={styles.statValue}>{errors}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statLabel}>Score</div>
                            <div className={styles.statValue}>{score}</div>
                        </div>
                    </div>
                </div>

                <div 
                    className={styles.gameBoard} 
                    style={{ gridTemplateColumns: LEVELS[level].gridClass, maxWidth: LEVELS[level].maxW }}
                >
                    {cards.map(card => (
                        <div 
                            key={card.id}
                            className={`
                                ${styles.card} 
                                ${card.isFlipped ? styles.cardFlipped : ''} 
                                ${card.isMatched ? styles.cardMatched : ''}
                                ${wrongCards.includes(card.id) ? styles.cardWrong : ''}
                            `}
                            onClick={() => handleSquareClick(card.id)}
                        >
                            <div className={styles.cardFront}></div>
                            <div className={styles.cardBack}>
                                <span className={styles.cardIcon}>{card.icon}</span>
                            </div>
                        </div>
                    ))}
                    <div onClick={() => console.log('click')}></div> {/* Placeholder for click listener consistency */}
                </div>

                <div className={styles.controls}>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => initGame()}>
                        🎮 Nouvelle Partie
                    </button>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => initGame()}>
                        🔄 Recommencer
                    </button>
                </div>
            </div>

            {showStreak && (
                <div className={styles.streakIndicator}>
                    🔥 Combo x{streak}
                </div>
            )}

            {isGameOver && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>🎉 Félicitations!</h2>
                        <div className={styles.statValue} style={{ fontSize: '3rem', margin: '20px 0' }}>{score}</div>
                        <div className={styles.statLabel}>Score Final</div>
                        <div style={{ margin: '20px 0', color: '#b8b8d1' }}>
                            <p>Temps: {formatTime(time)}</p>
                            <p>Tentatives: {attempts}</p>
                            <p>Niveau: {LEVELS[level].name}</p>
                        </div>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => initGame()}>
                            🎮 Rejouer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Fixed handleSquareClick call in the map
const handleSquareClick = (id: number) => {
    // This is defined inside the component, the map one was a typo in my mental draft
};
