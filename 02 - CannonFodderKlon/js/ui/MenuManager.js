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

        // Mute-Status aus localStorage
        const storedMute = localStorage.getItem('cf_muted');
        this.muted = storedMute === '1' || storedMute === 'true';

        // Initialize Options (volumes)
        const mainStored = parseInt(localStorage.getItem('cf_mainVol') || '50', 10);
        const sfxStored = parseInt(localStorage.getItem('cf_sfxVol') || String(mainStored), 10);
        const musicStored = parseInt(localStorage.getItem('cf_musicVol') || '50', 10);

        if (this.optMainEl) this.optMainEl.value = mainStored;
        if (this.optSfxEl) { this.optSfxEl.value = Math.min(sfxStored, mainStored); this.optSfxEl.max = mainStored; }
        if (this.optMusicEl) { this.optMusicEl.value = Math.min(musicStored, mainStored); this.optMusicEl.max = mainStored; }
        if (this.mainVolVal) this.mainVolVal.textContent = (this.optMainEl ? this.optMainEl.value : mainStored) + '%';
        if (this.sfxVolVal) this.sfxVolVal.textContent = (this.optSfxEl ? this.optSfxEl.value : sfxStored) + '%';
        if (this.musicVolVal) this.musicVolVal.textContent = (this.optMusicEl ? this.optMusicEl.value : musicStored) + '%';

        // auto-mute when Main Volume is zero
        this.muted = (mainStored === 0) || (localStorage.getItem('cf_muted') === '1' || localStorage.getItem('cf_muted') === 'true');
        localStorage.setItem('cf_muted', this.muted ? '1' : '0');

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
                                candidates.push(a.src);
                            } else if (a.src && a.src.toLowerCase().includes('shot')) {
                                candidates.push(a.src);
                            }
                        }
                    });
                    if (candidates.length === 0) {
                        this.showNotification('No SFX loaded for preview');
                        return;
                    }
                    const src = candidates[Math.floor(Math.random() * candidates.length)];
                    try {
                        const s = new Audio(src);
                        s.preload = 'auto';
                        const effective = ws.getEffectiveSfxVolume();
                        s.muted = this.muted || effective === 0;
                        s.volume = effective;
                        s.play().catch(() => {});
                    } catch (e) { /* ignore */ }
                }).catch(() => { this.showNotification('Preview failed'); });
            });
        }

        // Options handlers
        if (this.btnOptions) this.btnOptions.addEventListener('click', () => this.showOptions());
        if (this.btnOptionsBack) this.btnOptionsBack.addEventListener('click', () => this.hideOptions());

        if (this.optMainEl) this.optMainEl.addEventListener('input', (e) => {
            const main = parseInt(e.target.value, 10);
            this.mainVolVal.textContent = main + '%';
            // adjust max for sfx/music and clamp
            if (this.optSfxEl) { this.optSfxEl.max = main; if (parseInt(this.optSfxEl.value, 10) > main) { this.optSfxEl.value = main; this.sfxVolVal.textContent = main + '%'; } }
            if (this.optMusicEl) { this.optMusicEl.max = main; if (parseInt(this.optMusicEl.value, 10) > main) { this.optMusicEl.value = main; this.musicVolVal.textContent = main + '%'; } }
            localStorage.setItem('cf_mainVol', String(main));
            this.applyVolumeSettings();
        });

        if (this.optSfxEl) this.optSfxEl.addEventListener('input', (e) => {
            const sfx = parseInt(e.target.value, 10);
            const main = parseInt(localStorage.getItem('cf_mainVol') || '50', 10);
            const val = Math.min(sfx, main);
            this.optSfxEl.value = val;
            this.sfxVolVal.textContent = val + '%';
            localStorage.setItem('cf_sfxVol', String(val));
            this.applyVolumeSettings();
        });

        if (this.optMusicEl) this.optMusicEl.addEventListener('input', (e) => {
            const music = parseInt(e.target.value, 10);
            const main = parseInt(localStorage.getItem('cf_mainVol') || '50', 10);
            const val = Math.min(music, main);
            this.optMusicEl.value = val;
            this.musicVolVal.textContent = val + '%';
            localStorage.setItem('cf_musicVol', String(val));
            this.applyVolumeSettings();
        });


        // Menu music für Hauptmenü
        this.menuMusic = new Audio('assets/audio/music/cfctheme.mp3');
        this.menuMusic.loop = true; // ensure loop is set even after creation (keeps compatibility)
        this.menuMusic.muted = !!this.muted; // apply persisted setting

        this.menuMusic.loop = true;
        this.menuMusic.preload = 'auto';
        this.menuMusic.volume = 0.6;
        this._menuPlayBlocked = false;
        // Apply persisted volume settings (overwrites the default 0.6 if set)
        this.applyVolumeSettings();

        // Ensure main menu is visible by default after init
        if (this.mainMenu) {
            this.mainMenu.classList.remove('hidden');
            this.updateMainMenuButtons(false);
        }

        // Falls Autoplay blockiert wird, versuchen wir bei erster User-Interaktion erneut zu starten
        const tryPlayOnUserGesture = () => {
            if (this._menuPlayBlocked) {
                this.menuMusic.play().then(() => { this._menuPlayBlocked = false; this.showNotification('Audio enabled'); }).catch(() => {});
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
        if (!this.menuMusic) return;
        if (this.menuMusic.muted) return; // don't attempt to autoplay if muted
        if (!this.menuMusic.paused) return;
        const p = this.menuMusic.play();
        if (p && p.catch) {
            p.then(() => {
                this._menuPlayBlocked = false;
            }).catch(() => {
                this._menuPlayBlocked = true;
                this.showNotification('Audio autoplay blocked — click or press a key to enable audio');
            });
        }
    }

    stopMenuMusic() {
        if (!this.menuMusic) return;
        this.menuMusic.pause();
        try { this.menuMusic.currentTime = 0; } catch (e) {}
    }

    toggleMute() {
        this.setMuted(!this.muted);
    }

    setMuted(state) {
        this.muted = !!state;
        if (this.menuMusic) this.menuMusic.muted = this.muted;
        localStorage.setItem('cf_muted', this.muted ? '1' : '0');
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
            this.mainMenu.classList.add('hidden');
            this.optionsMenu.classList.remove('hidden');
        }
    }

    hideOptions() {
        if (this.optionsMenu) {
            this.optionsMenu.classList.add('hidden');
            this.mainMenu.classList.remove('hidden');
        }
    }

    applyVolumeSettings() {
        // Read persisted settings and apply to menu music
        const main = parseInt(localStorage.getItem('cf_mainVol') || '50', 10) / 100;
        const music = parseInt(localStorage.getItem('cf_musicVol') || '50', 10) / 100;
        const effectiveMusic = main * music; // normalized 0..1

        // Auto-mute when Main is zero
        const wasMuted = this.muted;
        this.muted = (main === 0) || (localStorage.getItem('cf_muted') === '1' || localStorage.getItem('cf_muted') === 'true');
        localStorage.setItem('cf_muted', this.muted ? '1' : '0');

        if (this.menuMusic) {
            this.menuMusic.volume = effectiveMusic;
            // If muted (from main=0 or user), ensure silence
            this.menuMusic.muted = this.muted || effectiveMusic === 0;
        }

        // Optionally update UI elements if mute changed (no visible button now)
        if (wasMuted !== this.muted) {
            // No button update required; show a brief notification
            if (this.muted) this.showNotification('Audio muted (Main=0)');
            else this.showNotification('Audio unmuted');
        }
    }
}