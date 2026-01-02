export class Bullet {
    constructor(x, y, angle, speed, damage, color, owner, maxRange) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.speed = speed; // Wir speichern speed für die Range-Berechnung
        this.damage = damage;
        this.color = color;
        this.radius = 3;
        this.markedForDeletion = false;
        this.owner = owner; 
        
        // Range Logik
        this.maxRange = maxRange;
        this.distanceTraveled = 0;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Distanz aufaddieren
        this.distanceTraveled += this.speed * deltaTime;

        // Wenn Max-Reichweite erreicht, löschen
        if (this.distanceTraveled >= this.maxRange) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}