import { Entity } from './Entity.js';
import { Weapon, WEAPON_TYPES, getAllTemplates, getAllTemplateKeys } from '../systems/WeaponSystem.js';
import SoundManager from '../core/SoundSystem.js';
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
        const allTemplates = getAllTemplates(); // array of { key, meta, stats }
        const allKeys = getAllTemplateKeys();
        switch (this.type) {
            case 'LIGHT': {
                this.hp = 2;
                this.color = '#ff4444'; 
                // Prefer pistol-type templates, otherwise pick any template
                const pistols = allTemplates.filter(t => t.meta && t.meta.weaponType === WEAPON_TYPES.PISTOL);
                if (pistols.length) this.weaponType = pistols[Math.floor(Math.random() * pistols.length)].key;
                else this.weaponType = allKeys.length ? allKeys[Math.floor(Math.random() * allKeys.length)] : WEAPON_TYPES.PISTOL;
                this.fireRate = 2000;
                break;
            }
            case 'HEAVY': {
                this.hp = 4;
                this.color = '#880000'; 
                // Prefer MP / shotgun class templates if present, otherwise random
                const heavies = allTemplates.filter(t => t.meta && (t.meta.weaponType === WEAPON_TYPES.MP || t.meta.weaponType === 'shotgun'));
                if (heavies.length) this.weaponType = heavies[Math.floor(Math.random() * heavies.length)].key;
                else this.weaponType = allKeys.length ? allKeys[Math.floor(Math.random() * allKeys.length)] : WEAPON_TYPES.MP;
                this.fireRate = 3000;
                break;
            }
            case 'SNIPER': {
                this.hp = 5;
                this.color = '#aa00aa'; 
                // Prefer rifle templates
                const rifles = allTemplates.filter(t => t.meta && t.meta.weaponType === WEAPON_TYPES.RIFLE);
                if (rifles.length) this.weaponType = rifles[Math.floor(Math.random() * rifles.length)].key;
                else this.weaponType = allKeys.length ? allKeys[Math.floor(Math.random() * allKeys.length)] : WEAPON_TYPES.RIFLE;
                this.fireRate = 4000;
                break;
            }
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

        let bullets = [];
        let didFire = false;
        if (currentTime > this.nextShotTime) {
            if (this.weapon.tryFire(currentTime)) {
                this.nextShotTime = currentTime + this.fireRate;
                didFire = true;
            }
        }

        const stats = this.weapon.stats;
        const isBurstMode = stats && stats.fireMode === '3-burst';
        // If fired and NOT burst mode, spawn all shots immediately
        if (didFire && !isBurstMode) {
            const spawnCount = stats.count || 1;
            const shotAudioObj = (this.weapon.getAudio && this.weapon.getAudio('shot')) || null;

            for (let i = 0; i < spawnCount; i++) {
                const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
                const finalAngle = this.angle + spreadAngle;
                const offset = i * 6;
                const bx = this.x + this.width/2 + Math.cos(this.angle) * (15 + offset);
                const by = this.y + this.height/2 + Math.sin(this.angle) * (15 + offset);
                bullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'enemy', stats.range));

                // Play SFX per projectile via SoundManager
                if (shotAudioObj) SoundManager.playSFX(shotAudioObj);
            }
        }

        // Handle ongoing burst spawning (one projectile at a time separated by burstInterval)
        if (this.weapon._burstToSpawn && this.weapon._burstToSpawn > 0) {
            // initialize burst index if missing
            if (typeof this.weapon._burstIndex !== 'number') this.weapon._burstIndex = 0;
            const now = currentTime;
            const interval = (stats && typeof stats.burstInterval === 'number') ? stats.burstInterval : 80;
            const shotAudioObj = (this.weapon.getAudio && this.weapon.getAudio('shot')) || null;

            while (this.weapon._burstToSpawn > 0 && now >= this.weapon._nextBurstShotTime) {
                const i = this.weapon._burstIndex || 0;
                const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
                const finalAngle = this.angle + spreadAngle;
                const offset = i * 6;
                const bx = this.x + this.width/2 + Math.cos(this.angle) * (15 + offset);
                const by = this.y + this.height/2 + Math.sin(this.angle) * (15 + offset);
                bullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'enemy', stats.range));

                // Play SFX per projectile via SoundManager
                if (shotAudioObj) SoundManager.playSFX(shotAudioObj);

                this.weapon._burstToSpawn -= 1;
                this.weapon._burstIndex = (this.weapon._burstIndex || 0) + 1;
                this.weapon._nextBurstShotTime = (this.weapon._nextBurstShotTime || now) + interval;

                if (this.weapon._burstToSpawn <= 0) {
                    this.weapon._burstIndex = 0;
                    this.weapon._burstTotal = 0;
                    this.weapon._nextBurstShotTime = 0;
                }
            }
        }

        return bullets;
    }

    fireWeapon() {
        const stats = this.weapon.stats;
        let bullets = [];
        
        // Handle bursts (weapon._burstToSpawn) or normal multi-count
        const spawnCount = (this.weapon._burstToSpawn && this.weapon._burstToSpawn > 0) ? this.weapon._burstToSpawn : stats.count;
        const isBurst = (this.weapon._burstToSpawn && this.weapon._burstToSpawn > 0);
        const shotAudioObj = (this.weapon.getAudio && this.weapon.getAudio('shot')) || null;

        for (let i = 0; i < spawnCount; i++) {
            const spreadAngle = (Math.random() - 0.5) * 2 * (stats.spread * Math.PI / 180);
            const finalAngle = this.angle + spreadAngle;

            const offset = isBurst ? (i * 6) : 0;
            const bx = this.x + this.width/2 + Math.cos(this.angle) * (15 + offset);
            const by = this.y + this.height/2 + Math.sin(this.angle) * (15 + offset);

            bullets.push(new Bullet(bx, by, finalAngle, 600, stats.damage, stats.color, 'enemy', stats.range));

            // Play SFX per projectile via SoundManager
            if (shotAudioObj) SoundManager.playSFX(shotAudioObj);
        }

        if (isBurst) this.weapon._burstToSpawn = 0;

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