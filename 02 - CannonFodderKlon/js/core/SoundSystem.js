// Central SoundManager to handle SFX and Music
// Singleton export

class SoundManager {
    constructor() {
        // user preference for mute (persisted)
        const storedMute = localStorage.getItem('cf_muted');
        this.userMuted = storedMute === '1' || storedMute === 'true';
        this.bgm = null; // current music audio element
    }

    // returns normalized sfx volume 0..1
    getEffectiveSfxVolume() {
        const main = this.getMainVolumePercent() / 100;
        const sfxPercent = this.getSfxVolumePercent();
        return (main * (sfxPercent / 100));
    }

    // returns normalized music volume 0..1
    getEffectiveMusicVolume() {
        const main = this.getMainVolumePercent() / 100;
        const musicPercent = this.getMusicVolumePercent();
        return (main * (musicPercent / 100));
    }

    // getters/setters for persisted volume settings (percent 0..100)
    getMainVolumePercent() {
        return parseInt(localStorage.getItem('cf_mainVol') || '50', 10);
    }

    setMainVolumePercent(percent) {
        const p = Math.max(0, Math.min(100, parseInt(percent, 10) || 0));
        localStorage.setItem('cf_mainVol', String(p));
        this.updateVolumes();
    }

    getSfxVolumePercent() {
        return parseInt(localStorage.getItem('cf_sfxVol') || String(this.getMainVolumePercent()), 10);
    }

    setSfxVolumePercent(percent) {
        const p = Math.max(0, Math.min(100, parseInt(percent, 10) || 0));
        // ensure sfx doesn't exceed main
        const main = this.getMainVolumePercent();
        const final = Math.min(p, main);
        localStorage.setItem('cf_sfxVol', String(final));
    }

    getMusicVolumePercent() {
        return parseInt(localStorage.getItem('cf_musicVol') || '50', 10);
    }

    setMusicVolumePercent(percent) {
        const p = Math.max(0, Math.min(100, parseInt(percent, 10) || 0));
        // ensure music doesn't exceed main
        const main = this.getMainVolumePercent();
        const final = Math.min(p, main);
        localStorage.setItem('cf_musicVol', String(final));
    }

    // effective mute respects main volume zero OR explicit user mute
    isEffectivelyMuted() {
        const main = parseInt(localStorage.getItem('cf_mainVol') || '50', 10) / 100;
        return (main === 0) || this.userMuted;
    }

    getUserMuted() {
        return this.userMuted;
    }

    playSFX(audioObj) {
        try {
            if (!audioObj || !audioObj.src) return false;
            const s = new Audio(audioObj.src);
            s.preload = 'auto';
            const effective = this.getEffectiveSfxVolume();
            s.muted = this.isEffectivelyMuted() || effective === 0;
            s.volume = effective;
            const p = s.play();
            if (p && p.catch) p.catch(() => {});
            return true;
        } catch (e) {
            // ensure we never bubble an error up to the game loop
            console.warn('SoundManager.playSFX failed', e);
            return false;
        }
    }

    playMusic(src) {
        if (!src) return null;
        try {
            if (!this.bgm || (this.bgm && this.bgm.src !== src)) {
                // create new music element
                this.bgm = new Audio(src);
                this.bgm.loop = true;
                this.bgm.preload = 'auto';
            }
            const effective = this.getEffectiveMusicVolume();
            this.bgm.muted = this.isEffectivelyMuted() || effective === 0;
            this.bgm.volume = effective;
            // Return the play() promise so callers can react to autoplay blocks if needed
            return this.bgm.play();
        } catch (e) {
            console.warn('SoundManager.playMusic failed', e);
            return null;
        }
    }

    stopMusic() {
        if (!this.bgm) return;
        try {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        } catch (e) { /* ignore */ }
    }

    // updateVolumes: apply current localStorage volumes and effective mute to bgm
    // NOTE: we do NOT override the persisted user mute when main volume is zero
    updateVolumes() {
        const wasEffective = this.bgm ? this.bgm.muted : this.isEffectivelyMuted();

        if (this.bgm) {
            const effective = this.getEffectiveMusicVolume();
            this.bgm.volume = effective;
            this.bgm.muted = this.isEffectivelyMuted() || effective === 0;
        }

        const nowEffective = this.bgm ? this.bgm.muted : this.isEffectivelyMuted();
        return wasEffective !== nowEffective; // indicate if effective mute state changed
    }

    setMuted(state) {
        this.userMuted = !!state;
        localStorage.setItem('cf_muted', this.userMuted ? '1' : '0');
        if (this.bgm) this.bgm.muted = this.isEffectivelyMuted() || this.getEffectiveMusicVolume() === 0;
    }

    toggleMute() {
        this.setMuted(!this.userMuted);
    }
}

const instance = new SoundManager();
export default instance;
