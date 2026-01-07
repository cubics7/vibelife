import { Entity } from './Entity.js';
import { Weapon, WEAPON_TYPES } from '../systems/WeaponSystem.js';
import SoundManager from '../core/SoundSystem.js';
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
        
        // If mouse is down: attempt to start a shot/burst
        if (input.mouse.down) {
            const fired = this.weapon.tryFire(currentTime);
            const stats = this.weapon.stats;
            const isBurstMode = stats.fireMode === '3-burst';

            // Non-burst modes spawn their shots immediately (shotgun-style multi-count stays immediate)
            if (fired && !isBurstMode) {
                const spawnCount = stats.count || 1;
                const shotAudioObj = (this.weapon.getAudio && this.weapon.getAudio('shot')) || null;

                for (let i = 0; i < spawnCount; i++) {
                    const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
                    const finalAngle = this.angle + spreadAngle;
                    const offset = (i * 6);
                    const bx = this.x + this.width/2 + Math.cos(this.angle) * (15 + offset);
                    const by = this.y + this.height/2 + Math.sin(this.angle) * (15 + offset);

                    newBullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'player', stats.range));

                    // Play SFX per projectile via SoundManager
                    if (shotAudioObj) SoundManager.playSFX(shotAudioObj);
                }
            }
        }

        // Handle ongoing burst spawning (one projectile at a time separated by burstInterval)
        if (this.weapon._burstToSpawn && this.weapon._burstToSpawn > 0) {
            const stats = this.weapon.stats;
            const now = currentTime;
            // initialize burst index if missing
            if (typeof this.weapon._burstIndex !== 'number') this.weapon._burstIndex = 0;
            const interval = typeof stats.burstInterval === 'number' ? stats.burstInterval : 80;

            while (this.weapon._burstToSpawn > 0 && now >= this.weapon._nextBurstShotTime) {
                const i = this.weapon._burstIndex || 0;
                const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
                const finalAngle = this.angle + spreadAngle;
                const offset = i * 6;
                const bx = this.x + this.width/2 + Math.cos(this.angle) * (15 + offset);
                const by = this.y + this.height/2 + Math.sin(this.angle) * (15 + offset);

                newBullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'player', stats.range));

                // Play shot SFX per projectile via SoundManager
                const shotAudioObj = (this.weapon.getAudio && this.weapon.getAudio('shot')) || null;
                if (shotAudioObj) SoundManager.playSFX(shotAudioObj);

                // advance burst state
                this.weapon._burstToSpawn -= 1;
                this.weapon._burstIndex = (this.weapon._burstIndex || 0) + 1;
                this.weapon._nextBurstShotTime = (this.weapon._nextBurstShotTime || now) + interval;

                // safety: if finished, reset indices
                if (this.weapon._burstToSpawn <= 0) {
                    this.weapon._burstIndex = 0;
                    this.weapon._burstTotal = 0;
                    this.weapon._nextBurstShotTime = 0;
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

        // Waffe (Farblich aus stats oder Fallback)
        ctx.lineWidth = 4;
        ctx.strokeStyle = (this.weapon && this.weapon.stats && this.weapon.stats.color) ? this.weapon.stats.color : '#fff';
        
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