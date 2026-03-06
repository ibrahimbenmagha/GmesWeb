'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './yahtzee.module.css';

type Category = 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes' |
                'threeOfKind' | 'fourOfKind' | 'fullHouse' | 
                'smallStraight' | 'largeStraight' | 'yahtzee' | 'chance';

const CATEGORIES: { id: Category; name: string }[] = [
    { id: 'ones', name: '⚀ As (1)' },
    { id: 'twos', name: '⚁ Deux (2)' },
    { id: 'threes', name: '⚂ Trois (3)' },
    { id: 'fours', name: '⚃ Quatre (4)' },
    { id: 'fives', name: '⚄ Cinq (5)' },
    { id: 'sixes', name: '⚅ Six (6)' },
    { id: 'threeOfKind', name: '🎯 Brelan' },
    { id: 'fourOfKind', name: '🎯 Carré' },
    { id: 'fullHouse', name: '🏠 Full' },
    { id: 'smallStraight', name: '📏 Petite Suite' },
    { id: 'largeStraight', name: '📐 Grande Suite' },
    { id: 'yahtzee', name: '⭐ Yahtzee' },
    { id: 'chance', name: '🎰 Chance' }
];

export default function Yahtzee() {
    const [dice, setDice] = useState<number[]>([1, 1, 1, 1, 1]);
    const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);
    const [rollsLeft, setRollsLeft] = useState(3);
    const [scores, setScores] = useState<Partial<Record<Category, number>>>({});
    const [isRolling, setIsRolling] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const toggleLock = (index: number) => {
        if (rollsLeft < 3 && !isRolling) {
            const newLocked = [...locked];
            newLocked[index] = !newLocked[index];
            setLocked(newLocked);
        }
    };

    const roll = () => {
        if (rollsLeft <= 0 || isRolling) return;
        setIsRolling(true);
        setTimeout(() => {
            setDice(prev => prev.map((d, i) => locked[i] ? d : Math.floor(Math.random() * 6) + 1));
            setRollsLeft(prev => prev - 1);
            setIsRolling(false);
        }, 500);
    };

    const calculateScore = (category: Category, currentDice: number[]): number => {
        const counts: Record<number, number> = {};
        let sum = 0;
        currentDice.forEach(d => {
            counts[d] = (counts[d] || 0) + 1;
            sum += d;
        });

        const values = Object.values(counts);
        const sortedUnique = [...new Set(currentDice)].sort((a, b) => a - b).join('');

        switch (category) {
            case 'ones': return (counts[1] || 0) * 1;
            case 'twos': return (counts[2] || 0) * 2;
            case 'threes': return (counts[3] || 0) * 3;
            case 'fours': return (counts[4] || 0) * 4;
            case 'fives': return (counts[5] || 0) * 5;
            case 'sixes': return (counts[6] || 0) * 6;
            case 'threeOfKind': return values.some(v => v >= 3) ? sum : 0;
            case 'fourOfKind': return values.some(v => v >= 4) ? sum : 0;
            case 'fullHouse': return (values.includes(3) && values.includes(2)) ? 25 : 0;
            case 'smallStraight': return /1234|2345|3456/.test(sortedUnique) ? 30 : 0;
            case 'largeStraight': return /12345|23456/.test(sortedUnique) ? 40 : 0;
            case 'yahtzee': return values.includes(5) ? 50 : 0;
            case 'chance': return sum;
            default: return 0;
        }
    };

    const selectCategory = (category: Category) => {
        if (scores[category] !== undefined || rollsLeft === 3 || isRolling) return;
        
        const score = calculateScore(category, dice);
        const newScores = { ...scores, [category]: score };
        setScores(newScores);

        // Reset turn
        setRollsLeft(3);
        setLocked([false, false, false, false, false]);
        setDice([1, 1, 1, 1, 1]);

        if (Object.keys(newScores).length === 13) {
            setGameOver(true);
        }
    };

    const upperScore = CATEGORIES.slice(0, 6).reduce((sum, cat) => sum + (scores[cat.id] || 0), 0);
    const bonus = upperScore >= 63 ? 35 : 0;
    const lowerScore = CATEGORIES.slice(6).reduce((sum, cat) => sum + (scores[cat.id] || 0), 0);
    const totalScore = upperScore + bonus + lowerScore;

    const renderDiceDots = (value: number) => {
        const dots = Array(9).fill(null);
        const patterns: Record<number, number[]> = {
            1: [4],
            2: [0, 8],
            3: [0, 4, 8],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8]
        };
        return dots.map((_, i) => (
            <div key={i} className={styles.dot} style={{ visibility: patterns[value]?.includes(i) ? 'visible' : 'hidden' }}></div>
        ));
    };

    return (
        <div className={styles.body}>
            <a href="/" className={styles.backBtn} onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>← Menu</a>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.logo}>🎲 Yahtzee Master</h1>
                    <p className={styles.subtitle}>Lancez les dés et marquez un maximum de points!</p>
                </header>

                <div className={styles.gameArea}>
                    <div className={styles.diceSection}>
                        <h2 className={styles.sectionTitle}>🎲 Vos Dés</h2>
                        <div className={styles.diceContainer}>
                            {dice.map((d, i) => (
                                <div key={i} 
                                     className={`${styles.dice} ${locked[i] ? styles.diceLocked : ''} ${isRolling && !locked[i] ? styles.diceRolling : ''}`}
                                     onClick={() => toggleLock(i)}>
                                    {renderDiceDots(d)}
                                    {locked[i] && <div className={styles.lockIndicator}>🔒</div>}
                                </div>
                            ))}
                        </div>
                        <p className={styles.rollsRemaining}>Lancers restants: <span>{rollsLeft}</span></p>
                        <div className={styles.controls}>
                            <button className={styles.btn} onClick={roll} disabled={rollsLeft === 0 || isRolling}>🎲 Lancer</button>
                            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setScores({}); setRollsLeft(3); setLocked([false,false,false,false,false]); setDice([1,1,1,1,1]); setGameOver(false); }}>🔄 Nouveau</button>
                        </div>
                    </div>

                    <div className={styles.scorecard}>
                        <h2 className={styles.sectionTitle}>📊 Scores</h2>
                        <div className={styles.scoreTable}>
                            {CATEGORIES.slice(0, 6).map(cat => (
                                <div key={cat.id} 
                                     className={`${styles.scoreRow} ${scores[cat.id] !== undefined ? styles.scored : (rollsLeft < 3 ? styles.preview : '')}`}
                                     onClick={() => selectCategory(cat.id)}>
                                    <span>{cat.name}</span>
                                    <span>{scores[cat.id] ?? (rollsLeft < 3 ? calculateScore(cat.id, dice) : '-')}</span>
                                </div>
                            ))}
                            <div className={styles.scoreRow} style={{cursor: 'default'}}>
                                <span>🎁 Bonus (≥63)</span>
                                <span>{bonus}</span>
                            </div>
                            <div className={styles.divider}></div>
                            {CATEGORIES.slice(6).map(cat => (
                                <div key={cat.id} 
                                     className={`${styles.scoreRow} ${scores[cat.id] !== undefined ? styles.scored : (rollsLeft < 3 ? styles.preview : '')}`}
                                     onClick={() => selectCategory(cat.id)}>
                                    <span>{cat.name}</span>
                                    <span>{scores[cat.id] ?? (rollsLeft < 3 ? calculateScore(cat.id, dice) : '-')}</span>
                                </div>
                            ))}
                            <div className={`${styles.scoreRow} ${styles.totalRow}`}>
                                <span>🏆 TOTAL</span>
                                <span>{totalScore}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {gameOver && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>🏆 Partie Terminée!</h2>
                        <div style={{fontSize: '3rem', margin: '20px 0', color: '#ffd700'}}>{totalScore}</div>
                        <p>Félicitations!</p>
                        <button className={styles.btn} style={{marginTop: '20px'}} onClick={() => { setScores({}); setRollsLeft(3); setLocked([false,false,false,false,false]); setDice([1,1,1,1,1]); setGameOver(false); }}>Rejouer</button>
                    </div>
                </div>
            )}
        </div>
    );
}
