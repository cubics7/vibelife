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
        this.btnMute = document.getElementById('btn-mute');
        this.btnTestLevel = document.getElementById('btn-testlevel');

        // Mute-Status aus localStorage
        const storedMute = localStorage.getItem('cf_muted');
        this.muted = storedMute === '1' || storedMute === 'true';

        // Menu music für Hauptmenü
        this.menuMusic = new Audio('assets/audio/music/cfctheme.mp3');
        this.menuMusic.loop = true; // ensure loop is set even after creation (keeps compatibility)
        this.menuMusic.muted = !!this.muted; // apply persisted setting

        this.menuMusic.loop = true;
        this.menuMusic.preload = 'auto';
        this.menuMusic.volume = 0.6;
        this._menuPlayBlocked = false;

        // Falls Autoplay blockiert wird, versuchen wir bei erster User-Interaktion erneut zu starten
        const tryPlayOnUserGesture = () => {
            if (this._menuPlayBlocked) {
                this.menuMusic.play().then(() => { this._menuPlayBlocked = false; }).catch(() => {});
            }
            document.removeEventListener('click', tryPlayOnUserGesture);
            document.removeEventListener('keydown', tryPlayOnUserGesture);
        };
        document.addEventListener('click', tryPlayOnUserGesture);
        document.addEventListener('keydown', tryPlayOnUserGesture);

        // Mute button handler
        if (this.btnMute) {
            this.btnMute.addEventListener('click', () => this.toggleMute());
            // Update initial button look
            if (this.muted) this.btnMute.classList.add('muted');
            this._updateMuteButton();
        }
    }

    setMenuState(state) {
        this.mainMenu.classList.add('hidden');
        this.pauseMenu.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.saveIoContainer.classList.add('hidden');

        switch (state) {
            case 'MAIN_MENU':
                this.mainMenu.classList.remove('hidden');
                this.updateMainMenuButtons(false);
                this.playMenuMusic();
                break;
            case 'MAIN_MENU_WITH_RUN':
                this.mainMenu.classList.remove('hidden');
                this.updateMainMenuButtons(true);
                this.playMenuMusic();
                break;
            case 'PAUSE':
                this.pauseMenu.classList.remove('hidden');
                this.hud.classList.remove('hidden');
                break;
            case 'PLAYING':
                this.hud.classList.remove('hidden');
                this.stopMenuMusic();
                break;
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
            p.catch(() => { this._menuPlayBlocked = true; });
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
}