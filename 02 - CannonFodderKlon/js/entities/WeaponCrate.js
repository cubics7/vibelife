import { Entity } from './Entity.js';
import { getAllTemplateKeys, getTemplate } from '../systems/WeaponSystem.js';

export class WeaponCrate extends Entity {
    constructor(x, y, weaponKey) {
        super(x, y, 30, 30, '#8B4513'); // SaddleBrown
        this.weaponType = weaponKey || this.getRandomType();
    }

    getRandomType() {
        const keys = getAllTemplateKeys();
        if (!keys || keys.length === 0) return null;
        return keys[Math.floor(Math.random() * keys.length)];
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

        // Draw template icon if available
        if (this.weaponType) {
            const tpl = getTemplate(this.weaponType);
            const img = tpl && tpl.assets && tpl.assets.loaded && (tpl.assets.loaded.iconImg || tpl.assets.loaded.spriteImg);
            if (img) {
                try { ctx.drawImage(img, this.x + 6, this.y + 6, 18, 18); } catch (e) {}
            } else {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(this.x + 15, this.y + 15, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 15, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}