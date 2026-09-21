/**
 * Professional Chess Game Logic
 * Implements full FIDE rules: castling, en passant, promotion, check detection
 * Optimized for AI with alpha-beta pruning
 */

export class GameLogic {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.turn = 'white';
        this.history = [];
        this.aiDifficulty = 'medium';
        this.enPassantTarget = null; // {x, z}
        this.castlingRights = {
            white: { kingSide: true, queenSide: true, kingMoved: false },
            black: { kingSide: true, queenSide: true, kingMoved: false }
        };
        this.rookMoved = {
            white: { kingSide: false, queenSide: false },
            black: { kingSide: false, queenSide: false }
        };
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.lastMove = null;
        this.initBoard();
    }

    initBoard() {
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let x = 0; x < 8; x++) {
            this.board[0][x] = { type: backRow[x], color: 'white', hasMoved: false };
            this.board[1][x] = { type: 'pawn', color: 'white', hasMoved: false };
            this.board[6][x] = { type: 'pawn', color: 'black', hasMoved: false };
            this.board[7][x] = { type: backRow[x], color: 'black', hasMoved: false };
        }
    }

    cloneBoard() {
        return this.board.map(row => row.map(p => p ? { ...p } : null));
    }

    getPieceAt(x, z) {
        if (x < 0 || x > 7 || z < 0 || z > 7) return null;
        return this.board[z][x];
    }

    // Raw movement validation without check consideration
    isValidMoveRaw(fromX, fromZ, toX, toZ, ignoreTurn = false) {
        const piece = this.getPieceAt(fromX, fromZ);
        if (!piece) return false;
        if (!ignoreTurn && piece.color !== this.turn) return false;
        if (fromX === toX && fromZ === toZ) return false;

        const target = this.getPieceAt(toX, toZ);
        if (target && target.color === piece.color) return false;

        const dx = toX - fromX;
        const dz = toZ - fromZ;
        const adx = Math.abs(dx);
        const adz = Math.abs(dz);

        switch (piece.type) {
            case 'pawn':
                return this._isValidPawnMove(piece, fromX, fromZ, toX, toZ, target, dx, dz, adx, adz);
            case 'rook':
                if (adx !== 0 && adz !== 0) return false;
                return this.isPathClear(fromX, fromZ, toX, toZ);
            case 'bishop':
                if (adx !== adz) return false;
                return this.isPathClear(fromX, fromZ, toX, toZ);
            case 'queen':
                if (!(adx === adz || adx === 0 || adz === 0)) return false;
                return this.isPathClear(fromX, fromZ, toX, toZ);
            case 'knight':
                return (adx === 2 && adz === 1) || (adx === 1 && adz === 2);
            case 'king':
                // Normal king move
                if (adx <= 1 && adz <= 1) return true;
                // Castling
                if (adz === 0 && adx === 2) {
                    return this._canCastle(piece.color, dx > 0 ? 'kingSide' : 'queenSide');
                }
                return false;
            default:
                return false;
        }
    }

    _isValidPawnMove(piece, fromX, fromZ, toX, toZ, target, dx, dz, adx, adz) {
        const direction = piece.color === 'white' ? 1 : -1;
        const startRank = piece.color === 'white' ? 1 : 6;

        // Forward 1
        if (adx === 0 && dz === direction && !target) {
            return true;
        }
        // Forward 2 from start
        if (adx === 0 && fromZ === startRank && dz === 2 * direction) {
            const midZ = fromZ + direction;
            if (!this.getPieceAt(fromX, midZ) && !this.getPieceAt(toX, toZ)) {
                return true;
            }
        }
        // Capture
        if (adx === 1 && dz === direction && target) {
            return true;
        }
        // En passant capture
        if (adx === 1 && dz === direction && !target && this.enPassantTarget) {
            if (this.enPassantTarget.x === toX && this.enPassantTarget.z === toZ) {
                return true;
            }
        }
        return false;
    }

    _canCastle(color, side) {
        const rights = this.castlingRights[color];
        if (!rights) return false;
        if (side === 'kingSide' && !rights.kingSide) return false;
        if (side === 'queenSide' && !rights.queenSide) return false;
        if (rights.kingMoved) return false;

        const rank = color === 'white' ? 0 : 7;
        const king = this.getPieceAt(4, rank);
        if (!king || king.type !== 'king' || king.color !== color) return false;

        // Check if king is in check
        if (this.isInCheck(color)) return false;

        if (side === 'kingSide') {
            // Squares f and g must be empty, rook at h
            if (this.getPieceAt(5, rank) || this.getPieceAt(6, rank)) return false;
            const rook = this.getPieceAt(7, rank);
            if (!rook || rook.type !== 'rook' || rook.color !== color) return false;
            // Squares f and g must not be attacked
            if (this._isSquareAttacked(5, rank, color === 'white' ? 'black' : 'white')) return false;
            if (this._isSquareAttacked(6, rank, color === 'white' ? 'black' : 'white')) return false;
            return true;
        } else {
            // Queen side: b,c,d empty, rook at a
            if (this.getPieceAt(1, rank) || this.getPieceAt(2, rank) || this.getPieceAt(3, rank)) return false;
            const rook = this.getPieceAt(0, rank);
            if (!rook || rook.type !== 'rook' || rook.color !== color) return false;
            if (this._isSquareAttacked(2, rank, color === 'white' ? 'black' : 'white')) return false;
            if (this._isSquareAttacked(3, rank, color === 'white' ? 'black' : 'white')) return false;
            return true;
        }
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

    // Check if move is legal (doesn't leave king in check)
    isLegalMove(fromX, fromZ, toX, toZ) {
        if (!this.isValidMoveRaw(fromX, fromZ, toX, toZ)) return false;
        
        // Simulate move
        const moveData = this._simulateMove(fromX, fromZ, toX, toZ);
        if (!moveData) return false;
        
        const inCheck = this.isInCheck(this.turn);
        
        this._undoSimulate(moveData);
        return !inCheck;
    }

    // For external API - full validation
    isValidMove(fromX, fromZ, toX, toZ) {
        return this.isLegalMove(fromX, fromZ, toX, toZ);
    }

    _simulateMove(fromX, fromZ, toX, toZ) {
        const piece = this.board[fromZ][fromX];
        if (!piece) return null;
        
        const captured = this.board[toZ][toX];
        const prevEnPassant = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        const prevCastling = JSON.parse(JSON.stringify(this.castlingRights));
        const prevRookMoved = JSON.parse(JSON.stringify(this.rookMoved));
        
        let enPassantCaptured = null;
        let enPassantPos = null;
        let isCastling = false;
        let rookFrom = null, rookTo = null, rookPiece = null;
        let isPromotion = false;

        // Handle en passant capture
        if (piece.type === 'pawn' && !captured && this.enPassantTarget &&
            this.enPassantTarget.x === toX && this.enPassantTarget.z === toZ) {
            const capZ = piece.color === 'white' ? toZ - 1 : toZ + 1;
            enPassantCaptured = this.board[capZ][toX];
            enPassantPos = { x: toX, z: capZ };
            this.board[capZ][toX] = null;
        }

        // Handle castling
        if (piece.type === 'king' && Math.abs(toX - fromX) === 2) {
            isCastling = true;
            const rank = fromZ;
            if (toX === 6) { // king side
                rookFrom = { x: 7, z: rank };
                rookTo = { x: 5, z: rank };
            } else { // queen side
                rookFrom = { x: 0, z: rank };
                rookTo = { x: 3, z: rank };
            }
            rookPiece = this.board[rookFrom.z][rookFrom.x];
            this.board[rookTo.z][rookTo.x] = rookPiece;
            this.board[rookFrom.z][rookFrom.x] = null;
        }

        // Move piece
        this.board[toZ][toX] = piece;
        this.board[fromZ][fromX] = null;

        // Handle promotion
        if (piece.type === 'pawn' && (toZ === 7 || toZ === 0)) {
            isPromotion = true;
            this.board[toZ][toX] = { type: 'queen', color: piece.color, hasMoved: true };
        }

        // Update en passant target
        this.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(toZ - fromZ) === 2) {
            this.enPassantTarget = { x: fromX, z: fromZ + (piece.color === 'white' ? 1 : -1) };
        }

        return {
            from: { x: fromX, z: fromZ },
            to: { x: toX, z: toZ },
            piece,
            captured,
            prevEnPassant,
            prevCastling,
            prevRookMoved,
            enPassantCaptured,
            enPassantPos,
            isCastling,
            rookFrom,
            rookTo,
            rookPiece,
            isPromotion
        };
    }

    _undoSimulate(data) {
        if (!data) return;
        this.board[data.from.z][data.from.x] = data.piece;
        this.board[data.to.z][data.to.x] = data.captured;
        
        if (data.enPassantPos) {
            this.board[data.enPassantPos.z][data.enPassantPos.x] = data.enPassantCaptured;
        }
        if (data.isCastling && data.rookFrom && data.rookTo) {
            this.board[data.rookFrom.z][data.rookFrom.x] = data.rookPiece;
            this.board[data.rookTo.z][data.rookTo.x] = null;
        }
        this.enPassantTarget = data.prevEnPassant;
        this.castlingRights = data.prevCastling;
        this.rookMoved = data.prevRookMoved;
    }

    move(fromX, fromZ, toX, toZ) {
        if (!this.isLegalMove(fromX, fromZ, toX, toZ)) {
            return { success: false };
        }

        const piece = this.board[fromZ][fromX];
        const captured = this.board[toZ][toX];
        let enPassantCapture = false;
        let castling = null;
        let promotion = false;

        // Check en passant
        if (piece.type === 'pawn' && !captured && this.enPassantTarget &&
            this.enPassantTarget.x === toX && this.enPassantTarget.z === toZ) {
            const capZ = piece.color === 'white' ? toZ - 1 : toZ + 1;
            this.board[capZ][toX] = null;
            enPassantCapture = true;
        }

        // Check castling
        if (piece.type === 'king' && Math.abs(toX - fromX) === 2) {
            const rank = fromZ;
            if (toX === 6) {
                // King side
                const rook = this.board[rank][7];
                this.board[rank][5] = rook;
                this.board[rank][7] = null;
                if (rook) rook.hasMoved = true;
                castling = 'kingSide';
            } else {
                // Queen side
                const rook = this.board[rank][0];
                this.board[rank][3] = rook;
                this.board[rank][0] = null;
                if (rook) rook.hasMoved = true;
                castling = 'queenSide';
            }
        }

        // Move
        this.board[toZ][toX] = piece;
        this.board[fromZ][fromX] = null;
        piece.hasMoved = true;

        // Promotion
        if (piece.type === 'pawn' && (toZ === 7 || toZ === 0)) {
            this.board[toZ][toX] = { type: 'queen', color: piece.color, hasMoved: true };
            promotion = true;
        }

        // Update castling rights
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
            this.castlingRights[piece.color].kingMoved = true;
        }
        if (piece.type === 'rook') {
            if (fromX === 0) {
                this.castlingRights[piece.color].queenSide = false;
            } else if (fromX === 7) {
                this.castlingRights[piece.color].kingSide = false;
            }
        }

        // En passant target
        this.enPassantTarget = null;
        if (piece.type === 'pawn' && Math.abs(toZ - fromZ) === 2) {
            this.enPassantTarget = { x: fromX, z: fromZ + (piece.color === 'white' ? 1 : -1) };
        }

        // History
        this.history.push({
            from: { x: fromX, z: fromZ },
            to: { x: toX, z: toZ },
            piece: piece.type,
            color: piece.color,
            captured: captured?.type || null,
            castling,
            promotion,
            enPassantCapture
        });

        this.lastMove = { from: { x: fromX, z: fromZ }, to: { x: toX, z: toZ } };

        if (piece.color === 'black') this.fullMoveNumber++;

        this.toggleTurn();

        return {
            success: true,
            captured,
            castling,
            promotion,
            enPassantCapture
        };
    }

    getAllLegalMoves(color) {
        const moves = [];
        const originalTurn = this.turn;
        this.turn = color;
        
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[z][x];
                if (piece && piece.color === color) {
                    for (let tz = 0; tz < 8; tz++) {
                        for (let tx = 0; tx < 8; tx++) {
                            if (this.isValidMoveRaw(x, z, tx, tz, true)) {
                                // Check if move leaves king in check
                                const sim = this._simulateMove(x, z, tx, tz);
                                if (sim) {
                                    const stillInCheck = this.isInCheck(color);
                                    this._undoSimulate(sim);
                                    if (!stillInCheck) {
                                        moves.push({ from: { x, z }, to: { x: tx, z: tz } });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        this.turn = originalTurn;
        return moves;
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

    isInCheck(color) {
        const kingPos = this._findKing(color);
        if (!kingPos) return true;
        const opponent = color === 'white' ? 'black' : 'white';
        return this._isSquareAttacked(kingPos.x, kingPos.z, opponent);
    }

    _isSquareAttacked(x, z, attackerColor) {
        for (let az = 0; az < 8; az++) {
            for (let ax = 0; ax < 8; ax++) {
                const piece = this.board[az][ax];
                if (piece && piece.color === attackerColor) {
                    if (this._pieceAttacksSquare(ax, az, x, z, piece)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    _pieceAttacksSquare(ax, az, tx, tz, piece) {
        if (ax === tx && az === tz) return false;
        const dx = tx - ax;
        const dz = tz - az;
        const adx = Math.abs(dx);
        const adz = Math.abs(dz);

        switch (piece.type) {
            case 'rook':
                if (adx !== 0 && adz !== 0) return false;
                return this._lineOfSight(ax, az, tx, tz);
            case 'bishop':
                if (adx !== adz) return false;
                return this._lineOfSight(ax, az, tx, tz);
            case 'queen':
                if (!(adx === adz || adx === 0 || adz === 0)) return false;
                return this._lineOfSight(ax, az, tx, tz);
            case 'knight':
                return (adx === 2 && adz === 1) || (adx === 1 && adz === 2);
            case 'king':
                return adx <= 1 && adz <= 1;
            case 'pawn':
                const dir = piece.color === 'white' ? 1 : -1;
                return adx === 1 && dz === dir;
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

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        return this.getAllLegalMoves(color).length === 0;
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        return this.getAllLegalMoves(color).length === 0;
    }

    // AI Evaluation
    evaluateBoard(forColor) {
        const pieceValues = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 20000
        };

        // Piece-square tables (simplified but effective)
        const pawnTableWhite = [
            0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
            5,  5, 10, 25, 25, 10,  5,  5,
            0,  0,  0, 20, 20,  0,  0,  0,
            5, -5,-10,  0,  0,-10, -5,  5,
            5, 10, 10,-20,-20, 10, 10,  5,
            0,  0,  0,  0,  0,  0,  0,  0
        ];
        const knightTable = [
            -50,-40,-30,-30,-30,-30,-40,-50,
            -40,-20,  0,  0,  0,  0,-20,-40,
            -30,  0, 10, 15, 15, 10,  0,-30,
            -30,  5, 15, 20, 20, 15,  5,-30,
            -30,  0, 15, 20, 20, 15,  0,-30,
            -30,  5, 10, 15, 15, 10,  5,-30,
            -40,-20,  0,  5,  5,  0,-20,-40,
            -50,-40,-30,-30,-30,-30,-40,-50
        ];

        let score = 0;

        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[z][x];
                if (!piece) continue;

                let value = pieceValues[piece.type] || 0;
                let positional = 0;

                // Positional bonuses
                if (piece.type === 'pawn') {
                    const idx = piece.color === 'white' ? z * 8 + x : (7 - z) * 8 + x;
                    positional = pawnTableWhite[idx];
                } else if (piece.type === 'knight') {
                    const idx = z * 8 + x;
                    positional = knightTable[idx];
                    if (piece.color === 'black') positional = knightTable[(7 - z) * 8 + x];
                } else if (piece.type === 'bishop') {
                    if (x >= 2 && x <= 5 && z >= 2 && z <= 5) positional = 20;
                } else if (piece.type === 'rook') {
                    if (z === 6 || z === 1) positional = 30;
                    // Open file bonus
                    let open = true;
                    for (let rz = 0; rz < 8; rz++) {
                        const p = this.board[rz][x];
                        if (p && p.type === 'pawn' && p.color === piece.color) { open = false; break; }
                    }
                    if (open) positional += 15;
                } else if (piece.type === 'queen') {
                    if (x >= 3 && x <= 4 && z >= 3 && z <= 4) positional = 15;
                } else if (piece.type === 'king') {
                    // King safety
                    if (piece.color === 'white' && z <= 1) positional = 30;
                    if (piece.color === 'black' && z >= 6) positional = 30;
                    // Penalize king in center during middlegame
                    const piecesCount = this._countPieces();
                    if (piecesCount > 12) {
                        if (x >= 2 && x <= 5 && z >= 2 && z <= 5) positional -= 20;
                    }
                }

                const total = value + positional;
                if (piece.color === forColor) {
                    score += total;
                } else {
                    score -= total;
                }
            }
        }

        // Mobility
        const myMob = this.getAllLegalMoves(forColor).length;
        const opp = forColor === 'white' ? 'black' : 'white';
        const oppMob = this.getAllLegalMoves(opp).length;
        score += (myMob - oppMob) * 3;

        // Check bonus
        if (this.isInCheck(opp)) score += 50;
        if (this.isInCheck(forColor)) score -= 50;

        return score;
    }

    _countPieces() {
        let count = 0;
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                if (this.board[z][x]) count++;
            }
        }
        return count;
    }

    // AI Move Selection
    makeBestMove(color) {
        const moves = this.getAllLegalMoves(color);
        if (moves.length === 0) return null;

        switch (this.aiDifficulty) {
            case 'easy':
                return this._selectMoveEasy(moves, color);
            case 'medium':
                return this._selectMoveMedium(moves, color);
            case 'hard':
                return this._selectMoveHard(moves, color);
            default:
                return this._selectMoveMedium(moves, color);
        }
    }

    _selectMoveEasy(moves, color) {
        // 70% random, 30% try to capture
        const captures = moves.filter(m => this.getPieceAt(m.to.x, m.to.z));
        
        // 20% chance to make a blunder (pick worst)
        if (Math.random() < 0.2 && moves.length > 1) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        if (captures.length > 0 && Math.random() < 0.4) {
            return captures[Math.floor(Math.random() * captures.length)];
        }

        return moves[Math.floor(Math.random() * moves.length)];
    }

    _selectMoveMedium(moves, color) {
        // Evaluate each move with 1-ply search
        let scored = [];

        for (const move of moves) {
            const sim = this._simulateMove(move.from.x, move.from.z, move.to.x, move.to.z);
            if (!sim) continue;

            const opp = color === 'white' ? 'black' : 'white';
            // Quick eval from opponent perspective after our move
            let score = -this.evaluateBoard(opp);
            
            // Capture bonus
            if (sim.captured) {
                score += this.getPieceValue(sim.captured.type) * 10;
            }
            if (sim.enPassantCaptured) {
                score += 100;
            }

            this._undoSimulate(sim);
            scored.push({ move, score });
        }

        if (scored.length === 0) return moves[0];

        scored.sort((a, b) => b.score - a.score);
        
        // Pick among top 3 with some randomness
        const topN = Math.min(3, scored.length);
        const topMoves = scored.slice(0, topN);
        return topMoves[Math.floor(Math.random() * topMoves.length)].move;
    }

    _selectMoveHard(moves, color) {
        // Full minimax with alpha-beta depth 3
        let bestScore = -Infinity;
        let bestMoves = [];
        let alpha = -Infinity;
        let beta = Infinity;

        // Move ordering - captures first
        const ordered = moves.slice().sort((a, b) => {
            const capA = this.getPieceAt(a.to.x, a.to.z) ? 1 : 0;
            const capB = this.getPieceAt(b.to.x, b.to.z) ? 1 : 0;
            return capB - capA;
        });

        for (const move of ordered) {
            const sim = this._simulateMove(move.from.x, move.from.z, move.to.x, move.to.z);
            if (!sim) continue;

            this.turn = this.turn === 'white' ? 'black' : 'white';
            const score = -this._minimax(2, -beta, -alpha, this.turn);
            this.turn = this.turn === 'white' ? 'black' : 'white';

            this._undoSimulate(sim);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
                alpha = Math.max(alpha, score);
            } else if (Math.abs(score - bestScore) < 10) {
                bestMoves.push(move);
            }
        }

        // Slight randomness among equally good moves
        return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
    }

    _minimax(depth, alpha, beta, color) {
        if (depth === 0) {
            return this._quiescence(alpha, beta, color);
        }

        const moves = this.getAllLegalMoves(color);
        if (moves.length === 0) {
            if (this.isInCheck(color)) {
                return -10000 - depth; // Checkmate - prefer faster mate
            }
            return 0; // Stalemate
        }

        // Move ordering for efficiency
        moves.sort((a, b) => {
            const capA = this.getPieceAt(a.to.x, a.to.z) ? 1 : 0;
            const capB = this.getPieceAt(b.to.x, b.to.z) ? 1 : 0;
            return capB - capA;
        });

        let best = -Infinity;
        const opp = color === 'white' ? 'black' : 'white';

        for (const move of moves) {
            const sim = this._simulateMove(move.from.x, move.from.z, move.to.x, move.to.z);
            if (!sim) continue;

            this.turn = opp;
            const score = -this._minimax(depth - 1, -beta, -alpha, opp);
            this.turn = color;
            this._undoSimulate(sim);

            best = Math.max(best, score);
            alpha = Math.max(alpha, score);
            if (alpha >= beta) break; // Beta cutoff
        }

        return best;
    }

    _quiescence(alpha, beta, color) {
        let standPat = this.evaluateBoard(color);

        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;

        // Only consider captures
        const moves = this.getAllLegalMoves(color).filter(m => {
            const target = this.getPieceAt(m.to.x, m.to.z);
            return target || (this.enPassantTarget && this.enPassantTarget.x === m.to.x && this.enPassantTarget.z === m.to.z);
        });

        const opp = color === 'white' ? 'black' : 'white';

        for (const move of moves) {
            const sim = this._simulateMove(move.from.x, move.from.z, move.to.x, move.to.z);
            if (!sim) continue;

            this.turn = opp;
            const score = -this._quiescence(-beta, -alpha, opp);
            this.turn = color;
            this._undoSimulate(sim);

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    getPieceValue(type) {
        const values = { 'pawn': 10, 'knight': 30, 'bishop': 30, 'rook': 50, 'queen': 90, 'king': 900 };
        return values[type] || 0;
    }

    toggleTurn() {
        this.turn = this.turn === 'white' ? 'black' : 'white';
    }

    setDifficulty(level) {
        this.aiDifficulty = level;
    }
}
