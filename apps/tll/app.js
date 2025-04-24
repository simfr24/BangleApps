/****************************************************************
 * trainloglogger – Bangle.js 2
 * -------------------------------------------------------------
 * Logs GPS fixes in RAM (3×Int32 per point: lat, lon, Δt) and
 * writes a single GPX file when recording stops. **No StorageFile**.
 * Per‑point RAM cost: 12 B (≈ 28 kB for 8 h @ 10 s interval).
 ****************************************************************/

/* ───────────────────── configuration ─────────────────────── */
const HDOP_THRESHOLD = 5.0;      // only log if hdop ≤ this value
const LOG_INTERVAL   = 10000;    // ms between logged points
const PREC_FACTOR    = 1e5;      // lat/lon kept to 5 dp (≈1 m)
const INIT_POINTS    = 4096;     // initial buffer, doubles when full

/* ───────────────────── runtime variables ─────────────────── */
let isRecording = false;
let startTime, lastFix = null;
let currentTime = new Date();
let touchHandler, gpsListener;

// RAM track buffer (grows with ensureCapacity)
let buf      = new Int32Array(INIT_POINTS * 3); // 3 Int32 per point
let bufLen   = 0;   // Int32s used (multiple of 3)
let pointCnt = 0;   // points logged, shown on screen

/* ───────────────────────── helpers ───────────────────────── */
const iso = d => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const hms = (a,b)=>{const s=((b-a)/1000)|0,h=s/3600|0,m=(s%3600)/60|0;return`${h}`.padStart(2,"0")+":"+`${m}`.padStart(2,"0")+":"+`${s%60}`.padStart(2,"0");};
const nextNum = ()=>require("Storage").list(/^tll_\d+\.gpx$/).reduce((n,f)=>Math.max(n,parseInt(f.match(/\d+/)[0],10)),0)+1;
function ensureCapacity(){
  if(bufLen+3 > buf.length){
    const bigger = new Int32Array(buf.length*2);
    bigger.set(buf);
    buf = bigger;
  }
}

/* ───────────────────────── display ───────────────────────── */
function updateDisplay(){
  g.clear();
  g.setFont("6x8",1).setFontAlign(0,0).drawString("TLL", g.getWidth()/2, 12);
  if(!isRecording) return;

  g.setFont("6x8",2);
  g.drawString(hms(startTime,currentTime), g.getWidth()/2, 50);
  g.drawString(`Points: ${pointCnt}`,        g.getWidth()/2, 80);

  const speedKmh = (lastFix && lastFix.speed!=null) ? (lastFix.speed*3.6).toFixed(1) : "--.-";
  g.setFont("6x8",1);
  g.drawString(`Speed: ${speedKmh} km/h`, g.getWidth()/2, 110);
  g.drawString("Tap to stop", g.getWidth()/2, 130);

  if(lastFix){
    g.setFontAlign(-1,0).drawString(`Sats: ${lastFix.satellites||0}`, 5, g.getHeight()-10);
    if(lastFix.hdop!==undefined){
      g.setFontAlign(1,0)
       .setColor(lastFix.hdop<=HDOP_THRESHOLD?[0,1,0]:[1,0,0])
       .drawString(`HDOP: ${lastFix.hdop.toFixed(1)}`, g.getWidth()-5, g.getHeight()-10)
       .setColor(1);
    }
  }
}
function showMsg(msg){
  g.clear();
  g.setFont("6x8",2).setFontAlign(0,0).drawString(msg, g.getWidth()/2, g.getHeight()/2);
  setTimeout(showMenu, 2000);
}

/* ────────────────────── recording logic ──────────────────── */
function startRecording(){
  if(isRecording) return;
  E.showMenu();               // hide the menu beneath

  isRecording = true;
  startTime   = new Date();
  pointCnt    = 0;
  bufLen      = 0;

  touchHandler = ()=>stopRecording();
  Bangle.on("touch", touchHandler);

  let lastLogTime = 0;
  gpsListener = gps=>{
    lastFix = gps;
    const now = Date.now();
    if(gps.fix && (gps.hdop===undefined || gps.hdop<=HDOP_THRESHOLD) && (now-lastLogTime>=LOG_INTERVAL)){
      ensureCapacity();
      buf[bufLen++] = (gps.lat*PREC_FACTOR)|0;
      buf[bufLen++] = (gps.lon*PREC_FACTOR)|0;
      buf[bufLen++] = ((now-startTime)/1000)|0; // seconds since start
      pointCnt++; lastLogTime = now;
    }
    updateDisplay();
  };
  Bangle.on("GPS", gpsListener);
  Bangle.setGPSPower(1);
  updateDisplay();
}

function makeGPX(){
  if(!pointCnt) return "";
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="trainloglogger" xmlns="http://www.topografix.com/GPX/1/1">\n  <trk><name>Training ${iso(startTime).split("T")[0]}</name><trkseg>\n`;
  for(let i=0;i<bufLen;i+=3){
    const lat = buf[i]   / PREC_FACTOR;
    const lon = buf[i+1] / PREC_FACTOR;
    const t   = new Date(startTime.getTime() + buf[i+2]*1000);
    gpx += `    <trkpt lat="${lat}" lon="${lon}"><time>${iso(t)}</time></trkpt>\n`;
  }
  gpx += "  </trkseg></trk>\n</gpx>";
  return gpx;
}

function stopRecording(){
  if(!isRecording) return;
  if(Date.now()-startTime<2000 && pointCnt===0){showMsg("Waiting for GPS …");return;}

  isRecording = false;
  Bangle.setGPSPower(0);
  Bangle.removeListener("GPS", gpsListener);
  Bangle.removeListener("touch", touchHandler);

  const gpxStr = makeGPX();
  if(gpxStr){
    require("Storage").write(`tll_${nextNum()}.gpx`, gpxStr);
  }

  // free the buffer
  buf = new Int32Array(INIT_POINTS*3);
  if(global.gc) global.gc();

  showMsg(pointCnt ? `Track saved\n${pointCnt} points` : "No data recorded");
}

/* ──────────────────────── menu & init ────────────────────── */
function showMenu(){
  E.showMenu({"":{title:"TLL"},"Start Recording":startRecording,"Exit":()=>Bangle.showLauncher()});
}

Bangle.loadWidgets();
Bangle.drawWidgets();
showMenu();
setInterval(()=>{currentTime=new Date(); if(isRecording) updateDisplay();},1000);
