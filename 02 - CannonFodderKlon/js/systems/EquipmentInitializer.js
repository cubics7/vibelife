export class EquipmentInitializer {
    constructor(basePath = 'data/weapons') {
        this.basePath = basePath.replace(/\/$/, '');
        this.templates = new Map(); // key -> raw json
        this.invalid = [];
    }

    async loadAll() {
        try {
            const idxRes = await fetch(`${this.basePath}/index.json`);
            if (!idxRes.ok) throw new Error('No index found at ' + `${this.basePath}/index.json`);
            const list = await idxRes.json();
            if (!Array.isArray(list)) throw new Error('Invalid index.json');

            await Promise.all(list.map(async (fn) => {
                try {
                    const res = await fetch(`${this.basePath}/${fn}`);
                    if (!res.ok) throw new Error(`Failed to fetch ${fn}`);
                    const data = await res.json();

                    // Resolve any relative asset paths relative to the JSON's directory
                    const dirIndex = fn.lastIndexOf('/');
                    const dir = dirIndex === -1 ? '' : fn.substring(0, dirIndex);
                    const templateBase = dir ? `${this.basePath}/${dir}` : this.basePath;
                    this._resolveAssetPaths(data, templateBase);

                    const key = fn.replace(/\.json$/i, '');
                    const { valid, errors } = this._validateWeaponJson(data);
                    if (!valid) {
                        console.warn(`EquipmentInitializer: invalid weapon json ${fn}:`, errors);
                        this.invalid.push({ file: fn, errors });
                        return;
                    }
                    this.templates.set(key, data);
                } catch (e) {
                    console.warn(`EquipmentInitializer: could not load ${fn}:`, e.message || e);
                    this.invalid.push({ file: fn, error: e.message || e });
                }
            }));

            return { loaded: Array.from(this.templates.keys()), invalid: this.invalid };
        } catch (e) {
            console.error('EquipmentInitializer.loadAll failed:', e.message || e);
            return { loaded: [], invalid: [{ error: e.message }] };
        }
    }

    getTemplate(key) {
        return this.templates.get(key) || null;
    }

    getAllTemplates() {
        return Array.from(this.templates.entries()).map(([k, v]) => ({ key: k, data: v }));
    }

    // Basic validation - small, defensive schema that won't throw
    _validateWeaponJson(data) {
        const errors = [];
        if (typeof data !== 'object' || data === null) { errors.push('root must be object'); return { valid: false, errors }; }
        if (!data.name || typeof data.name !== 'string') errors.push('name (string) required');
        if (!data.weaponType || typeof data.weaponType !== 'string') errors.push('weaponType (string) required');

        // normalize known type aliases to canonical small keys
        const TYPE_ALIASES = {
            'pistol': 'pistol', 'handgun': 'pistol',
            'mp': 'mp', 'machinepistol': 'mp', 'smg': 'mp',
            'rifle': 'rifle', 'carbine': 'rifle',
            'shotgun': 'shotgun'
        };
        const wt = (data.weaponType || '').toLowerCase();
        if (TYPE_ALIASES[wt]) {
            data.weaponType = TYPE_ALIASES[wt];
        } else {
            errors.push(`weaponType '${data.weaponType}' is not a known class`);
        }

        if (!data.attributes || typeof data.attributes !== 'object') errors.push('attributes (object) required');
        else {
            const a = data.attributes;
            const needNum = ['firerate', 'damage', 'ammoCapacity', 'reloadSpeed', 'range'];
            needNum.forEach(k => { if (typeof a[k] !== 'number') errors.push(`attributes.${k} must be number`); });
            if (typeof a.firemode !== 'string') errors.push('attributes.firemode must be string');
            else {
                const fm = a.firemode.toLowerCase();
                const allowedFMs = ['semi', 'semi-auto', '3-burst', 'auto'];
                if (!allowedFMs.includes(fm)) errors.push(`attributes.firemode '${a.firemode}' is not supported`);
            }
        }
        if (data.assets && typeof data.assets === 'object') {
            const v = data.assets.visuals;
            if (v && typeof v.sprite !== 'string') errors.push('assets.visuals.sprite should be string');
        }
        return { valid: errors.length === 0, errors };
    }

    // Make asset paths relative to the template folder when they are not absolute URLs
    _resolveAssetPaths(data, baseDir) {
        if (!data || !data.assets) return;
        const makeUrl = (p) => {
            if (!p || typeof p !== 'string') return p;
            // absolute URL (http/https) or data:, return as-is
            if (/^(?:[a-z]+:)?\/\//i.test(p) || /^data:/i.test(p)) return p;
            // Otherwise treat leading slashes as relative to template base dir
            return `${baseDir}/${p.replace(/^\/+/, '')}`;
        };

        if (data.assets.visuals && typeof data.assets.visuals === 'object') {
            Object.keys(data.assets.visuals).forEach(k => {
                data.assets.visuals[k] = makeUrl(data.assets.visuals[k]);
            });
        }
        if (data.assets.audio && typeof data.assets.audio === 'object') {
            Object.keys(data.assets.audio).forEach(k => {
                data.assets.audio[k] = makeUrl(data.assets.audio[k]);
            });
        }
    }
}
