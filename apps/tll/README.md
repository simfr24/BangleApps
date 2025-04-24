# Train Log Logger (TLL)

*A super‑small GPS track logger for **Bangle.js 2** – one tap, one file, done.*

![icon](trainloglogger.png)

---

## Features

* Samples every **10 s** (change `LOG_INTERVAL`) **only** when HDOP ≤ 5 → tiny GPX + low battery use.
* Writes points **directly to flash** so you can record all day without running out of RAM.
* Live on‑screen stats: elapsed time, point count, **speed (km/h)**, satellites, HDOP (green = good).
* Saves each session as a standard **GPX** named `tll_###.gpx` in internal storage.
* Ultra‑simple UI: start from the launcher, **tap once** to finish.

---

## Using TLL on the watch

1. Open **Launcher → Train Log Logger**.
2. Wait until the HDOP indicator turns **green** (good 3‑D fix).
3. Head out – logging starts automatically.
4. **Tap once** to stop; the GPX is closed and stored.

Long‑press **BTN1** at any time to exit to the launcher.

---

## Exporting tracks to Trainlog

TLL integrates with the Web‑Bluetooth uploader hosted on Trainlog:

```
https://trainlog.me/<username>/tll
```

Replace `<username>` with your Trainlog account name and follow these steps:

1. Open the link in a Web‑Bluetooth‑capable browser (Chrome/Edge on Android, Chrome/Edge/Chromium on desktop).
2. Optionally type *Notes* that will be attached to all uploaded activities.
3. Click **Connect and Upload GPX Files**.
4. Select your **Bangle.js** in the Bluetooth chooser.
5. The page automatically:
   * Lists every `tll_###.gpx` file on the watch.
   * Downloads each file over BLE.
   * Uploads them straight to your Trainlog account.
6. When you see *Upload complete* the activities are already available in Trainlog.

> The uploader leaves the GPX files on the watch so you can still back‑up or delete them later via the Web IDE’s File Manager.

---

## Configuration constants

| Constant       | Default | Purpose                                   |
|----------------|---------|-------------------------------------------|
| `LOG_INTERVAL` | `10000` | ms between logged points                  |
| `HDOP_THRESHOLD` | `5.0` | ignore fixes with HDOP above this value   |
