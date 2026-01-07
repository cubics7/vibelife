import SoundManager from '../core/SoundSystem.js';

export class MenuManager {
    constructor() {
        this.uiLayer = document.getElementById('ui-layer');
        this.mainMenu = document.getElementById('main-menu');
        this.pauseMenu = document.getElementById('pause-menu');
        this.gameOverScreen = document.getElementById('game-over-screen');
        
        // NEU: Notification Elements
        this.notificationEl = document.getElementById('notification');
        this.notificationTextEl = document.getElementById('notification-text');
        
        this.hud = document.getElementById('hud');
        this.saveIoContainer = document.getElementById('save-io-container');

        this.btnStart = document.getElementById('btn-start');
        this.btnResumeMain = document.getElementById('btn-resume');
        this.btnSaveMain = document.getElementById('btn-save');
        this.btnLoad = document.getElementById('btn-load');
        this.btnQuit = document.getElementById('btn-quit');
        this.btnResumePause = document.getElementById('btn-resume-pause');
        this.btnSavePause = document.getElementById('btn-save-pause');
        this.btnQuitPause = document.getElementById('btn-quit-pause');
        this.btnImport = document.getElementById('btn-import');
        this.btnRetry = document.getElementById('btn-retry');
        this.btnMenuBack = document.getElementById('btn-menu-back');
        this.btnOptions = document.getElementById('btn-options');
        this.btnMute = document.getElementById('btn-mute');
        this.btnTestLevel = document.getElementById('btn-testlevel');

        // Options elements
        this.optionsMenu = document.getElementById('options-menu');
        this.optMainEl = document.getElementById('opt-main');
        this.optSfxEl = document.getElementById('opt-sfx');
        this.optMusicEl = document.getElementById('opt-music');
        this.mainVolVal = document.getElementById('mainVolVal');
        this.sfxVolVal = document.getElementById('sfxVolVal');
        this.musicVolVal = document.getElementById('musicVolVal');
        this.btnOptionsBack = document.getElementById('btn-options-back');

        // Mute-Status aus localStorage (dies ist die vom Benutzer gesetzte Einstellung)
        const storedMute = localStorage.getItem('cf_muted');
        this.userMuted = storedMute === '1' || storedMute === 'true';

        // Initialize Options (volumes) via SoundManager
        const mainStored = SoundManager.getMainVolumePercent();
        const sfxStored = SoundManager.getSfxVolumePercent();
        const musicStored = SoundManager.getMusicVolumePercent();

        if (this.optMainEl) this.optMainEl.value = mainStored;
        if (this.optSfxEl) { this.optSfxEl.value = Math.min(sfxStored, mainStored); this.optSfxEl.max = mainStored; }
        if (this.optMusicEl) { this.optMusicEl.value = Math.min(musicStored, mainStored); this.optMusicEl.max = mainStored; }
        if (this.mainVolVal) this.mainVolVal.textContent = (this.optMainEl ? this.optMainEl.value : mainStored) + '%';
        if (this.sfxVolVal) this.sfxVolVal.textContent = (this.optSfxEl ? this.optSfxEl.value : sfxStored) + '%';
        if (this.musicVolVal) this.musicVolVal.textContent = (this.optMusicEl ? this.optMusicEl.value : musicStored) + '%';

        // Do NOT persist mute when main volume is zero — this was causing a permanent persisted mute.
        // Instead, keep the user's explicit mute separate and let SoundManager compute the effective mute.
        // initial effective mute will be computed after SoundManager is synced below.

        // SFX preview button
        this.btnSfxPreview = document.getElementById('btn-sfx-preview');
        if (this.btnSfxPreview) {
            this.btnSfxPreview.addEventListener('click', () => {
                // Play a random loaded shot sfx from templates
                import('../systems/WeaponSystem.js').then(ws => {
                    const keys = ws.getAllTemplateKeys();
                    const candidates = [];
                    keys.forEach(k => {
                        const tpl = ws.getTemplate(k);
                        const aud = (tpl && tpl.assets && tpl.assets.loaded && tpl.assets.loaded.audio) || {};
                        for (const [ak, a] of Object.entries(aud)) {
                            if (!a) continue;
                            if (ak.toLowerCase().includes('shot') || ak.toLowerCase().includes('fire')) {
                                candidates.push(a);
                            } else if (a.src && a.src.toLowerCase().includes('shot')) {
                                candidates.push(a);
                            }
                        }
                    });
                    if (candidates.length === 0) {
                        this.showNotification('No SFX loaded for preview');
                        return;
                    }
                    const audioObj = candidates[Math.floor(Math.random() * candidates.length)];
                    try {
                        SoundManager.playSFX(audioObj);
                    } catch (e) { /* ignore */ }
                }).catch(() => { this.showNotification('Preview failed'); });
            });
        }

        // Options handlers
        if (this.btnOptions) this.btnOptions.addEventListener('click', () => { this._previousMenu = 'MAIN'; this.showOptions(); });
        // Add an options button in the pause menu (if present in DOM)
        this.btnOptionsPause = document.getElementById('btn-options-pause');
        if (this.btnOptionsPause) this.btnOptionsPause.addEventListener('click', () => { this._previousMenu = 'PAUSE'; this.showOptions(); });
        if (this.btnOptionsBack) this.btnOptionsBack.addEventListener('click', () => this.hideOptions());

        if (this.optMainEl) this.optMainEl.addEventListener('input', (e) => {
            const main = parseInt(e.target.value, 10);
            this.mainVolVal.textContent = main + '%';
            // adjust max for sfx/music and clamp
            if (this.optSfxEl) { this.optSfxEl.max = main; if (parseInt(this.optSfxEl.value, 10) > main) { this.optSfxEl.value = main; this.sfxVolVal.textContent = main + '%'; } }
            if (this.optMusicEl) { this.optMusicEl.max = main; if (parseInt(this.optMusicEl.value, 10) > main) { this.optMusicEl.value = main; this.musicVolVal.textContent = main + '%'; } }
            SoundManager.setMainVolumePercent(main);
            this.applyVolumeSettings();
        });

        if (this.optSfxEl) this.optSfxEl.addEventListener('input', (e) => {
            const sfx = parseInt(e.target.value, 10);
            const main = SoundManager.getMainVolumePercent();
            const val = Math.min(sfx, main);
            this.optSfxEl.value = val;
            this.sfxVolVal.textContent = val + '%';
            SoundManager.setSfxVolumePercent(val);
            this.applyVolumeSettings();
        });

        if (this.optMusicEl) this.optMusicEl.addEventListener('input', (e) => {
            const music = parseInt(e.target.value, 10);
            const main = SoundManager.getMainVolumePercent();
            const val = Math.min(music, main);
            this.optMusicEl.value = val;
            this.musicVolVal.textContent = val + '%';
            SoundManager.setMusicVolumePercent(val);
            this.applyVolumeSettings();
        });


        // Menu music für Hauptmenü (delegated to SoundManager)
        this._menuPlayBlocked = false;
        // Sync user mute into SoundManager and apply current volumes/mute
        SoundManager.setMuted(this.userMuted);
        SoundManager.updateVolumes();
        // track effective mute (main===0 OR userMuted)
        this.muted = SoundManager.isEffectivelyMuted();
        this._updateMuteButton();

        // Ensure main menu is visible by default after init
        if (this.mainMenu) {
            this.mainMenu.classList.remove('hidden');
            this.updateMainMenuButtons(false);
        }

        // Falls Autoplay blockiert wird, versuchen wir bei erster User-Interaktion erneut zu starten
        const tryPlayOnUserGesture = () => {
            if (this._menuPlayBlocked) {
                this.playMenuMusic();
            }
            document.removeEventListener('click', tryPlayOnUserGesture);
            document.removeEventListener('keydown', tryPlayOnUserGesture);
        };
        document.addEventListener('click', tryPlayOnUserGesture);
        document.addEventListener('keydown', tryPlayOnUserGesture);


    }

