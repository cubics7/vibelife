export const WEAPON_TYPES = {
    PISTOL: 'pistol',
    SHOTGUN: 'shotgun',
    MP: 'mp',
    RIFLE: 'rifle'
};

import SoundManager from '../core/SoundSystem.js';

const TILE_SIZE = 32;

// No hardcoded weapon stats - system is purely data-driven
const WEAPON_STATS = {}; // kept empty as fallback placeholder container (not used)

// Runtime-templates loaded from data/*.json
const TEMPLATES = new Map(); // key -> { key, meta, stats, assets, _assetPromise }
const TYPE_DEFAULTS = {}; // weaponType -> templateKey (first seen)

function _normalizeTemplate(key, json) {
    const a = json.attributes || {};
    // Normalize fire mode values
    let fm = (a.firemode || a.fireMode || 'semi').toString().toLowerCase();
    if (fm === 'semi-auto') fm = 'semi';
    const stats = {
        damage: typeof a.damage === 'number' ? a.damage : 0,
        range: (typeof a.range === 'number') ? (a.range * TILE_SIZE) : (4 * TILE_SIZE),
        rate: typeof a.firerate === 'number' ? a.firerate : 999999,
        magSize: typeof a.ammoCapacity === 'number' ? a.ammoCapacity : 0,
        reloadTime: typeof a.reloadSpeed === 'number' ? a.reloadSpeed : 1,
        spread: (typeof a.accuracy === 'number') ? a.accuracy : (a.spread || 0),
        count: typeof a.count === 'number' ? a.count : 1,
        color: '#fff',
        fireMode: fm,
        burstCount: typeof a.burstCount === 'number' ? a.burstCount : (fm === '3-burst' ? 3 : 1),
        // Milliseconds between shots in a burst (default: 80ms)
        burstInterval: typeof a.burstInterval === 'number' ? a.burstInterval : (typeof a.burstDelay === 'number' ? a.burstDelay : 80)
    };

    const assets = (json.assets && typeof json.assets === 'object') ? JSON.parse(JSON.stringify(json.assets)) : {};
    return { key, meta: { name: json.name, weaponType: json.weaponType }, stats, assets };
}

function createPlaceholderImage(label = '', w = 64, h = 32) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#444'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label || 'weapon', w/2, h/2);
    const img = new Image(); img.src = c.toDataURL();
    return img;
}

function loadImage(src, fallbackLabel) {
    return new Promise((resolve) => {
        if (!src) { resolve(createPlaceholderImage(fallbackLabel)); return; }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(createPlaceholderImage(fallbackLabel));
        img.src = src;
    });
}

function loadAudio(src) {
    return new Promise((resolve) => {
        if (!src) { resolve(null); return; }
        try {
            const a = new Audio(src);
            a.preload = 'auto';
            // try to resolve when metadata loaded or on error
            a.addEventListener('canplaythrough', () => resolve(a), { once: true });
            a.addEventListener('error', () => resolve(null), { once: true });
            // as fallback, resolve after a short timeout
            setTimeout(() => resolve(a), 1500);
        } catch (e) {
            resolve(null);
        }
    });
}

async function preloadAssetsForTemplate(template) {
    const assets = template.assets || {};
    const visuals = assets.visuals || {};
    const audio = assets.audio || {};

    const loaded = {};
    loaded.spriteImg = await loadImage(visuals.sprite, template.key);

    // Attempt to resolve icon with fallback to 'gfx/icon_{name}.png' inside the template folder
    let iconCandidate = visuals.icon || null;
    if (!iconCandidate) {
        const spriteSrc = visuals.sprite || '';
        let base = '';
        const idx = spriteSrc.lastIndexOf('/');
        if (idx !== -1) base = spriteSrc.substring(0, idx + 1) + 'gfx/';
        else base = `data/weapons/${template.key}/gfx/`;
        const nameSan = (template.meta && template.meta.name) ? template.meta.name.replace(/[^a-z0-9_\-]/ig, '_') : template.key.replace(/[^a-z0-9_\-]/ig, '_');
        iconCandidate = base + 'icon_' + nameSan + '.png';
    }
    loaded.iconImg = await loadImage(iconCandidate, template.key);

    loaded.muzzleImg = await loadImage(visuals.muzzleFlash, template.key);

    loaded.audio = {};
    for (const [k, v] of Object.entries(audio)) {
        // load each audio, ignore failures
        // don't await strongly, but still await here to keep things deterministic
        // a null means missing
        loaded.audio[k] = await loadAudio(v);
    }

    template.assets.loaded = loaded;
}

export function registerTemplate(key, json) {
    const normalized = _normalizeTemplate(key, json);
    TEMPLATES.set(key, normalized);
    const t = normalized.meta.weaponType;
    if (t && !TYPE_DEFAULTS[t]) TYPE_DEFAULTS[t] = key; // first wins

    // Start asset preloading but don't throw on errors
    normalized._assetPromise = preloadAssetsForTemplate(normalized).catch(e => {
        console.warn('Failed to preload assets for', key, e);
    });

    return normalized._assetPromise;
}

export function getTemplate(key) {
    return TEMPLATES.get(key) || null;
}

export function getDefaultTemplateForType(type) {
    return TYPE_DEFAULTS[type] || null;
}

export function getAllTemplates() {
    return Array.from(TEMPLATES.values());
}

