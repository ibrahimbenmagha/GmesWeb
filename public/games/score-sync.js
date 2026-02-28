
// High Score Reporting Script
(function() {
    const gameId = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();
    
    // Original localStorage.setItem
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        
        // Detect high score updates
        if (key.includes('score') || key.includes('best')) {
            const score = parseInt(value);
            if (!isNaN(score)) {
                fetch('/api/games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: gameId, score: score })
                }).catch(err => console.error('Failed to report score:', err));
            }
        }
    };
})();
