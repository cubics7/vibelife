export class InputHandler {
    constructor(canvas) {
        this.keys = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };

        // Tastatur-Events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Maus-Events (Position relativ zum Canvas)
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
            
            // Für den Moment ist Screen = World (da noch keine Kamera)
            this.mouse.worldX = this.mouse.x;
            this.mouse.worldY = this.mouse.y;
        });

        canvas.addEventListener('mousedown', () => {
            this.mouse.down = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
    }
}