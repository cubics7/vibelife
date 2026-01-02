import { Entity } from './Entity.js';
import { Weapon, WEAPON_TYPES } from '../systems/WeaponSystem.js';
import { Bullet } from './Bullet.js';

export class Soldier extends Entity {
    constructor(x, y) {
        super(x, y, 20, 20, '#00ff00');
        this.speed = 150;
        this.angle = 0;
        
        this.maxHp = 5;
        this.hp = 5;
        
        this.weapon = new Weapon(WEAPON_TYPES.PISTOL);
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }

    // NEU: Waffe tauschen (für Loot)
    equipWeapon(type) {
        this.weapon = new Weapon(type);
    }

    update(deltaTime, input) {
        const currentTime = performance.now();

        // 1. Waffe Updaten
        this.weapon.update(currentTime);

        // 2. Winkel zur Maus
        const dx = input.mouse.worldX - (this.x + this.width / 2);
        const dy = input.mouse.worldY - (this.y + this.height / 2);
        this.angle = Math.atan2(dy, dx);

        // 3. Schießen logik
        let newBullets = [];
        
        if (input.mouse.down) {
            if (this.weapon.tryFire(currentTime)) {
                const stats = this.weapon.stats;
                for (let i = 0; i < stats.count; i++) {
                    const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
                    const finalAngle = this.angle + spreadAngle;
                    
                    const bx = this.x + this.width/2 + Math.cos(this.angle) * 15;
                    const by = this.y + this.height/2 + Math.sin(this.angle) * 15;

                    newBullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'player', stats.range));
                }
            }
        }
        return newBullets;
    }

    draw(ctx) {
        const currentTime = performance.now();
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        // Körper
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Waffe (Farblich angepasst)
        ctx.lineWidth = 4;
        if (this.weapon.type === WEAPON_TYPES.PISTOL) ctx.strokeStyle = '#fff';
        else if (this.weapon.type === WEAPON_TYPES.SHOTGUN) ctx.strokeStyle = '#ffaa00'; // Orange
        else if (this.weapon.type === WEAPON_TYPES.MP) ctx.strokeStyle = '#aaa'; // Grau
        else if (this.weapon.type === WEAPON_TYPES.RIFLE) ctx.strokeStyle = '#00ccff'; // Blau
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        
        // Reload Anzeige
        if (this.weapon.isReloading) {
            ctx.fillStyle = 'red';
            const progress = this.weapon.getReloadProgress(currentTime);
            const barWidth = this.width * progress; 
            ctx.fillRect(-this.width / 2, -25, barWidth, 4);
        }

        ctx.restore();

        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - 10, this.y - 15, 20, 3);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x - 10, this.y - 15, 20 * (this.hp / this.maxHp), 3);
        }
    }
}