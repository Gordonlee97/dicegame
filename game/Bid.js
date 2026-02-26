class Bid {
    constructor(quantity, face, playerId) {
        this.quantity = quantity;
        this.face = face;
        this.playerId = playerId;
    }

    static fromPayload(payload, playerId) {
        const quantity = Number(payload.quantity);
        const face = Number(payload.face);

        if (!Number.isInteger(quantity) || !Number.isInteger(face) || face < 1 || face > 6) {
            return null;
        }

        return new Bid(quantity, face, playerId);
    }
}

module.exports = Bid;
