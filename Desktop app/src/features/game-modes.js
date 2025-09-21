class GameModes {
    constructor() {
        this.modes = {
            '501': {
                name: '501',
                description: 'Klassisches 501-Spiel',
                startScore: 501,
                rules: {
                    doubleIn: false,
                    doubleOut: true,
                    maxDarts: 3
                },
                calculateScore: (currentScore, dartScore) => {
                    return Math.max(0, currentScore - dartScore);
                },
                isWinningScore: (score) => score === 0,
                isValidFinish: (score, dartScore) => {
                    return dartScore === score && score % 2 === 0; // Double out
                }
            },
            '301': {
                name: '301',
                description: 'Schnelles 301-Spiel',
                startScore: 301,
                rules: {
                    doubleIn: false,
                    doubleOut: true,
                    maxDarts: 3
                },
                calculateScore: (currentScore, dartScore) => {
                    return Math.max(0, currentScore - dartScore);
                },
                isWinningScore: (score) => score === 0,
                isValidFinish: (score, dartScore) => {
                    return dartScore === score && score % 2 === 0;
                }
            },
            'cricket': {
                name: 'Cricket',
                description: 'Cricket-Spiel',
                startScore: 0,
                rules: {
                    targets: [20, 19, 18, 17, 16, 15, 25], // Bullseye
                    maxHits: 3,
                    maxDarts: 3
                },
                calculateScore: (currentScore, dartScore, segment) => {
                    // Cricket-Logik implementieren
                    return currentScore;
                },
                isWinningScore: (score) => false, // Cricket hat andere Gewinnbedingungen
                isValidFinish: (score, dartScore) => false
            },
            'around-the-clock': {
                name: 'Around the Clock',
                description: 'Rund um die Uhr',
                startScore: 0,
                rules: {
                    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25],
                    maxDarts: 3
                },
                calculateScore: (currentScore, dartScore, segment) => {
                    // Around the Clock-Logik
                    return currentScore;
                },
                isWinningScore: (score) => score >= 25,
                isValidFinish: (score, dartScore) => false
            },
            'practice': {
                name: 'Practice',
                description: 'Übungsmodus',
                startScore: 0,
                rules: {
                    targetSegment: null, // Beliebig
                    maxDarts: 3
                },
                calculateScore: (currentScore, dartScore) => {
                    return currentScore + dartScore;
                },
                isWinningScore: (score) => false,
                isValidFinish: (score, dartScore) => false
            }
        };
    }

    getMode(modeName) {
        return this.modes[modeName] || this.modes['501'];
    }

    getAllModes() {
        return Object.keys(this.modes).map(key => ({
            id: key,
            ...this.modes[key]
        }));
    }

    validateDart(mode, currentScore, dartScore, segment) {
        const modeConfig = this.getMode(mode);
        
        if (!modeConfig) {
            return { valid: false, reason: 'Ungültiger Spielmodus' };
        }

        // Grundlegende Validierung
        if (dartScore < 0 || dartScore > 60) {
            return { valid: false, reason: 'Ungültiger Score' };
        }

        // Modus-spezifische Validierung
        switch (mode) {
            case '501':
            case '301':
                return this.validate501Dart(currentScore, dartScore, modeConfig);
            case 'cricket':
                return this.validateCricketDart(currentScore, dartScore, segment, modeConfig);
            case 'around-the-clock':
                return this.validateAroundTheClockDart(currentScore, dartScore, segment, modeConfig);
            case 'practice':
                return { valid: true, reason: 'Practice-Modus' };
            default:
                return { valid: true, reason: 'Standard-Validierung' };
        }
    }

    validate501Dart(currentScore, dartScore, modeConfig) {
        // Double Out Regel
        if (currentScore - dartScore === 0) {
            if (modeConfig.rules.doubleOut) {
                // Prüfe ob es ein Double ist
                const isDouble = dartScore % 2 === 0 && dartScore <= 40;
                if (!isDouble) {
                    return { valid: false, reason: 'Muss mit Double beendet werden' };
                }
            }
        }

        // Bust-Regel
        if (currentScore - dartScore < 0) {
            return { valid: false, reason: 'Bust - Score zu hoch' };
        }

        // 1-Punkt-Regel
        if (currentScore - dartScore === 1) {
            return { valid: false, reason: 'Bust - 1 Punkt übrig' };
        }

        return { valid: true, reason: 'Gültiger Wurf' };
    }

    validateCricketDart(currentScore, dartScore, segment, modeConfig) {
        // Cricket-spezifische Validierung
        const validSegments = modeConfig.rules.targets;
        const segmentNum = parseInt(segment);
        
        if (!validSegments.includes(segmentNum) && segmentNum !== 25) {
            return { valid: false, reason: 'Ungültiges Segment für Cricket' };
        }

        return { valid: true, reason: 'Gültiger Cricket-Wurf' };
    }

    validateAroundTheClockDart(currentScore, dartScore, segment, modeConfig) {
        const sequence = modeConfig.rules.sequence;
        const segmentNum = parseInt(segment);
        
        if (!sequence.includes(segmentNum)) {
            return { valid: false, reason: 'Ungültiges Segment für Around the Clock' };
        }

        return { valid: true, reason: 'Gültiger Around the Clock-Wurf' };
    }

    calculateCheckout(score) {
        // Bekannte Checkout-Kombinationen
        const checkouts = {
            170: ['T20', 'T20', 'Bull'],
            167: ['T20', 'T19', 'Bull'],
            164: ['T20', 'T18', 'Bull'],
            161: ['T20', 'T17', 'Bull'],
            160: ['T20', 'T20', 'D20'],
            158: ['T20', 'T20', 'D19'],
            157: ['T20', 'T19', 'D20'],
            156: ['T20', 'T20', 'D18'],
            155: ['T20', 'T19', 'D19'],
            154: ['T20', 'T18', 'D20'],
            153: ['T20', 'T19', 'D18'],
            152: ['T20', 'T20', 'D16'],
            151: ['T20', 'T17', 'D20'],
            150: ['T20', 'T18', 'D18'],
            149: ['T20', 'T19', 'D16'],
            148: ['T20', 'T20', 'D14'],
            147: ['T20', 'T17', 'D18'],
            146: ['T20', 'T18', 'D16'],
            145: ['T20', 'T19', 'D14'],
            144: ['T20', 'T20', 'D12'],
            143: ['T20', 'T17', 'D16'],
            142: ['T20', 'T18', 'D14'],
            141: ['T20', 'T19', 'D12'],
            140: ['T20', 'T20', 'D10'],
            139: ['T20', 'T13', 'D20'],
            138: ['T20', 'T18', 'D12'],
            137: ['T20', 'T19', 'D10'],
            136: ['T20', 'T20', 'D8'],
            135: ['T20', 'T17', 'D12'],
            134: ['T20', 'T18', 'D10'],
            133: ['T20', 'T19', 'D8'],
            132: ['T20', 'T20', 'D6'],
            131: ['T20', 'T13', 'D16'],
            130: ['T20', 'T18', 'D8'],
            129: ['T20', 'T19', 'D6'],
            128: ['T20', 'T20', 'D4'],
            127: ['T20', 'T17', 'D8'],
            126: ['T20', 'T18', 'D6'],
            125: ['T20', 'T19', 'D4'],
            124: ['T20', 'T20', 'D2'],
            123: ['T20', 'T13', 'D12'],
            122: ['T20', 'T18', 'D4'],
            121: ['T20', 'T19', 'D2'],
            120: ['T20', 'S20', 'D20'],
            119: ['T20', 'T19', 'D1'],
            118: ['T20', 'T18', 'D2'],
            117: ['T20', 'T17', 'D3'],
            116: ['T20', 'T16', 'D4'],
            115: ['T20', 'T15', 'D5'],
            114: ['T20', 'T14', 'D6'],
            113: ['T20', 'T13', 'D7'],
            112: ['T20', 'T12', 'D8'],
            111: ['T20', 'T11', 'D9'],
            110: ['T20', 'T10', 'D10'],
            109: ['T20', 'T9', 'D11'],
            108: ['T20', 'T8', 'D12'],
            107: ['T20', 'T7', 'D13'],
            106: ['T20', 'T6', 'D14'],
            105: ['T20', 'T5', 'D15'],
            104: ['T20', 'T4', 'D16'],
            103: ['T20', 'T3', 'D17'],
            102: ['T20', 'T2', 'D18'],
            101: ['T20', 'T1', 'D19'],
            100: ['T20', 'S20', 'D20']
        };

        return checkouts[score] || null;
    }

    getGameStatistics(players, mode) {
        const stats = {
            totalDarts: 0,
            totalScore: 0,
            averages: [],
            bestScore: 0,
            worstScore: 0,
            checkoutRate: 0,
            doubleRate: 0,
            tripleRate: 0
        };

        players.forEach(player => {
            stats.totalDarts += player.darts.length;
            stats.totalScore += player.darts.reduce((sum, dart) => sum + dart.score, 0);
            
            if (player.darts.length > 0) {
                const average = stats.totalScore / player.darts.length;
                stats.averages.push(average);
            }

            player.darts.forEach(dart => {
                if (dart.score > stats.bestScore) {
                    stats.bestScore = dart.score;
                }
                if (dart.score < stats.worstScore || stats.worstScore === 0) {
                    stats.worstScore = dart.score;
                }
            });
        });

        stats.overallAverage = stats.averages.length > 0 
            ? stats.averages.reduce((sum, avg) => sum + avg, 0) / stats.averages.length 
            : 0;

        return stats;
    }
}

module.exports = GameModes;
