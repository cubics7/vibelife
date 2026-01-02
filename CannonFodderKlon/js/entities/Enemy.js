import { Entity } from './Entity.js';
import { Weapon, WEAPON_TYPES } from '../systems/WeaponSystem.js';
import { Bullet } from './Bullet.js';

export class Enemy extends Entity {
    constructor(x, y, type) {
        super(x, y, 20, 20, '#ff0000'); 
        this.type = type;
        this.speed = 40; 
        this.angle = 0;
        this.nextShotTime = 0;
        this.setupStats();
        this.weapon = new Weapon(this.weaponType);
    }

    setupStats() {
        switch (this.type) {
            case 'LIGHT':
                this.hp = 2;
                this.color = '#ff4444'; 
                this.weaponType = WEAPON_TYPES.PISTOL;
                this.fireRate = 2000; 
                break;
            case 'HEAVY':
                this.hp = 4;
                this.color = '#880000'; 
                this.weaponType = Math.random() > 0.5 ? WEAPON_TYPES.SHOTGUN : WEAPON_TYPES.MP;
                this.fireRate = 3000;
                break;
            case 'SNIPER':
                this.hp = 5;
                this.color = '#aa00aa'; 
                this.weaponType = WEAPON_TYPES.RIFLE;
                this.fireRate = 4000;
                break;
        }
    }

    update(deltaTime, squad) {
        const currentTime = performance.now();
        this.weapon.update(currentTime);

        const targetX = squad.x + 10;
        const targetY = squad.y + 10;
        
        const dx = targetX - (this.x + this.width / 2);
        const dy = targetY - (this.y + this.height / 2);
        const distance = Math.sqrt(dx*dx + dy*dy);
        this.angle = Math.atan2(dy, dx);

        if (distance > 150) {
            const vx = Math.cos(this.angle) * this.speed * deltaTime;
            const vy = Math.sin(this.angle) * this.speed * deltaTime;
            this.x += vx;
            this.y += vy;
        }

        if (currentTime > this.nextShotTime) {
            if (this.weapon.tryFire(currentTime)) {
                this.nextShotTime = currentTime + this.fireRate;
                return this.fireWeapon(); 
            }
        }
        return [];
    }

    fireWeapon() {
        const stats = this.weapon.stats;
        let bullets = [];
        
        for (let i = 0; i < stats.count; i++) {
            const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
            const finalAngle = this.angle + spreadAngle;
            
            const bx = this.x + this.width/2 + Math.cos(this.angle) * 15;
            const by = this.y + this.height/2 + Math.sin(this.angle) * 15;

            // WICHTIG: stats.range übergeben
            bullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'enemy', stats.range));
        }
        return bullets;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        
        if (this.hp < (this.type === 'LIGHT' ? 2 : this.type === 'HEAVY' ? 4 : 5)) {
            ctx.fillStyle = 'red';
            ctx.fillRect(-10, -20, 20, 3);
            ctx.fillStyle = '#0f0';
            const maxHp = this.type === 'LIGHT' ? 2 : this.type === 'HEAVY' ? 4 : 5;
            ctx.fillRect(-10, -20, 20 * (this.hp / maxHp), 3);
        }
        ctx.restore();
    }
}