    setMenuState(state) {
        this.mainMenu.classList.add('hidden');
        this.pauseMenu.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.saveIoContainer.classList.add('hidden');

        switch (state) {
            case 'MAIN_MENU':{
                this.mainMenu.classList.remove('hidden');
                this.updateMainMenuButtons(false);
                this.playMenuMusic();
                const tbShow = document.getElementById('title-bg'); if (tbShow) tbShow.classList.remove('hidden');
                break;
            }
            case 'MAIN_MENU_WITH_RUN':{
                this.mainMenu.classList.remove('hidden');
                this.updateMainMenuButtons(true);
                this.playMenuMusic();
                const tbShow2 = document.getElementById('title-bg'); if (tbShow2) tbShow2.classList.remove('hidden');
                break;
            }
            case 'PAUSE':
                this.pauseMenu.classList.remove('hidden');
                this.hud.classList.remove('hidden');
                break;
            case 'PLAYING':{
                this.hud.classList.remove('hidden');
                this.stopMenuMusic();
                const tbHide = document.getElementById('title-bg'); if (tbHide) tbHide.classList.add('hidden');
                break;
            }
            case 'GAME_OVER':
                this.gameOverScreen.classList.remove('hidden');
                this.hud.classList.remove('hidden');
                break;
        }
    }

