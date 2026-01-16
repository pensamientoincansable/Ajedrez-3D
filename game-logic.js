export class GameLogic {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.turn = 'white'; // 'white' or 'black'
        this.history = [];

        this.initBoard();
    }

    initBoard() {
        // Standard Setup
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
        // In our 3D board, x is -3.5 to 3.5 (left-right), z is -3.5 to 3.5 (top-bottom).
        // Let's map x/z indices 0-7 to board access.
        // Assuming:
        // x increase = right
        // z increase = bottom (towards white player if white controls range 0-1)
        // Wait, standard convention: White is row 0-1? In 3D usually white is at +z or -z?
        // Let's assume (0,0) is top-left A8 for logic? Or bottom-left A1?
        // Let's standardize: 
        // Logic Board: [row][col]
        // row 0 = White Back Row (A1..H1)
        // row 7 = Black Back Row (A8..H8)
        // 3D Visuals:
        // x index (0-7): File (A-H)
        // z index (0-7): Rank (1-8)

        if (x < 0 || x > 7 || z < 0 || z > 7) return null;
        return this.board[z][x];
    }

    isValidMove(fromX, fromZ, toX, toZ) {
        const piece = this.getPieceAt(fromX, fromZ);
        if (!piece || piece.color !== this.turn) return false;

        if (fromX === toX && fromZ === toZ) return false;

        const target = this.getPieceAt(toX, toZ);
        if (target && target.color === piece.color) return false; // Cannot capture own piece

        // Simplified rule set for now - can expand later
        const dx = Math.abs(toX - fromX);
        const dz = Math.abs(toZ - fromZ);

        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? 1 : -1;
                // Forward 1
                if (dx === 0 && toZ - fromZ === direction && !target) return true;
                // Forward 2 (start)
                const startRank = piece.color === 'white' ? 1 : 6;
                if (dx === 0 && fromZ === startRank && toZ - fromZ === 2 * direction && !target && !this.getPieceAt(toX, fromZ + direction)) return true;
                // Capture
                if (dx === 1 && toZ - fromZ === direction && target) return true;
                return false;

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

    toggleTurn() {
        this.turn = this.turn === 'white' ? 'black' : 'white';
    }
}