export function getAllTemplateKeys() {
    return Array.from(TEMPLATES.keys());
}

export async function preloadAllTemplates() {
    const promises = [];
    for (const tpl of TEMPLATES.values()) {
        if (tpl._assetPromise) promises.push(tpl._assetPromise);
    }
    await Promise.all(promises);
}

// Runtime helper: reload assets for a single template (useful after changing files)
export async function reloadTemplateAssets(key) {
    const tpl = TEMPLATES.get(key);
    if (!tpl) throw new Error('template not found: ' + key);
    tpl._assetPromise = preloadAssetsForTemplate(tpl).catch(e => {
        console.warn('Failed to reload assets for', key, e);
    });
    await tpl._assetPromise;
    return tpl;
}

// Runtime helper: override a single audio asset for a template and attempt to load it immediately
export function setTemplateAudio(templateKey, audioKey, src) {
    const tpl = TEMPLATES.get(templateKey);
    if (!tpl) { console.warn('setTemplateAudio: template not found', templateKey); return false; }
    if (!tpl.assets) tpl.assets = {};
    if (!tpl.assets.audio) tpl.assets.audio = {};

    tpl.assets.audio[audioKey] = src;
    // ensure loaded container exists
    if (!tpl.assets.loaded) tpl.assets.loaded = {};
    if (!tpl.assets.loaded.audio) tpl.assets.loaded.audio = {};

    loadAudio(src).then(a => {
        tpl.assets.loaded.audio[audioKey] = a; // null if failed
        if (!a) console.warn('setTemplateAudio: failed to load', src);
    }).catch(e => console.warn('setTemplateAudio: error loading', src, e));

    return true;
}

export class Weapon {
    constructor(typeOrTemplateKey) {
        this.type = typeOrTemplateKey;
        this.meta = null;
        this.assets = { loaded: {} };

        // Try as explicit template key
        let tpl = TEMPLATES.get(typeOrTemplateKey);
        if (!tpl && TYPE_DEFAULTS[typeOrTemplateKey]) {
            tpl = TEMPLATES.get(TYPE_DEFAULTS[typeOrTemplateKey]);
            if (tpl) this.type = TYPE_DEFAULTS[typeOrTemplateKey];
        }

        if (tpl) {
            this.meta = tpl.meta;
            this.stats = tpl.stats;
            this.assets = tpl.assets || { loaded: {} };
        } else {
            console.warn('Weapon: template not found for', typeOrTemplateKey);
            // fallback to minimal 'unarmed' stats
            this.stats = { damage: 0, range: 0, rate: 999999, magSize: 0, reloadTime: 1, spread: 0, count: 1, color: '#888' };
            // placeholder visuals
            this.assets = { loaded: { spriteImg: createPlaceholderImage('unarmed') } };
        }

        this.currentAmmo = this.stats.magSize || 0;
        this.lastShotTime = 0;
        this.isReloading = false;
        this.reloadStartTime = 0;
    }

    getSprite() {
        return (this.assets && this.assets.loaded && this.assets.loaded.spriteImg) || createPlaceholderImage(this.meta ? this.meta.name : 'weapon');
    }

    getIcon() {
        return (this.assets && this.assets.loaded && this.assets.loaded.iconImg) || this.getSprite();
    }

    getAudio(name) {
        const loaded = (this.assets && this.assets.loaded && this.assets.loaded.audio) || {};
        if (loaded[name]) return loaded[name];
        // Fallback: try to find a close match by key or by src containing the name
        const lname = name.toLowerCase();
        for (const k of Object.keys(loaded)) {
            const a = loaded[k];
            if (!a) continue;
            if (k.toLowerCase().includes(lname)) return a;
            if (a.src && a.src.toLowerCase().includes(lname)) return a;
        }
        return null;
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

    // Helper: plays a named audio from this weapon's assets if available
    playAudioByName(name) {
        try {
            const a = this.getAudio(name);
            if (a && a.src) {
                SoundManager.playSFX(a);
                return true;
            }
        } catch (e) { console.warn('playAudioByName error', e); }
        return false;
    }



    tryFire(currentTime) {
        if (this.isReloading) return false;
        if (this.currentAmmo <= 0) {
            // play empty click if available and then start reload
            this.playAudioByName('empty');
            this.startReload(currentTime);
            return false;
        }

        if (this.isReloading) {
            // while reloading, attempt to play empty click on each fire attempt
            this.playAudioByName('empty');
            return false;
        }

        if (currentTime - this.lastShotTime < this.stats.rate) return false;

        const fm = this.stats.fireMode || 'semi';
        if (fm === '3-burst') {
            const burst = this.stats.burstCount || 3;
            if (this.currentAmmo < burst) {
                this.startReload(currentTime);
                return false;
            }
            this.currentAmmo -= burst;
            // initialize burst state: will be spawned over time by entity updates
            this._burstToSpawn = burst;
            this._burstTotal = burst;
            this._burstIndex = 0;
            this._nextBurstShotTime = currentTime; // immediate first shot
            this.lastShotTime = currentTime;
            return true;
        } else {
            // semi / auto / default
            this.currentAmmo--;
            this.lastShotTime = currentTime;
            return true;
        }
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

// Note: volume helpers moved to SoundSystem (SoundManager.getEffectiveSfxVolume / getEffectiveMusicVolume)