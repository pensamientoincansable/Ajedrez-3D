export class GameLogic {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.turn = 'white';
        this.history = [];
        this.aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;

        this.initBoard();
    }

    initBoard() {
        const setupRow = (row, color, pieces) => {
            pieces.forEach((type, col) => {
                this.board[row][col] = { type, color };
            });
        };

        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        const pawnRow = Array(8).fill('pawn');

        setupRow(0, 'white', backRow);
        setupRow(1, 'white', pawnRow);
        setupRow(6, 'black', pawnRow);
        setupRow(7, 'black', backRow);
    }

    getPieceAt(x, z) {
        if (x < 0 || x > 7 || z < 0 || z > 7) return null;
        return this.board[z][x];
    }

    isValidMove(fromX, fromZ, toX, toZ) {
        const piece = this.getPieceAt(fromX, fromZ);
        if (!piece || piece.color !== this.turn) return false;

        if (fromX === toX && fromZ === toZ) return false;

        const target = this.getPieceAt(toX, toZ);
        if (target && target.color === piece.color) return false;

        const dx = Math.abs(toX - fromX);
        const dz = Math.abs(toZ - fromZ);

        switch (piece.type) {
            case 'pawn':
                return this._isValidPawnMove(piece, fromX, fromZ, toX, toZ, target, dx, dz);
            case 'rook':
                if (dx !== 0 && dz !== 0) return false;
                return this.isPathClear(fromX, fromZ, toX, toZ);
            case 'bishop':
                if (dx !== dz) return false;
                return this.isPathClear(fromX, fromZ, toX, toZ);
            case 'queen':
                if (dx !== dz && (dx !== 0 && dz !== 0)) return false;
                return this.isPathClear(fromX, fromZ, toX, toZ);
            case 'knight':
                return (dx === 2 && dz === 1) || (dx === 1 && dz === 2);
            case 'king':
                return dx <= 1 && dz <= 1;
            default:
                return false;
        }
    }

    _isValidPawnMove(piece, fromX, fromZ, toX, toZ, target, dx, dz) {
        const direction = piece.color === 'white' ? 1 : -1;
        const startRank = piece.color === 'white' ? 1 : 6;

        // Forward 1
        if (dx === 0 && toZ - fromZ === direction && !target) {
            return true;
        }

        // Forward 2 from start
        if (dx === 0 && fromZ === startRank && toZ - fromZ === 2 * direction) {
            const midZ = fromZ + direction;
            if (!this.getPieceAt(fromX, midZ) && !this.getPieceAt(fromX, toZ)) {
                return true;
            }
        }

        // Capture
        if (dx === 1 && toZ - fromZ === direction && target) {
            return true;
        }

        // En passant (simplified - not fully implemented)
        // This would require tracking the en passant target square

        return false;
    }

    isPathClear(fx, fz, tx, tz) {
        const dx = Math.sign(tx - fx);
        const dz = Math.sign(tz - fz);
        let x = fx + dx;
        let z = fz + dz;

        while (x !== tx || z !== tz) {
            if (this.getPieceAt(x, z)) return false;
            x += dx;
            z += dz;
        }
        return true;
    }

    move(fromX, fromZ, toX, toZ) {
        if (this.isValidMove(fromX, fromZ, toX, toZ)) {
            const piece = this.board[fromZ][fromX];
            this.board[toZ][toX] = piece;
            this.board[fromZ][fromX] = null;
            this.toggleTurn();
            return true;
        }
        return false;
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[z][x];
                if (piece && piece.color === color) {
                    for (let tz = 0; tz < 8; tz++) {
                        for (let tx = 0; tx < 8; tx++) {
                            if (this.isValidMove(x, z, tx, tz)) {
                                moves.push({ from: { x, z }, to: { x: tx, z: tz } });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    // Check if a move leaves the king in check
    wouldBeInCheck(color, fromX, fromZ, toX, toZ) {
        // Make the move on a copy
        const piece = this.board[fromZ][fromX];
        this.board[toZ][toX] = piece;
        this.board[fromZ][fromX] = null;

        // Find the king
        const kingPos = this._findKing(color);
        if (!kingPos) {
            this.board[fromZ][fromX] = piece;
            this.board[toZ][toX] = null;
            return true; // King not found, consider in check
        }

        // Check if any opponent piece can capture the king
        const opponent = color === 'white' ? 'black' : 'white';
        const inCheck = this._isSquareAttacked(kingPos.x, kingPos.z, opponent);

        // Undo the move
        this.board[fromZ][fromX] = piece;
        this.board[toZ][toX] = null;

        return inCheck;
    }

    _findKing(color) {
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const p = this.board[z][x];
                if (p && p.type === 'king' && p.color === color) {
                    return { x, z };
                }
            }
        }
        return null;
    }

    _isSquareAttacked(x, z, attackerColor) {
        // Check all squares for attacker pieces
        for (let az = 0; az < 8; az++) {
            for (let ax = 0; ax < 8; ax++) {
                const piece = this.board[az][ax];
                if (piece && piece.color === attackerColor) {
                    if (this._pieceCanAttack(ax, az, x, z, piece)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    _pieceCanAttack(ax, az, tx, tz, piece) {
        if (ax === tx && az === tz) return false;
        const dx = Math.abs(tx - ax);
        const dz = Math.abs(tz - az);

        switch (piece.type) {
            case 'rook':
                if (dx !== 0 && dz !== 0) return false;
                return this._lineOfSight(ax, az, tx, tz);
            case 'bishop':
                if (dx !== dz) return false;
                return this._lineOfSight(ax, az, tx, tz);
            case 'queen':
                if (dx !== dz && (dx !== 0 && dz !== 0)) return false;
                return this._lineOfSight(ax, az, tx, tz);
            case 'knight':
                return (dx === 2 && dz === 1) || (dx === 1 && dz === 2);
            case 'king':
                return dx <= 1 && dz <= 1;
            case 'pawn':
                const dir = piece.color === 'white' ? 1 : -1;
                return dx === 1 && tz - az === dir;
            default:
                return false;
        }
    }

    _lineOfSight(ax, az, tx, tz) {
        const dx = Math.sign(tx - ax);
        const dz = Math.sign(tz - az);
        let x = ax + dx;
        let z = az + dz;

        while (x !== tx || z !== tz) {
            if (this.board[z][x]) return false;
            x += dx;
            z += dz;
        }
        return true;
    }

    // Evaluate board position for AI
    evaluateBoard(color) {
        let score = 0;
        const values = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 20000
        };

        // Piece values
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[z][x];
                if (!piece) continue;

                let val = values[piece.type] || 0;

                // Adjust for color
                if (piece.color === color) {
                    // Position bonuses for our pieces
                    val += this._positionBonus(piece.type, x, z, piece.color);
                    score += val;
                } else {
                    // Penalty for opponent pieces
                    val += this._positionBonus(piece.type, x, z, piece.color);
                    score -= val;
                }
            }
        }

        // Mobility bonus
        const myMoves = this.getAllLegalMoves(color).length;
        const opponent = color === 'white' ? 'black' : 'white';
        const oppMoves = this.getAllLegalMoves(opponent).length;
        score += (myMoves - oppMoves) * 2;

        return score;
    }

    _positionBonus(type, x, z, color) {
        // Simplified piece-square tables
        // For white, higher ranks (z) are better; for black, lower ranks
        const boardDir = color === 'white' ? 1 : -1;

        switch (type) {
            case 'pawn':
                // Central pawns worth more
                const centerPawn = (x >= 3 && x <= 4) ? 10 : 0;
                const advancedPawn = (z * boardDir) * 5;
                // Doubled pawns penalty
                return centerPawn + advancedPawn;

            case 'knight':
                // Knights like center
                if (x >= 2 && x <= 5 && z >= 2 && z <= 5) return 40;
                // And outposts
                if (x >= 1 && x <= 6 && z >= 1 && z <= 6) return 20;
                return 0;

            case 'bishop':
                // Good diagonals
                if (x >= 2 && x <= 5 && z >= 2 && z <= 5) return 30;
                return 0;

            case 'rook':
                // Rooks on open files or 7th rank
                if (z === (color === 'white' ? 6 : 1)) return 60;
                if (x === 0 || x === 7) return 20;
                return 0;

            case 'queen':
                return (x >= 3 && x <= 4 && z >= 3 && z <= 4) ? 30 : 0;

            case 'king':
                // King safety - prefer corners early, center late
                if (color === 'white' && z <= 1) return 50;
                if (color === 'black' && z >= 6) return 50;
                return 0;

            default:
                return 0;
        }
    }

    makeBestMove(color) {
        const moves = this.getAllLegalMoves(color);
        if (moves.length === 0) return null;

        // Filter out moves that leave king in check
        const safeMoves = moves.filter(m =>
            !this.wouldBeInCheck(color, m.from.x, m.from.z, m.to.x, m.to.z)
        );

        if (safeMoves.length === 0) return moves[0]; // All moves lose

        // Choose difficulty strategy
        switch (this.aiDifficulty) {
            case 'easy':
                return this._selectMoveEasy(safeMoves, color);

            case 'medium':
                return this._selectMoveMedium(safeMoves, color);

            case 'hard':
                return this._selectMoveHard(safeMoves, color);

            default:
                return this._selectMoveMedium(safeMoves, color);
        }
    }

    _selectMoveEasy(moves, color) {
        // Simple: 40% random moves, 60% captures, prioritize low value
        const captures = moves.filter(m => this.getPieceAt(m.to.x, m.to.z));
        const randomMoves = moves.filter(m => !this.getPieceAt(m.to.x, m.to.z));

        if (captures.length > 0 && Math.random() < 0.6) {
            // Pick a capture, biased towards low-value captures
            const values = { 'pawn': 1, 'knight': 2, 'bishop': 2, 'rook': 3, 'queen': 4 };
            captures.sort((a, b) => {
                const vA = values[this.getPieceAt(a.to.x, a.to.z).type] || 0;
                const vB = values[this.getPieceAt(b.to.x, b.to.z).type] || 0;
                return Math.random() - 0.5 + (vB - vA) * 0.1; // Slightly favor lower value
            });
            return captures[Math.floor(Math.random() * Math.min(captures.length, 3))];
        }

        return moves[Math.floor(Math.random() * moves.length)];
    }

    _selectMoveMedium(moves, color) {
        // Evaluate each move with minimax depth 1
        let bestScore = -Infinity;
        let bestMoves = [];

        for (const move of moves) {
            // Simulate the move
            const piece = this.board[move.from.z][move.from.x];
            this.board[move.to.z][move.to.x] = piece;
            this.board[move.from.z][move.from.x] = null;

            // Check if it captures
            let score = 0;
            const captured = this.getPieceAt(move.to.x, move.to.z);
            if (captured) {
                score += this.getPieceValue(captured.type) * 10;
            }

            // Position evaluation
            const opponent = color === 'white' ? 'black' : 'white';
            this.toggleTurn(); // Switch to opponent's perspective for eval
            score += this.evaluateBoard(opponent) / 10;
            this.toggleTurn(); // Switch back

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (Math.abs(score - bestScore) < 5) {
                bestMoves.push(move);
            }

            // Undo
            this.board[move.from.z][move.from.x] = piece;
            this.board[move.to.z][move.to.x] = null;
        }

        // Add some randomness to best moves
        const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        return chosen || moves[Math.floor(Math.random() * moves.length)];
    }

    _selectMoveHard(moves, color) {
        // Better evaluation with depth 2 minimax-like approach
        let bestScore = -Infinity;
        let bestMoves = [];

        for (const move of moves) {
            const piece = this.board[move.from.z][move.from.x];
            this.board[move.to.z][move.to.x] = piece;
            this.board[move.from.z][move.from.x] = null;

            const opponent = color === 'white' ? 'black' : 'white';
            this.toggleTurn();
            let score = this._minimax(1, opponent, -Infinity, Infinity);
            this.toggleTurn();

            this.board[move.from.z][move.from.x] = piece;
            this.board[move.to.z][move.to.x] = null;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (Math.abs(score - bestScore) < 2) {
                bestMoves.push(move);
            }
        }

        const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        return chosen || moves[Math.floor(Math.random() * moves.length)];
    }

    _minimax(depth, color, alpha, beta) {
        if (depth >= 2) {
            return this.evaluateBoard(color === 'white' ? 'black' : 'white');
        }

        const moves = this.getAllLegalMoves(color);
        if (moves.length === 0) {
            return color === 'white' ? -10000 : 10000; // Checkmate-ish
        }

        if (color === 'white') {
            let maxEval = -Infinity;
            for (const move of moves) {
                const piece = this.board[move.from.z][move.from.x];
                this.board[move.to.z][move.to.x] = piece;
                this.board[move.from.z][move.from.x] = null;
                this.toggleTurn();

                const eval_ = this._minimax(depth + 1, 'black', alpha, beta);
                this.toggleTurn();
                this.board[move.from.z][move.from.x] = piece;
                this.board[move.to.z][move.to.x] = null;

                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const piece = this.board[move.from.z][move.from.x];
                this.board[move.to.z][move.to.x] = piece;
                this.board[move.from.z][move.from.x] = null;
                this.toggleTurn();

                const eval_ = this._minimax(depth + 1, 'white', alpha, beta);
                this.toggleTurn();
                this.board[move.from.z][move.from.x] = piece;
                this.board[move.to.z][move.to.x] = null;

                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getPieceValue(type) {
        const values = {
            'pawn': 10,
            'knight': 30,
            'bishop': 30,
            'rook': 50,
            'queen': 90,
            'king': 900
        };
        return values[type] || 0;
    }

    toggleTurn() {
        this.turn = this.turn === 'white' ? 'black' : 'white';
    }

    setDifficulty(level) {
        this.aiDifficulty = level;
    }

    reset() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.turn = 'white';
        this.history = [];
        this.initBoard();
    }
}
