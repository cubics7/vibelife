import { Soldier } from './Soldier.js';

export class Squad {
    constructor() {
        this.soldiers = [];
        this.x = 512; 
        this.y = 384;
        this.speed = 150;
    }

    addSoldier() {
        // Erstelle neuen Soldaten an aktueller Squad-Position
        this.soldiers.push(new Soldier(this.x, this.y));
    }

    update(deltaTime, input) {
        // 1. Squad-Bewegung (Wie zuvor)
        let dx = 0;
        let dy = 0;

        if (input.keys['w']) dy -= 1;
        if (input.keys['s']) dy += 1;
        if (input.keys['a']) dx -= 1;
        if (input.keys['d']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
            this.x += dx * this.speed * deltaTime;
            this.y += dy * this.speed * deltaTime;
        }

        // Grenzen
        this.x = Math.max(0, Math.min(this.x, 1024 - 20)); 
        this.y = Math.max(0, Math.min(this.y, 768 - 20));

        // 2. Soldaten Update & Formation
        let newBullets = [];
        const count = this.soldiers.length;
        const formationRadius = 35; // Abstand der Soldaten vom Zentrum

        this.soldiers.forEach((soldier, index) => {
            // Kreisförmige Verteilung
            // Soldat 0 (Leader) ist in der Mitte (0,0)
            // Soldat 1 ist rechts, Soldat 2 links unten, etc.
            const angleStep = (Math.PI * 2) / Math.max(1, count);
            const angle = index * angleStep;

            let offsetX = 0;
            let offsetY = 0;

            if (count > 1) {
                offsetX = Math.cos(angle) * formationRadius;
                offsetY = Math.sin(angle) * formationRadius;
            }

            // Position setzen
            soldier.x = this.x + offsetX;
            soldier.y = this.y + offsetY;

            // Soldat Updaten (schießen etc.)
            const bullets = soldier.update(deltaTime, input);
            newBullets.push(...bullets);
        });

        return newBullets;
    }

    draw(ctx) {
        // Zeichne zuerst eine Linie zum Mittelpunkt (Optional, um Zentrum zu sehen)
        // Wir überspringen das für sauberere Grafik

        this.soldiers.forEach(soldier => soldier.draw(ctx));
    }
}