    updateMainMenuButtons(hasActiveGame) {
        if (hasActiveGame) {
            this.btnStart.classList.add('hidden');
            this.btnResumeMain.classList.remove('hidden');
            this.btnSaveMain.classList.remove('hidden');
            this.btnQuit.classList.remove('hidden');
        } else {
            this.btnStart.classList.remove('hidden');
            this.btnResumeMain.classList.add('hidden');
            this.btnSaveMain.classList.add('hidden');
            this.btnQuit.classList.add('hidden');
        }
    }

    toggleSaveIo(show) {
        if (show) this.saveIoContainer.classList.remove('hidden');
        else this.saveIoContainer.classList.add('hidden');
    }

    // NEU: Zeigt eine Notification an
    showNotification(message) {
        // Text setzen
        this.notificationTextEl.textContent = message;
        
        // Element sichtbar machen (aber opacity ist noch 0 wegen CSS, es sei denn wir fügen .show hinzu)
        this.notificationEl.classList.remove('hidden');
        
        // Wir erzwingen ein "Reflow", damit der Browser merkt, dass wir erst display:block haben, bevor wir opacity ändern
        // Das ist wichtig für die Animation zuverlässig zu starten
        void this.notificationEl.offsetWidth; 

        // Fade In (opacity 1)
        this.notificationEl.classList.add('show');

        // Nach 1.5 Sekunden Fade Out (entferne .show)
        setTimeout(() => {
            this.notificationEl.classList.remove('show');
            
            // Nach 2 Sekunden (Fade Zeit + Puffer) komplett aus DOM entfernen (display: none)
            setTimeout(() => {
                this.notificationEl.classList.add('hidden');
            }, 2000); // Muss mit der CSS transition Zeit übereinstimmen

        }, 1500); // Dauer wie lange es sichtbar ist
    }

    playMenuMusic() {
        const p = SoundManager.playMusic('assets/audio/music/cfctheme.mp3');
        if (p && p.catch) {
            p.then(() => { this._menuPlayBlocked = false; }).catch(() => {
                this._menuPlayBlocked = true;
                this.showNotification('Audio autoplay blocked — click or press a key to enable audio');
            });
        }
        return p;
    }

    stopMenuMusic() {
        SoundManager.stopMusic();
    }

    toggleMute() {
        this.setMuted(!this.muted);
    }

    setMuted(state) {
        // This is a user-initiated mute toggle: persist it as user preference
        this.userMuted = !!state;
        localStorage.setItem('cf_muted', this.userMuted ? '1' : '0');
        SoundManager.setMuted(this.userMuted);
        // update effective mute state
        this.muted = SoundManager.isEffectivelyMuted();
        this._updateMuteButton();

        // if unmuted and main menu visible, try to play
        if (!this.muted && this.mainMenu && !this.mainMenu.classList.contains('hidden')) {
            this.playMenuMusic();
        }
    }

    _updateMuteButton() {
        if (!this.btnMute) return;
        if (this.muted) {
            this.btnMute.classList.add('muted');
            this.btnMute.textContent = '🔇';
        } else {
            this.btnMute.classList.remove('muted');
            this.btnMute.textContent = '🔊';
        }
    }

    showOptions() {
        if (this.optionsMenu) {
            // hide whichever menu was active
            if (this._previousMenu === 'PAUSE' && this.pauseMenu) this.pauseMenu.classList.add('hidden');
            if (this._previousMenu === 'MAIN' && this.mainMenu) this.mainMenu.classList.add('hidden');
            this.optionsMenu.classList.remove('hidden');
        }
    }

    hideOptions() {
        if (this.optionsMenu) {
            this.optionsMenu.classList.add('hidden');
            // restore previous menu
            if (this._previousMenu === 'PAUSE' && this.pauseMenu) this.pauseMenu.classList.remove('hidden');
            else if (this._previousMenu === 'MAIN' && this.mainMenu) this.mainMenu.classList.remove('hidden');
            this._previousMenu = null;
        }
    }

    applyVolumeSettings() {
        const prevEffective = this.muted;
        const changed = SoundManager.updateVolumes();
        // update local view of user and effective mute
        this.userMuted = SoundManager.getUserMuted();
        this.muted = SoundManager.isEffectivelyMuted();

        if (prevEffective !== this.muted) {
            if (this.muted) this.showNotification('Audio muted (Main=0)');
            else this.showNotification('Audio unmuted');
            this._updateMuteButton();
        }
    }
}