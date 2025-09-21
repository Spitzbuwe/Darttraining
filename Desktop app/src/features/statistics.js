const fs = require('fs');
const path = require('path');

class Statistics {
    constructor() {
        this.statsFile = path.join(__dirname, '../../data/statistics.json');
        this.ensureDataDirectory();
        this.stats = this.loadStats();
    }

    ensureDataDirectory() {
        const dataDir = path.dirname(this.statsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    loadStats() {
        try {
            if (fs.existsSync(this.statsFile)) {
                const data = fs.readFileSync(this.statsFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
        }

        return {
            games: [],
            players: {},
            overall: {
                totalGames: 0,
                totalDarts: 0,
                totalScore: 0,
                bestAverage: 0,
                bestScore: 0,
                checkoutRate: 0
            }
        };
    }

    saveStats() {
        try {
            fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            console.error('Fehler beim Speichern der Statistiken:', error);
        }
    }

    recordGame(gameData) {
        const game = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            mode: gameData.mode,
            players: gameData.players.map(player => ({
                id: player.id,
                name: player.name,
                finalScore: player.score,
                darts: player.darts.length,
                average: player.average,
                bestScore: Math.max(...player.darts.map(dart => dart.score)),
                checkout: player.checkout
            })),
            winner: gameData.winner,
            duration: gameData.duration,
            totalDarts: gameData.players.reduce((sum, player) => sum + player.darts.length, 0)
        };

        this.stats.games.push(game);
        this.updatePlayerStats(game);
        this.updateOverallStats();
        this.saveStats();

        console.log(`📊 Spiel gespeichert: ${game.mode} - ${game.players.length} Spieler`);
        return game;
    }

    updatePlayerStats(game) {
        game.players.forEach(playerData => {
            const playerId = playerData.id;
            
            if (!this.stats.players[playerId]) {
                this.stats.players[playerId] = {
                    id: playerId,
                    name: playerData.name,
                    games: 0,
                    wins: 0,
                    totalDarts: 0,
                    totalScore: 0,
                    bestAverage: 0,
                    bestScore: 0,
                    checkoutRate: 0,
                    averages: [],
                    scores: []
                };
            }

            const player = this.stats.players[playerId];
            player.games++;
            player.totalDarts += playerData.darts;
            player.totalScore += playerData.finalScore;
            player.averages.push(playerData.average);
            player.scores.push(playerData.bestScore);

            if (playerData.average > player.bestAverage) {
                player.bestAverage = playerData.average;
            }

            if (playerData.bestScore > player.bestScore) {
                player.bestScore = playerData.bestScore;
            }

            // Berechne Durchschnitt aller Durchschnitte
            player.overallAverage = player.averages.reduce((sum, avg) => sum + avg, 0) / player.averages.length;
        });
    }

    updateOverallStats() {
        const overall = this.stats.overall;
        overall.totalGames = this.stats.games.length;
        overall.totalDarts = this.stats.games.reduce((sum, game) => sum + game.totalDarts, 0);
        overall.totalScore = this.stats.games.reduce((sum, game) => 
            sum + game.players.reduce((playerSum, player) => playerSum + player.finalScore, 0), 0);

        // Beste Durchschnitte aller Spieler
        const allAverages = Object.values(this.stats.players)
            .map(player => player.bestAverage)
            .filter(avg => avg > 0);
        
        overall.bestAverage = allAverages.length > 0 ? Math.max(...allAverages) : 0;

        // Bester Score aller Spieler
        const allScores = Object.values(this.stats.players)
            .map(player => player.bestScore)
            .filter(score => score > 0);
        
        overall.bestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    }

    getPlayerStats(playerId) {
        return this.stats.players[playerId] || null;
    }

    getAllPlayers() {
        return Object.values(this.stats.players);
    }

    getGameHistory(limit = 50) {
        return this.stats.games
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    getOverallStats() {
        return this.stats.overall;
    }

    getModeStats(mode) {
        const modeGames = this.stats.games.filter(game => game.mode === mode);
        
        if (modeGames.length === 0) {
            return null;
        }

        const totalDarts = modeGames.reduce((sum, game) => sum + game.totalDarts, 0);
        const totalScore = modeGames.reduce((sum, game) => 
            sum + game.players.reduce((playerSum, player) => playerSum + player.finalScore, 0), 0);

        return {
            mode: mode,
            games: modeGames.length,
            totalDarts: totalDarts,
            totalScore: totalScore,
            averagePerGame: totalDarts / modeGames.length,
            averageScore: totalScore / modeGames.length
        };
    }

    getTopPlayers(limit = 10) {
        return Object.values(this.stats.players)
            .sort((a, b) => b.overallAverage - a.overallAverage)
            .slice(0, limit);
    }

    getRecentGames(limit = 10) {
        return this.stats.games
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    exportStats(format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `statistics_${timestamp}.${format}`;
        const filepath = path.join(__dirname, '../../exports', filename);

        // Stelle sicher, dass das Export-Verzeichnis existiert
        const exportDir = path.dirname(filepath);
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        if (format === 'json') {
            fs.writeFileSync(filepath, JSON.stringify(this.stats, null, 2));
        } else if (format === 'csv') {
            this.exportToCSV(filepath);
        }

        console.log(`📊 Statistiken exportiert: ${filepath}`);
        return filepath;
    }

    exportToCSV(filepath) {
        const csvData = [];
        
        // Header
        csvData.push('Game ID,Timestamp,Mode,Player,Final Score,Darts,Average,Best Score,Checkout');
        
        // Spiele
        this.stats.games.forEach(game => {
            game.players.forEach(player => {
                csvData.push([
                    game.id,
                    game.timestamp,
                    game.mode,
                    player.name,
                    player.finalScore,
                    player.darts,
                    player.average,
                    player.bestScore,
                    player.checkout || 0
                ].join(','));
            });
        });

        fs.writeFileSync(filepath, csvData.join('\n'));
    }

    clearStats() {
        this.stats = {
            games: [],
            players: {},
            overall: {
                totalGames: 0,
                totalDarts: 0,
                totalScore: 0,
                bestAverage: 0,
                bestScore: 0,
                checkoutRate: 0
            }
        };
        this.saveStats();
        console.log('🗑️ Alle Statistiken gelöscht');
    }

    getPlayerRanking() {
        const players = Object.values(this.stats.players);
        
        return players.map(player => ({
            ...player,
            rank: 0 // Wird nach dem Sortieren gesetzt
        }))
        .sort((a, b) => b.overallAverage - a.overallAverage)
        .map((player, index) => ({
            ...player,
            rank: index + 1
        }));
    }

    getGameModeDistribution() {
        const distribution = {};
        
        this.stats.games.forEach(game => {
            distribution[game.mode] = (distribution[game.mode] || 0) + 1;
        });

        return distribution;
    }

    getDailyStats(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentGames = this.stats.games.filter(game => 
            new Date(game.timestamp) >= cutoffDate
        );

        return {
            period: `${days} Tage`,
            games: recentGames.length,
            totalDarts: recentGames.reduce((sum, game) => sum + game.totalDarts, 0),
            averageGamesPerDay: recentGames.length / days,
            mostPlayedMode: this.getMostPlayedMode(recentGames)
        };
    }

    getMostPlayedMode(games = this.stats.games) {
        const modeCount = {};
        games.forEach(game => {
            modeCount[game.mode] = (modeCount[game.mode] || 0) + 1;
        });

        return Object.entries(modeCount)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Keine Spiele';
    }
}

module.exports = Statistics;
