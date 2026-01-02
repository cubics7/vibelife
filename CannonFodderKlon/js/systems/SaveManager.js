export class SaveManager {
    constructor() {
        this.saveKey = 'cannonFodderSave_v1';
    }

    // Speichern: Objekt -> JSON -> Base64 String
    save(gameData) {
        // 1. Validierung vor dem Speichern (Sicherheitscheck der Struktur)
        if (!this.validate(gameData)) {
            console.error("SaveManager: Datenstruktur ungültig vor dem Speichern.");
            throw new Error("Interner Fehler: Datenstruktur ungültig.");
        }

        // 2. Serialisieren und Kodieren
        const json = JSON.stringify(gameData);
        const base64 = btoa(json);

        // 3. Im LocalStorage speichern
        try {
            localStorage.setItem(this.saveKey, base64);
        } catch (e) {
            console.error("LocalStorage voll oder blockiert:", e);
            // Wir werfen keinen Fehler, damit der Spieler den String zumindest kopieren kann
        }

        return base64;
    }

    // Laden: Base64 String -> JSON -> Objekt
    load(saveString) {
        try {
            // 1. Dekodieren
            const json = atob(saveString);
            
            // 2. Parsen (SICHERHEIT: Kein eval!)
            const data = JSON.parse(json);

            // 3. Schema-Validierung (WICHTIG für Sicherheit)
            if (!this.validate(data)) {
                throw new Error("Save-Datei beschädigt oder ungültig.");
            }

            return data;
        } catch (e) {
            console.error("Fehler beim Laden:", e);
            throw e;
        }
    }

    // Schema-Validierung: Prüft, ob alle erwarteten Felder vorhanden und korrekt typisiert sind
    validate(data) {
        if (!data || typeof data !== 'object') return false;

        // Prüfe Squad
        if (!data.squad || typeof data.squad !== 'object') return false;
        if (typeof data.squad.x !== 'number' || typeof data.squad.y !== 'number') return false;
        if (!Array.isArray(data.squad.soldiers)) return false;

        // Prüfe jeden Soldaten
        for (const s of data.squad.soldiers) {
            if (typeof s.hp !== 'number' || typeof s.weaponType !== 'string') return false;
        }

        // Prüfe Enemies (Existieren und sind Array)
        if (!Array.isArray(data.enemies)) return false;

        return true;
    }

    // Hilfsfunktion: Speichere String in Textarea
    updateExportArea(text) {
        const textarea = document.getElementById('save-string-out');
        if (textarea) {
            // XSS Schutz: textContent statt innerHTML
            textarea.textContent = text;
        }
    }

    // Hilfsfunktion: Lese String aus Textarea
    getImportString() {
        const textarea = document.getElementById('save-string-in');
        if (textarea) {
            return textarea.value.trim();
        }
        return '';
    }
}