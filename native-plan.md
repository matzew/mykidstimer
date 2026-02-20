# KidsTimer - Native App Strategie

## Phase 1: PWA (aktuell)
- Web-App als Progressive Web App installierbar machen
- Service Worker fuer Offline-Faehigkeit
- App-Icons (generiert aus `assets/mascot.svg`)
- Testen via GitHub Pages: "Zum Startbildschirm hinzufuegen"
- Feedback sammeln

## Phase 2: Capacitor
- Nach positivem Feedback: Capacitor integrieren
- Native Wrapper um die bestehende Web-App
- Zugriff auf native APIs (Notifications, Haptics etc.)
- Lokales Testen auf iOS/Android

## Phase 3: App Store
- Apple App Store + Google Play Store Deployment
- Store-Listing, Screenshots, Beschreibung
- Review-Prozess durchlaufen

## Icons
Alle Icons liegen in `icons/`. Zum Austauschen einfach neue PNGs in den gleichen Groessen ablegen:
- `icon-192.png` (192x192) - PWA
- `icon-512.png` (512x512) - PWA
- `apple-touch-icon.png` (180x180) - iOS

Das `manifest.json` und die `index.html` muessen dabei nicht geaendert werden.
