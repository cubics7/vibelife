import { Entity } from './Entity.js';
import { WEAPON_TYPES } from '../systems/WeaponSystem.js';

export class WeaponCrate extends Entity {
    constructor(x, y) {
        super(x, y, 30, 30, '#8B4513'); // SaddleBrown
        this.weaponType = this.getRandomType();
    }

    getRandomType() {
        // Zufällige Waffe, aber nicht Pistole
        const types = [WEAPON_TYPES.SHOTGUN, WEAPON_TYPES.MP, WEAPON_TYPES.RIFLE];
        return types[Math.floor(Math.random() * types.length)];
    }

    draw(ctx) {
        ctx.save();
        
        // Kisten-Hintergrund
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Kisten-Rahmen (X)
        ctx.strokeStyle = '#5c2e0e'; // Dunkleres Braun
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + 30, this.y + 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(this.x + 30, this.y); ctx.lineTo(this.x, this.y + 30); ctx.stroke();

        // Klein Icon für "Waffe" (z.B. ein kleiner Kreis in der Mitte)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 15, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}