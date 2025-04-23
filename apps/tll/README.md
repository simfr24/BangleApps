# Train Log Logger (TLL)

A super-small GPS track logger for Bangle.js 2.

* Logs one sample every **10 s** (configurable), filtered by HDOP ≤ 5  
  → small files, low battery impact.
* Saves each session as **GPX** (`tll_###.gpx`) in flash storage.
* Two console helpers  
  `listGPX()` – list files  
  `getGPX("file.gpx")` – print file → browser/app can download.
* Simple one-tap UI: tap once to stop + save.

![icon](trainloglogger.png)

## Usage

* `Launcher → Train Log Logger (TLL)`.
* Wait for a GPS fix (HDOP turns green), start moving.
* **Tap once** to finish logging – GPX is saved automatically.
* Pull tracks from a phone/PC with the companion web page or any BLE console  
  (`listGPX();`, `getGPX("mytrack.gpx");`).

## Controls

| Action | What it does |
| ------ | ------------ |
| Tap (while logging) | Stop and save GPX |
| BTN1 (long)         | Exit to launcher |
