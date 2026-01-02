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
                break;
            case 'MAIN_MENU_WITH_RUN':
                this.mainMenu.classList.remove('hidden');
                this.updateMainMenuButtons(true);
                break;
            case 'PAUSE':
                this.pauseMenu.classList.remove('hidden');
                this.hud.classList.remove('hidden');
                break;
            case 'PLAYING':
                this.hud.classList.remove('hidden');
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
}