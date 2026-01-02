export const WEAPON_TYPES = {
    PISTOL: 'pistol',
    SHOTGUN: 'shotgun',
    MP: 'mp',
    RIFLE: 'rifle'
};

const TILE_SIZE = 32;

const WEAPON_STATS = {
    [WEAPON_TYPES.PISTOL]: {
        damage: 1,
        range: 4 * TILE_SIZE,     // 128 Pixel
        rate: 400,      
        magSize: 8,
        reloadTime: 2000,
        spread: 0,      
        count: 1,
        color: '#ffff00'
    },
    [WEAPON_TYPES.SHOTGUN]: {
        damage: 1,
        range: 3.5 * TILE_SIZE,   // 112 Pixel
        rate: 1000,
        magSize: 2,
        reloadTime: 5000,
        spread: 20,      
        count: 5,
        color: '#ffaa00'
    },
    [WEAPON_TYPES.MP]: {
        damage: 0.5,
        range: 6 * TILE_SIZE,     // 192 Pixel
        rate: 100,      
        magSize: 30,
        reloadTime: 3000,
        spread: 5,
        count: 1,
        color: '#ffff00'
    },
    [WEAPON_TYPES.RIFLE]: {
        damage: 2,
        range: 15 * TILE_SIZE,    // 480 Pixel
        rate: 800,
        magSize: 5,
        reloadTime: 5000,
        spread: 2,
        count: 1,
        color: '#ffffff'
    }
};

export class Weapon {
    constructor(type) {
        this.type = type;
        // WICHTIG: Hier greifen wir auf die Stats zu, nicht auf TYPES
        this.stats = WEAPON_STATS[type]; 
        
        this.currentAmmo = this.stats.magSize;
        this.lastShotTime = 0;
        this.isReloading = false;
        this.reloadStartTime = 0;
    }

    update(currentTime) {
        if (this.isReloading) {
            const elapsed = currentTime - this.reloadStartTime;
            if (elapsed >= this.stats.reloadTime) {
                this.isReloading = false;
                this.currentAmmo = this.stats.magSize;
                return true;
            }
        }
        return false;
    }

    tryFire(currentTime) {
        if (this.isReloading) return false;
        if (this.currentAmmo <= 0) {
            this.startReload(currentTime);
            return false;
        }
        if (currentTime - this.lastShotTime < this.stats.rate) return false;

        this.currentAmmo--;
        this.lastShotTime = currentTime;
        return true;
    }

    startReload(currentTime) {
        if (!this.isReloading) {
            this.isReloading = true;
            this.reloadStartTime = currentTime;
        }
    }

    getReloadProgress(currentTime) {
        if (!this.isReloading) return 0;
        const elapsed = currentTime - this.reloadStartTime;
        return Math.min(1, elapsed / this.stats.reloadTime);
    }
}