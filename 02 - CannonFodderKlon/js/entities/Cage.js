import { Entity } from './Entity.js';

export class Cage extends Entity {
    constructor(x, y) {
        super(x, y, 40, 40, '#888888'); // Grauer Käfig
    }

    draw(ctx) {
        ctx.save();
        
        // Käfig Boden
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Gitter (simuliert)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        // Vertikale Balken
        ctx.beginPath(); ctx.moveTo(this.x + 10, this.y); ctx.lineTo(this.x + 10, this.y + 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(this.x + 30, this.y); ctx.lineTo(this.x + 30, this.y + 40); ctx.stroke();
        // Horizontaler Balken
        ctx.beginPath(); ctx.moveTo(this.x, this.y + 20); ctx.lineTo(this.x + 40, this.y + 20); ctx.stroke();

        // Gefangener Soldat im Inneren (Visueller Hinweis)
        ctx.fillStyle = '#ffa500'; // Orange für "Gefangen"
        ctx.beginPath();
        ctx.arc(this.x + 20, this.y + 20, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}