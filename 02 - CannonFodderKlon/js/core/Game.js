import { MenuManager } from '../ui/MenuManager.js';
import { InputHandler } from './InputHandler.js';
import { Squad } from '../entities/Squad.js';
import { Bullet } from '../entities/Bullet.js';
import { Enemy } from '../entities/Enemy.js';
import { Cage } from '../entities/Cage.js';
import { WeaponCrate } from '../entities/WeaponCrate.js';
import { SaveManager } from '../systems/SaveManager.js'; // NEU
import { WEAPON_TYPES, registerTemplate, preloadAllTemplates } from '../systems/WeaponSystem.js';
import { EquipmentInitializer } from '../systems/EquipmentInitializer.js';

export class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        this.width = 1024;
        this.height = 768;

        this.menuManager = new MenuManager();
        this.inputHandler = null; // created when canvas is created
        this.saveManager = new SaveManager(); // NEU
        
        this.squad = null;
        this.enemies = [];
        this.cages = [];
        this.weaponCrates = [];
        this.bullets = [];
        
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.cageSpawnTimer = 0;
        this.weaponCrateSpawnTimer = 0;
        
        this.state = 'MENU'; 
        this.isRunning = false; 
        this.testMode = false; // when true: disable auto-spawns and show test toolbar
        
        this.ENEMY_MIN_DIST = 30;
        this.MAX_ENEMIES = 16;
        this.MAX_SQUAD_SIZE = 6;
    }

    async init() {
        this.bindEvents();
        this.menuManager.setMenuState('MAIN_MENU');
        this.isRunning = false;
        
        // Check LocalStorage beim Start
        this.checkAutoSave();
        
        // Lade Data-driven Equipment (nicht-blockierend)
        try {
            const initializer = new EquipmentInitializer();
            const res = await initializer.loadAll();
            // Registriere geladene Templates in WeaponSystem
            res.loaded.forEach(k => {
                const tpl = initializer.getTemplate(k);
                if (tpl) registerTemplate(k, tpl);
            });
            if (res.loaded.length > 0) console.log('EquipmentInitializer: loaded', res.loaded);
            if (res.invalid.length) console.warn('EquipmentInitializer: invalid', res.invalid);

            // Assets für registrierte Templates vorladen (wartet auf alle Promises)
            try {
                await preloadAllTemplates();
                console.log('WeaponSystem: all template assets preloaded');
            } catch (e) {
                console.warn('WeaponSystem preload failed:', e);
            }
        } catch (e) {
            console.warn('EquipmentInitializer failed:', e.message || e);
        }

        requestAnimationFrame((ts) => this.loop(ts));
    }

    bindEvents() {
        this.menuManager.btnStart.onclick = () => this.startNewGame();
        this.menuManager.btnResumeMain.onclick = () => this.resumeGame();
        this.menuManager.btnQuit.onclick = () => this.quitToMainMenu();
        this.menuManager.btnTestLevel && (this.menuManager.btnTestLevel.onclick = () => this.startTestLevel());
        
        this.menuManager.btnResumePause.onclick = () => this.togglePause();
        this.menuManager.btnQuitPause.onclick = () => this.quitToMainMenu();
        
        // Save / Load Buttons (NEU)
        this.menuManager.btnLoad.onclick = () => {
            this.menuManager.toggleSaveIo(true);
        };
        this.menuManager.btnImport.onclick = () => {
            const str = this.saveManager.getImportString();
            if(str) this.loadGame(str);
        };
        
        this.menuManager.btnSaveMain.onclick = () => this.saveGame();
        this.menuManager.btnSavePause.onclick = () => this.saveGame();

        this.menuManager.btnRetry.onclick = () => this.startNewGame();
        this.menuManager.btnMenuBack.onclick = () => this.quitToMainMenu();

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.state === 'PLAYING') this.togglePause();
                else if (this.state === 'PAUSED') this.togglePause();
            }
        });
    }

    // NEU: Spielstand speichern
    saveGame() {
        if (!this.squad) return; 

        const saveData = {
            squad: {
                x: this.squad.x,
                y: this.squad.y,
                soldiers: this.squad.soldiers.map(s => ({
                    hp: s.hp,
                    weaponType: s.weapon.type
                }))
            },
            enemies: this.enemies.map(e => ({
                x: e.x,
                y: e.y,
                type: e.type,
                hp: e.hp
            })),
            cages: this.cages.map(c => ({ x: c.x, y: c.y })),
            weaponCrates: this.weaponCrates.map(wc => ({ x: wc.x, y: wc.y, weaponType: wc.weaponType })),
            timestamp: Date.now()
        };

        try {
            const saveString = this.saveManager.save(saveData);
            this.saveManager.updateExportArea(saveString);
            
            // ALT: alert("Spiel gespeichert! String kopiert.");
            // NEU:
            this.menuManager.showNotification("Spiel gespeichert!");
            
        } catch (e) {
            alert("Fehler beim Speichern: " + e.message); // Fehler bleibt Alert, da kritisch
        }
    }

    // NEU: Spielstand laden
    loadGame(saveString) {
        try {
            const data = this.saveManager.load(saveString);
            this.deserialize(data);
            this.state = 'PLAYING';
            this.menuManager.setMenuState('PLAYING');
            this.menuManager.toggleSaveIo(false); // Box schließen
            console.log("Spielstand geladen.");
        } catch (e) {
            alert("Fehler beim Laden: Ungültiger Save-String.");
        }
    }

    // NEU: Wiederherstellung der Objekte
    deserialize(data) {
        // Squad
        this.squad = new Squad();
        this.squad.x = data.squad.x;
        this.squad.y = data.squad.y;
        
        // Soldaten leeren
        this.squad.soldiers = [];
        data.squad.soldiers.forEach(sData => {
            this.squad.addSoldier();
            const s = this.squad.soldiers[this.squad.soldiers.length - 1];
            s.hp = sData.hp;
            s.equipWeapon(sData.weaponType);
        });

        // Enemies
        this.enemies = [];
        data.enemies.forEach(eData => {
            const e = new Enemy(eData.x, eData.y, eData.type);
            e.hp = eData.hp;
            this.enemies.push(e);
        });

        // Cages
        this.cages = [];
        data.cages.forEach(cData => {
            this.cages.push(new Cage(cData.x, cData.y));
        });

        // Crates
        this.weaponCrates = [];
        data.weaponCrates.forEach(wData => {
            const wc = new WeaponCrate(wData.x, wData.y);
            // Wir überschreiben den zufälligen Typ mit dem gespeicherten
            wc.weaponType = wData.weaponType; 
            this.weaponCrates.push(wc);
        });

        // Bullets leeren
        this.bullets = [];
        
        // Timer zurücksetzen (damit nichts sofort spawnt)
        this.spawnTimer = 0;
        this.cageSpawnTimer = 0;
        this.weaponCrateSpawnTimer = 0;
    }

    checkAutoSave() {
        // Prüfen ob ein LocalStorage Save existiert und UI anpassen
        try {
            const save = localStorage.getItem(this.saveManager.saveKey);
            if (save) {
                // Validierung nur prüfen, nicht laden
                this.saveManager.load(save); // Wirft Fehler wenn kaputt
                // Wenn hier kein Error, ist Save gültig -> Buttons anzeigen
                this.menuManager.setMenuState('MAIN_MENU_WITH_RUN');
                
                // Optional: String direkt in das Feld laden
                this.saveManager.updateExportArea(save);
            }
        } catch (e) {
            // Kein valider Save
            this.menuManager.setMenuState('MAIN_MENU');
        }
    }

    startNewGame() {
        this.squad = new Squad();
        this.squad.addSoldier(); 
        this.enemies = [];
        this.cages = [];
        this.weaponCrates = [];
        this.bullets = [];
        this.spawnTimer = 0;
        this.cageSpawnTimer = 0;
        this.weaponCrateSpawnTimer = 0;
        
        this.isRunning = true;
        this.state = 'PLAYING';

        // Create the canvas lazily on first game start
        if (!this.canvas) {
            const root = document.getElementById('game-root') || document.body;
            const canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            canvas.width = this.width;
            canvas.height = this.height;
            canvas.style.width = this.width + 'px';
            canvas.style.height = this.height + 'px';
            canvas.style.background = '#000';
            // insert behind UI layer so UI overlays remain
            const ui = document.getElementById('ui-layer');
            if (ui && ui.parentNode) ui.parentNode.insertBefore(canvas, ui);
            else document.body.appendChild(canvas);
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            // create InputHandler now that canvas exists
            this.inputHandler = new InputHandler(this.canvas);
        }

        // hide title background when playing
        const tb = document.getElementById('title-bg');
        if (tb) tb.classList.add('hidden');

        this.menuManager.setMenuState('PLAYING');

        // When in test mode, do not auto-place an initial enemy/cage
        if (!this.testMode) {
            this.spawnEnemy('LIGHT', 200, 200);
            this.spawnCage(600, 300);
        }
    }

    resumeGame() {
        // Resume lädt den LocalStorage Stand
        const save = localStorage.getItem(this.saveManager.saveKey);
        if (save) {
            this.loadGame(save);
        } else {
            this.state = 'PLAYING';
            this.menuManager.setMenuState('PLAYING');
        }
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.menuManager.setMenuState('PAUSE');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.menuManager.setMenuState('PLAYING');
        }
    }

    quitToMainMenu() {
        this.squad = null;
        this.enemies = [];
        this.cages = [];
        this.weaponCrates = [];
        this.bullets = [];
        this.isRunning = false; 
        this.state = 'MENU';
        this.testMode = false;
        this.hideTestToolbar();
        this.menuManager.setMenuState('MAIN_MENU');
        this.checkAutoSave();
    }

    startTestLevel() {
        // Start a Testlevel: disable auto-spawns and show toolbar
        this.testMode = true;
        this.startNewGame(); // reuse start logic

        // Ensure the test area is empty
        this.enemies = [];
        this.cages = [];
        this.weaponCrates = [];
        this.bullets = [];

        this.showTestToolbar();
        this.menuManager.showNotification('Testlevel gestartet');
    }

    showTestToolbar() {
        const tb = document.getElementById('test-toolbar');
        if (!tb) return;
        tb.classList.remove('hidden');
        tb.innerHTML = '';

        // Add a button for spawning enemies and cages
        const enemyBtn = document.createElement('button');
        enemyBtn.textContent = 'Spawn Enemy';
        enemyBtn.onclick = () => this.spawnEnemy(); // random edge spawn
        tb.appendChild(enemyBtn);

        const cageBtn = document.createElement('button');
        cageBtn.textContent = 'Spawn Cage';
        cageBtn.onclick = () => this.spawnCage(); // random position
        tb.appendChild(cageBtn);

        // Weapon template buttons
        try {
            // WeaponSystem exposes getAllTemplates via import
            import('../systems/WeaponSystem.js').then(ws => {
                const keys = ws.getAllTemplateKeys();
                keys.forEach(k => {
                    const tpl = ws.getTemplate(k);
                    const b = document.createElement('button');
                    const img = document.createElement('img');
                    img.className = 'icon';
                    const iconImg = (tpl && tpl.assets && tpl.assets.loaded && tpl.assets.loaded.iconImg) ? tpl.assets.loaded.iconImg : null;
                    img.src = iconImg ? iconImg.src : '';
                    b.appendChild(img);
                    const label = document.createElement('span');
                    label.className = 'spawn-label';
                    label.textContent = k;
                    b.appendChild(label);
                    b.onclick = () => this.spawnWeaponCrate(undefined, undefined, k); // random position
                    tb.appendChild(b);
                });

                // Add a Clear button to remove all spawned items
                const clearBtn = document.createElement('button');
                clearBtn.textContent = 'Clear';
                clearBtn.onclick = () => {
                    this.enemies = [];
                    this.cages = [];
                    this.weaponCrates = [];
                    this.menuManager.showNotification('Testlevel gelöscht');
                };
                tb.appendChild(clearBtn);
            }).catch(() => {});
        } catch (e) {
            // ignore
        }
    }

    hideTestToolbar() {
        const tb = document.getElementById('test-toolbar');
        if (!tb) return;
        tb.classList.add('hidden');
        tb.innerHTML = '';
    }

    spawnEnemy(forcedType, x, y) {
        let ex = x; let ey = y;
        if (ex === undefined) {
            const edge = Math.floor(Math.random() * 4); 
            if (edge === 0) { ex = Math.random() * this.width; ey = -50; }
            else if (edge === 1) { ex = this.width + 50; ey = Math.random() * this.height; }
            else if (edge === 2) { ex = Math.random() * this.width; ey = this.height + 50; }
            else { ex = -50; ey = Math.random() * this.height; }
        }
        const types = ['LIGHT', 'HEAVY', 'SNIPER'];
        const type = forcedType || types[Math.floor(Math.random() * types.length)];
        this.enemies.push(new Enemy(ex, ey, type));
    }

    spawnCage(forcedX, forcedY) {
        let cx = forcedX; let cy = forcedY;
        if (cx === undefined) {
            const margin = 50;
            cx = margin + Math.random() * (this.width - margin * 2);
            cy = margin + Math.random() * (this.height - margin * 2);
        }
        this.cages.push(new Cage(cx, cy));
    }

    spawnWeaponCrate(forcedX, forcedY, weaponKey) {
        let cx = forcedX; let cy = forcedY;
        if (cx === undefined) {
            const margin = 50;
            cx = margin + Math.random() * (this.width - margin * 2);
            cy = margin + Math.random() * (this.height - margin * 2);
        }
        this.weaponCrates.push(new WeaponCrate(cx, cy, weaponKey));
    }

    loop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (this.state === 'PLAYING') {
            this.update(deltaTime);
            if (this.ctx) this.draw();
        } else if (this.state === 'PAUSED' || this.state === 'GAME_OVER') {
            if (this.ctx) this.draw();
        } else if (this.state === 'MENU') {
            // No canvas yet maybe; only clear canvas if ctx exists
            if (this.ctx) {
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, 0, this.width, this.height);
            }
        }
        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(deltaTime) {
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > 3) {
            if (!this.testMode && this.enemies.length < this.MAX_ENEMIES) this.spawnEnemy();
            this.spawnTimer = 0;
        }

        this.cageSpawnTimer += deltaTime;
        if (this.cageSpawnTimer > 15) {
            if (!this.testMode && this.cages.length < 1) this.spawnCage();
            this.cageSpawnTimer = 0;
        }

        this.weaponCrateSpawnTimer += deltaTime;
        if (this.weaponCrateSpawnTimer > 25) {
            if (!this.testMode && this.weaponCrates.length < 2) this.spawnWeaponCrate();
            this.weaponCrateSpawnTimer = 0;
        }

        let newBullets = [];
        if (this.squad) {
            const squadBullets = this.squad.update(deltaTime, this.inputHandler);
            newBullets.push(...squadBullets);
            if (this.squad.soldiers.length === 0) this.handleGameOver();
        }

        this.enemies.forEach(enemy => {
            const enemyBullets = enemy.update(deltaTime, this.squad);
            newBullets.push(...enemyBullets);
        });

        this.bullets.push(...newBullets);

        this.bullets.forEach(bullet => bullet.update(deltaTime));
        this.bullets = this.bullets.filter(bullet => 
            bullet.x >= -50 && bullet.x <= this.width + 50 &&
            bullet.y >= -50 && bullet.y <= this.height + 50 &&
            !bullet.markedForDeletion
        );

        this.handleEnemySeparation(deltaTime);
        this.handlePlayerEnemyCollision();
        this.checkCollisions();
        this.handleCageRescue();
        this.handleWeaponCratePickup();
    }

    handleGameOver() {
        this.state = 'GAME_OVER';
        this.menuManager.setMenuState('GAME_OVER');
    }

    handleWeaponCratePickup() {
        if (!this.squad) return;
        for (let i = this.weaponCrates.length - 1; i >= 0; i--) {
            const crate = this.weaponCrates[i];
            const dist = Math.hypot(this.squad.x - (crate.x + 15), this.squad.y - (crate.y + 15));
            if (dist < 40) {
                // Wähle zufälligen Soldaten aus (jedes Squad-Mitglied kann die Kiste aufnehmen)
                const candidates = this.squad.soldiers;
                if (candidates.length > 0) {
                    const luckySoldier = candidates[Math.floor(Math.random() * candidates.length)];
                    luckySoldier.equipWeapon(crate.weaponType);
                }
                // Kiste entfernen in jedem Fall
                this.weaponCrates.splice(i, 1);
            }
        }
    }

    handleCageRescue() {
        if (!this.squad) return;
        for (let i = this.cages.length - 1; i >= 0; i--) {
            const cage = this.cages[i];
            let touched = false;
            for (let soldier of this.squad.soldiers) {
                const dist = Math.hypot(soldier.x - (cage.x + 20), soldier.y - (cage.y + 20));
                if (dist < 30) { touched = true; break; }
            }
            if (touched) {
                this.cages.splice(i, 1);
                this.squad.addSoldier();
            }
        }
    }

    handleEnemySeparation(deltaTime) {
        for (let i = 0; i < this.enemies.length; i++) {
            for (let j = i + 1; j < this.enemies.length; j++) {
                const e1 = this.enemies[i]; const e2 = this.enemies[j];
                const dx = e1.x - e2.x; const dy = e1.y - e2.y;
                const distSq = dx*dx + dy*dy; 
                if (distSq < this.ENEMY_MIN_DIST * this.ENEMY_MIN_DIST && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = this.ENEMY_MIN_DIST - dist;
                    const nx = dx / dist; const ny = dy / dist;
                    const force = overlap * 5 * deltaTime; 
                    e1.x += nx * force; e1.y += ny * force;
                    e2.x -= nx * force; e2.y -= ny * force;
                }
            }
        }
    }

    handlePlayerEnemyCollision() {
        if (!this.squad) return;
        const squadRadius = 40;
        for (let enemy of this.enemies) {
            const dx = this.squad.x - enemy.x;
            const dy = this.squad.y - enemy.y;
            const distSq = dx*dx + dy*dy;
            const minDist = squadRadius + enemy.width/2;
            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist; const ny = dy / dist;
                const pushForce = overlap; 
                this.squad.x += nx * pushForce; this.squad.y += ny * pushForce;
                enemy.x -= nx * pushForce * 0.2; enemy.y -= ny * pushForce * 0.2;
            }
        }
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i]; let hit = false;
            if (b.owner === 'player') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const e = this.enemies[j];
                    if (Math.hypot(b.x - (e.x + 10), b.y - (e.y + 10)) < e.width/2 + b.radius) {
                        e.hp -= b.damage; hit = true;
                        if (e.hp <= 0) this.enemies.splice(j, 1); 
                        break; 
                    }
                }
            } else if (b.owner === 'enemy' && this.squad) {
                for (let k = this.squad.soldiers.length - 1; k >= 0; k--) {
                    const soldier = this.squad.soldiers[k];
                    if (Math.hypot(b.x - (soldier.x + 10), b.y - (soldier.y + 10)) < soldier.width/2 + b.radius) {
                        const isDead = soldier.takeDamage(b.damage); hit = true;
                        if (isDead) {
                            this.squad.soldiers.splice(k, 1);
                        }
                        break;
                    }
                }
            }
            if (hit) this.bullets.splice(i, 1);
        }
    }

    draw() {
        this.ctx.fillStyle = '#2c3e50'; 
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.drawGrid();
        this.cages.forEach(cage => cage.draw(this.ctx));
        this.weaponCrates.forEach(crate => crate.draw(this.ctx));
        if (this.squad) this.squad.draw(this.ctx);
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.bullets.forEach(bullet => bullet.draw(this.ctx));

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Courier New';
        this.ctx.fillText(`X: ${Math.round(this.squad?.x || 0)} Y: ${Math.round(this.squad?.y || 0)}`, 20, 50);
        if(this.squad && this.squad.soldiers.length > 0) {
            const leader = this.squad.soldiers[0];
            this.ctx.fillText(`Lead HP: ${leader.hp}/5`, 20, 75);
            this.ctx.fillText(`Ammo: ${leader.weapon.currentAmmo}`, 20, 100);
        }
        this.ctx.fillText(`Enemies: ${this.enemies.length}/${this.MAX_ENEMIES}`, 20, 125);
        this.ctx.fillText(`Squad: ${this.squad?.soldiers.length || 0}/${this.MAX_SQUAD_SIZE}`, 20, 150);
    }

    drawGrid() {
        this.ctx.strokeStyle = '#34495e'; this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x += 50) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height); this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += 50) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y); this.ctx.stroke();
        }
    }
}