/****************************************************************
 * trainloglogger – Bangle.js 2
 * -------------------------------------------------------------
 * Logs GPS points as GPX (stream‑written to flash)
 * Shows elapsed time, point count, satellites, HDOP, and SPEED.
 ****************************************************************/

/* ─────────────────────────  configuration  ────────────────── */
const HDOP_THRESHOLD = 5.0;   // log only if hdop ≤ this value
const LOG_INTERVAL   = 10000; // ms between logged points

/* ─────────────────────────  runtime vars  ─────────────────── */
let isRecording = false;
let startTime;
let lastFix     = null;
let currentTime = new Date();
let touchHandler, gpsListener;
let logFile, logFileName;
let pointCount  = 0;          // keep only the count in RAM

/* ─────────────────────────  helpers  ──────────────────────── */
function iso(d){ return d.toISOString().replace(/\.\d{3}Z$/, "Z"); }
function hms(a,b){ const s=(b-a)/1000|0,h=s/3600|0,m=s%3600/60|0;
  return `${h}`.padStart(2,"0")+":"+`${m}`.padStart(2,"0")+":"+`${s%60}`.padStart(2,"0"); }
function nextNum(){
  return require("Storage").list(/^tll_\d+\.gpx$/)
    .reduce((n,f)=>Math.max(n,parseInt(f.match(/\d+/)[0],10)),0)+1;
}

/* ─────────────────────────  display  ──────────────────────── */
function updateDisplay(){
  g.clear();
  g.setFont("6x8",1).setFontAlign(0,0).drawString("TLL", g.getWidth()/2, 12);

  if(isRecording){
    g.setFont("6x8",2);
    g.drawString(hms(startTime,currentTime), g.getWidth()/2, 50);
    g.drawString(`Points: ${pointCount}`,    g.getWidth()/2, 80);

    /* ── Speed line (km/h) ── */
    const speedKmh = (lastFix && lastFix.speed!=null) ? (lastFix.speed*3.6).toFixed(1) : "--.-";
    g.setFont("6x8",1);
    g.drawString(`Speed: ${speedKmh} km/h`, g.getWidth()/2, 110);

    g.drawString("Tap to stop", g.getWidth()/2, 130);

    /* bottom‑line satellite/HDOP info */
    if(lastFix){
      g.setFont("6x8",1).setFontAlign(-1,0).drawString(`Sats: ${lastFix.satellites||0}`, 5, g.getHeight()-10);
      if(lastFix.hdop!==undefined){
        g.setFontAlign(1,0)
         .setColor(lastFix.hdop<=HDOP_THRESHOLD ? [0,1,0] : [1,0,0])
         .drawString(`HDOP: ${lastFix.hdop.toFixed(1)}`, g.getWidth()-5, g.getHeight()-10)
         .setColor(1);
      }
    }
  }
}

function showMsg(m){
  g.clear();
  g.setFont("6x8",2).setFontAlign(0,0).drawString(m, g.getWidth()/2, g.getHeight()/2);
  setTimeout(showMenu, 2000);
}

/* ─────────────────────────  recording  ────────────────────── */
function startRecording(){
  if(isRecording) return;
  E.showMenu();               // hide menu so touches don’t leak through

  isRecording = true;
  startTime   = new Date();
  pointCount  = 0;

  logFileName = `tll_${nextNum()}.gpx`;
  logFile     = require("Storage").open(logFileName, "w");
  logFile.write(`<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\" creator=\"trainloglogger\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n  <trk><name>Training ${iso(startTime).split("T")[0]}</name><trkseg>`);

  /* touch handler only active while recording */
  touchHandler = ()=> stopRecording();
  Bangle.on("touch", touchHandler);

  /* GPS callback */
  let lastLogTime = 0;
  gpsListener = gps => {
    lastFix = gps;
    if(gps.fix){
      const now = Date.now();
      if((gps.hdop===undefined || gps.hdop<=HDOP_THRESHOLD) && (now-lastLogTime>=LOG_INTERVAL)){
        logFile.write(`\n    <trkpt lat=\"${gps.lat}\" lon=\"${gps.lon}\"><ele>${gps.alt||0}</ele><time>${iso(new Date())}</time><hdop>${gps.hdop||0}</hdop></trkpt>`);
        pointCount++; lastLogTime = now;
      }
    }
    updateDisplay();
  };
  Bangle.on("GPS", gpsListener);
  Bangle.setGPSPower(1);
  updateDisplay();
}

function stopRecording(){
  if(!isRecording) return;
  if(Date.now() - startTime < 2000 && pointCount === 0){ // debounce first seconds
    showMsg("Waiting for GPS …");
    return;
  }

  isRecording = false;
  Bangle.setGPSPower(0);
  Bangle.removeListener("GPS", gpsListener);
  Bangle.removeListener("touch", touchHandler);

  logFile.write("\n  </trkseg></trk>\n</gpx>");
  logFile = undefined;

  showMsg(pointCount ? `Track saved\n${pointCount} points` : "No data recorded");
}

/* ─────────────────────────  menu & init  ─────────────────── */
function showMenu(){
  E.showMenu({
    "":{title:"TLL"},
    "Start Recording": startRecording,
    "Exit": ()=>Bangle.showLauncher()
  });
}

Bangle.loadWidgets();
Bangle.drawWidgets();
showMenu();
setInterval(()=>{ currentTime=new Date(); if(isRecording) updateDisplay(); },1000);
