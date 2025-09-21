class CustomGameModes {
    constructor() {
        this.modes = {
            '501-double-out': {
                name: '501 mit Double Out',
                description: '501-Spiel - muss mit Double beendet werden',
                startScore: 501,
                rules: {
                    doubleIn: false,
                    doubleOut: true,
                    maxDarts: 3,
                    trainingMode: true,
                    showCheckout: true,
                    showAverage: true
                },
                calculateScore: (currentScore, dartScore) => {
                    return Math.max(0, currentScore - dartScore);
                },
                isWinningScore: (score) => score === 0,
                isValidFinish: (score, dartScore) => {
                    return dartScore === score && score % 2 === 0;
                }
            },
            'leiter-123': {
                name: 'Leiter 1-2-3',
                description: 'Segmente 1, 2, 3 in Reihenfolge treffen',
                startScore: 0,
                rules: {
                    sequence: [1, 2, 3],
                    maxDarts: 3,
                    trainingMode: true,
                    showProgress: true,
                    showTime: true,
                    currentStep: 0
                },
                calculateScore: (currentScore, dartScore, segment) => {
                    const sequence = this.modes['leiter-123'].rules.sequence;
                    const segmentNum = parseInt(segment);
                    const currentStep = this.modes['leiter-123'].rules.currentStep;
                    
                    if (segmentNum === sequence[currentStep]) {
                        this.modes['leiter-123'].rules.currentStep++;
                        return currentScore + 1;
                    }
                    return currentScore;
                },
                isWinningScore: (score) => score >= 3,
                isValidFinish: (score, dartScore) => false
            },
            'single-20-17': {
                name: 'Single 20-17',
                description: 'Nur Single-Segmente 20, 19, 18, 17 treffen',
                startScore: 0,
                rules: {
                    targets: [20, 19, 18, 17],
                    maxDarts: 3,
                    trainingMode: true,
                    showTargets: true,
                    showHits: true,
                    onlySingles: true
                },
                calculateScore: (currentScore, dartScore, segment, multiplier) => {
                    const segmentNum = parseInt(segment);
                    const targets = this.modes['single-20-17'].rules.targets;
                    
                    if (targets.includes(segmentNum) && multiplier === 'single') {
                        return currentScore + 1;
                    }
                    return currentScore;
                },
                isWinningScore: (score) => score >= 10,
                isValidFinish: (score, dartScore) => false
            },
            'alle-double': {
                name: 'Alle Double',
                description: 'Alle Double-Segmente treffen',
                startScore: 0,
                rules: {
                    targets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25],
                    maxDarts: 3,
                    trainingMode: true,
                    showDoubles: true,
                    showAccuracy: true,
                    onlyDoubles: true
                },
                calculateScore: (currentScore, dartScore, segment, multiplier) => {
                    const segmentNum = parseInt(segment);
                    const targets = this.modes['alle-double'].rules.targets;
                    
                    if (targets.includes(segmentNum) && multiplier === 'double') {
                        return currentScore + 1;
                    }
                    return currentScore;
                },
                isWinningScore: (score) => score >= 21, // Alle 21 Segmente
                isValidFinish: (score, dartScore) => false
            },
            '170-checkout-p5': {
                name: '170 Checkout (P5)',
                description: 'Fester Start bei 170 Punkten, Double-Out-Pflicht und automatischer Reset auf 170',
                startScore: 170,
                rules: {
                    doubleIn: false,
                    doubleOut: true,
                    maxDarts: 3,
                    trainingMode: true,
                    showCheckout: true,
                    showAverage: true,
                    autoReset: true,
                    resetScore: 170
                },
                calculateScore: (currentScore, dartScore) => {
                    return Math.max(0, currentScore - dartScore);
                },
                isWinningScore: (score) => score === 0,
                isValidFinish: (score, dartScore) => {
                    return dartScore === score && score % 2 === 0; // Double out
                },
                onCheckout: () => {
                    // Automatischer Reset auf 170 nach Checkout
                    return 170;
                }
            },
            '123-leiter-p4': {
                name: '123-Leiter (P4)',
                description: 'Start bei 123 Punkten, Double-Out, maximal neun Darts pro Stufe; Checkout erhöht das Ziel',
                startScore: 123,
                rules: {
                    doubleIn: false,
                    doubleOut: true,
                    maxDarts: 9,
                    trainingMode: true,
                    showCheckout: true,
                    showAverage: true,
                    currentTarget: 123,
                    maxTarget: 200,
                    incrementOnCheckout: 1
                },
                calculateScore: (currentScore, dartScore) => {
                    return Math.max(0, currentScore - dartScore);
                },
                isWinningScore: (score) => score === 0,
                isValidFinish: (score, dartScore) => {
                    return dartScore === score && score % 2 === 0; // Double out
                },
                onCheckout: (currentTarget) => {
                    // Ziel um 1 erhöhen nach Checkout
                    const newTarget = Math.min(currentTarget + 1, this.modes['123-leiter-p4'].rules.maxTarget);
                    this.modes['123-leiter-p4'].rules.currentTarget = newTarget;
                    return newTarget;
                },
                onMiss: (currentTarget) => {
                    // Bei Fehlschlag ab 124: Ziel um 1 senken
                    if (currentTarget >= 124) {
                        const newTarget = Math.max(currentTarget - 1, 123);
                        this.modes['123-leiter-p4'].rules.currentTarget = newTarget;
                        return newTarget;
                    }
                    return currentTarget;
                }
            },
            'target-focus-programm1': {
                name: 'Target Focus - Programm 1',
                description: '30 Trainingsdarts auf einen wählbaren Sektor (20, 19, 18 oder 17)',
                startScore: 0,
                rules: {
                    maxDarts: 30,
                    trainingMode: true,
                    selectableTargets: [20, 19, 18, 17],
                    selectedTarget: null,
                    showHits: true,
                    showAccuracy: true,
                    showRemaining: true
                },
                calculateScore: (currentScore, dartScore, segment, multiplier) => {
                    const segmentNum = parseInt(segment);
                    const selectedTarget = this.modes['target-focus-programm1'].rules.selectedTarget;
                    
                    if (segmentNum === selectedTarget) {
                        return currentScore + 1;
                    }
                    return currentScore;
                },
                isWinningScore: (score) => score >= 30, // 30 Treffer erreicht
                isValidFinish: (score, dartScore) => false,
                setTarget: (target) => {
                    if (this.modes['target-focus-programm1'].rules.selectableTargets.includes(target)) {
                        this.modes['target-focus-programm1'].rules.selectedTarget = target;
                        return true;
                    }
                    return false;
                }
            },
            'double-finish-programm2': {
                name: 'Double Finish Routine - Programm 2',
                description: 'Individuell auswählbare Doppelziele (alle); nach jedem Checkout wird erneut auf dasselbe Doppel gespielt',
                startScore: 0,
                rules: {
                    maxDarts: 3,
                    trainingMode: true,
                    selectableDoubles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25],
                    selectedDouble: null,
                    showDoubles: true,
                    showAccuracy: true,
                    repeatOnCheckout: true
                },
                calculateScore: (currentScore, dartScore, segment, multiplier) => {
                    const segmentNum = parseInt(segment);
                    const selectedDouble = this.modes['double-finish-programm2'].rules.selectedDouble;
                    
                    if (segmentNum === selectedDouble && multiplier === 'double') {
                        return currentScore + 1;
                    }
                    return currentScore;
                },
                isWinningScore: (score) => score >= 1, // Ein Checkout = Erfolg
                isValidFinish: (score, dartScore) => false,
                setDouble: (doubleTarget) => {
                    if (this.modes['double-finish-programm2'].rules.selectableDoubles.includes(doubleTarget)) {
                        this.modes['double-finish-programm2'].rules.selectedDouble = doubleTarget;
                        return true;
                    }
                    return false;
                },
                onCheckout: () => {
                    // Nach Checkout: Score zurücksetzen, aber dasselbe Doppel beibehalten
                    return 0;
                }
            },
            '53-checkout-programm3': {
                name: '53 Checkout - Programm 3',
                description: 'Start bei 53 Punkten, Ziel ist ein Double-Finish; bei Bust wird der Rest auf 53 zurückgesetzt',
                startScore: 53,
                rules: {
                    doubleIn: false,
                    doubleOut: true,
                    maxDarts: 3,
                    trainingMode: true,
                    showCheckout: true,
                    showAverage: true,
                    bustReset: true,
                    resetScore: 53
                },
                calculateScore: (currentScore, dartScore) => {
                    return Math.max(0, currentScore - dartScore);
                },
                isWinningScore: (score) => score === 0,
                isValidFinish: (score, dartScore) => {
                    return dartScore === score && score % 2 === 0; // Double out
                },
                onBust: () => {
                    // Bei Bust: Zurück auf 53
                    return 53;
                }
            }
        };
    }

    getMode(modeName) {
        return this.modes[modeName] || this.modes['training-501'];
    }

    getAllModes() {
        return Object.keys(this.modes).map(key => ({
            id: key,
            ...this.modes[key]
        }));
    }

    getTrainingModes() {
        return Object.keys(this.modes)
            .filter(key => this.modes[key].rules.trainingMode)
            .map(key => ({
                id: key,
                ...this.modes[key]
            }));
    }

    validateDart(mode, currentScore, dartScore, segment, multiplier) {
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
            case '501-double-out':
                return this.validate501Dart(currentScore, dartScore, modeConfig);
            case 'leiter-123':
                return this.validateLeiterDart(currentScore, dartScore, segment, modeConfig);
            case 'single-20-17':
                return this.validateSingle20_17Dart(currentScore, dartScore, segment, multiplier, modeConfig);
            case 'alle-double':
                return this.validateAlleDoubleDart(currentScore, dartScore, segment, multiplier, modeConfig);
            case '170-checkout-p5':
                return this.validate170CheckoutDart(currentScore, dartScore, modeConfig);
            case '123-leiter-p4':
                return this.validate123LeiterDart(currentScore, dartScore, modeConfig);
            case 'target-focus-programm1':
                return this.validateTargetFocusDart(currentScore, dartScore, segment, modeConfig);
            case 'double-finish-programm2':
                return this.validateDoubleFinishDart(currentScore, dartScore, segment, multiplier, modeConfig);
            case '53-checkout-programm3':
                return this.validate53CheckoutDart(currentScore, dartScore, modeConfig);
            default:
                return { valid: true, reason: 'Standard-Validierung' };
        }
    }

    validate501Dart(currentScore, dartScore, modeConfig) {
        // Double Out Regel
        if (currentScore - dartScore === 0) {
            if (modeConfig.rules.doubleOut) {
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

    validateAroundTheClockDart(currentScore, dartScore, segment, modeConfig) {
        const sequence = modeConfig.rules.sequence;
        const segmentNum = parseInt(segment);
        
        if (!sequence.includes(segmentNum)) {
            return { valid: false, reason: 'Ungültiges Segment für Around the Clock' };
        }

        return { valid: true, reason: 'Gültiger Around the Clock-Wurf' };
    }

    validateCricketDart(currentScore, dartScore, segment, modeConfig) {
        const validSegments = modeConfig.rules.targets;
        const segmentNum = parseInt(segment);
        
        if (!validSegments.includes(segmentNum) && segmentNum !== 25) {
            return { valid: false, reason: 'Ungültiges Segment für Cricket' };
        }

        return { valid: true, reason: 'Gültiger Cricket-Wurf' };
    }

    validateBullseyeDart(currentScore, dartScore, segment, modeConfig) {
        if (segment !== '25') {
            return { valid: false, reason: 'Nur Bullseye erlaubt' };
        }

        return { valid: true, reason: 'Gültiger Bullseye-Wurf' };
    }

    validateDoubleDart(currentScore, dartScore, segment, multiplier, modeConfig) {
        if (multiplier !== 'double') {
            return { valid: false, reason: 'Nur Doubles erlaubt' };
        }

        return { valid: true, reason: 'Gültiger Double-Wurf' };
    }

    validateTripleDart(currentScore, dartScore, segment, multiplier, modeConfig) {
        if (multiplier !== 'triple') {
            return { valid: false, reason: 'Nur Triples erlaubt' };
        }

        return { valid: true, reason: 'Gültiger Triple-Wurf' };
    }

    validateFinishDart(currentScore, dartScore, segment, modeConfig) {
        // Finish-Training spezifische Validierung
        return { valid: true, reason: 'Gültiger Finish-Wurf' };
    }

    validateLeiterDart(currentScore, dartScore, segment, modeConfig) {
        const sequence = modeConfig.rules.sequence;
        const segmentNum = parseInt(segment);
        const currentStep = modeConfig.rules.currentStep;
        
        if (currentStep >= sequence.length) {
            return { valid: false, reason: 'Leiter bereits abgeschlossen' };
        }
        
        if (segmentNum !== sequence[currentStep]) {
            return { valid: false, reason: `Falsche Reihenfolge - erwartet: ${sequence[currentStep]}, erhalten: ${segmentNum}` };
        }
        
        return { valid: true, reason: 'Gültiger Leiter-Wurf' };
    }

    validateSingle20_17Dart(currentScore, dartScore, segment, multiplier, modeConfig) {
        const segmentNum = parseInt(segment);
        const targets = modeConfig.rules.targets;
        
        if (!targets.includes(segmentNum)) {
            return { valid: false, reason: 'Nur Segmente 20, 19, 18, 17 erlaubt' };
        }
        
        if (multiplier !== 'single') {
            return { valid: false, reason: 'Nur Single-Segmente erlaubt' };
        }
        
        return { valid: true, reason: 'Gültiger Single 20-17-Wurf' };
    }

    validateAlleDoubleDart(currentScore, dartScore, segment, multiplier, modeConfig) {
        const segmentNum = parseInt(segment);
        const targets = modeConfig.rules.targets;
        
        if (!targets.includes(segmentNum)) {
            return { valid: false, reason: 'Ungültiges Segment' };
        }
        
        if (multiplier !== 'double') {
            return { valid: false, reason: 'Nur Double-Segmente erlaubt' };
        }
        
        return { valid: true, reason: 'Gültiger Double-Wurf' };
    }

    validate170CheckoutDart(currentScore, dartScore, modeConfig) {
        // Double Out Regel
        if (currentScore - dartScore === 0) {
            if (modeConfig.rules.doubleOut) {
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

        return { valid: true, reason: 'Gültiger 170 Checkout-Wurf' };
    }

    validate123LeiterDart(currentScore, dartScore, modeConfig) {
        // Double Out Regel
        if (currentScore - dartScore === 0) {
            if (modeConfig.rules.doubleOut) {
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

        return { valid: true, reason: 'Gültiger 123-Leiter-Wurf' };
    }

    validateTargetFocusDart(currentScore, dartScore, segment, modeConfig) {
        const segmentNum = parseInt(segment);
        const selectedTarget = modeConfig.rules.selectedTarget;
        
        if (selectedTarget === null) {
            return { valid: false, reason: 'Bitte wählen Sie zuerst ein Ziel aus' };
        }
        
        if (segmentNum !== selectedTarget) {
            return { valid: false, reason: `Falsches Ziel - erwartet: ${selectedTarget}, erhalten: ${segmentNum}` };
        }
        
        return { valid: true, reason: 'Gültiger Target Focus-Wurf' };
    }

    validateDoubleFinishDart(currentScore, dartScore, segment, multiplier, modeConfig) {
        const segmentNum = parseInt(segment);
        const selectedDouble = modeConfig.rules.selectedDouble;
        
        if (selectedDouble === null) {
            return { valid: false, reason: 'Bitte wählen Sie zuerst ein Double aus' };
        }
        
        if (segmentNum !== selectedDouble) {
            return { valid: false, reason: `Falsches Double - erwartet: D${selectedDouble}, erhalten: ${segmentNum}` };
        }
        
        if (multiplier !== 'double') {
            return { valid: false, reason: 'Nur Double-Segmente erlaubt' };
        }
        
        return { valid: true, reason: 'Gültiger Double Finish-Wurf' };
    }

    validate53CheckoutDart(currentScore, dartScore, modeConfig) {
        // Double Out Regel
        if (currentScore - dartScore === 0) {
            if (modeConfig.rules.doubleOut) {
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

        return { valid: true, reason: 'Gültiger 53 Checkout-Wurf' };
    }

    calculateCheckout(score) {
        // Erweiterte Checkout-Kombinationen für Training
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

    getTrainingStatistics(players, mode) {
        const stats = {
            totalDarts: 0,
            totalScore: 0,
            averages: [],
            bestScore: 0,
            worstScore: 0,
            checkoutRate: 0,
            doubleRate: 0,
            tripleRate: 0,
            accuracy: 0,
            consistency: 0
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

module.exports = CustomGameModes;
