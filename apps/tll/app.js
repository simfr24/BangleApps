/****************************************************************
 * trainloglogger  –  Bangle.js 2  (stripped: no custom BLE)
 * -------------------------------------------------------------
 * • Logs GPS points and stores them as GPX
 * • Console helpers for browser:
 *       listGPX();          // JSON list   + <<<END>>>
 *       getGPX("file");     // file text   + <<<END>>>
 ****************************************************************/

echo(0);

/* ─────────────────────────  configuration  ────────────────── */
const HDOP_THRESHOLD = 5.0;      // log only if hdop ≤ this

/* ─────────────────────────  variables  ────────────────────── */
let gpsPoints   = [];
let isRecording = false;
let startTime;
let lastFix     = null;
let lastFixTime = null;
let currentTime = new Date();

/* ─────────────────────────  small helpers  ────────────────── */
function iso(d){ return d.toISOString().replace(/\.\d{3}Z$/, "Z"); }
function hms(a,b){ const s=(b-a)/1000|0,h=s/3600|0,m=s%3600/60|0;
  return `${h}`.padStart(2,"0")+":"+`${m}`.padStart(2,"0")+":"+`${s%60}`.padStart(2,"0"); }
function nextNum(){
  return require("Storage").list(/^tll_\d+\.gpx$/)
    .reduce((n,f)=>Math.max(n,parseInt(f.match(/\d+/)[0],10)),0)+1;
}

/* ─────────────────────────  GPX builder  ──────────────────── */
function makeGPX(){
  if(!gpsPoints.length) return "";
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="trainloglogger" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Training ${iso(startTime).split("T")[0]}</name><trkseg>`;
  gpsPoints.forEach(p=>{
    gpx += `
    <trkpt lat="${p.lat}" lon="${p.lon}">
      <ele>${p.alt||0}</ele>
      <time>${iso(p.time)}</time>
      <hdop>${p.hdop||0}</hdop>
    </trkpt>`;
  });
  return gpx + `
  </trkseg></trk>
</gpx>`;
}

/* ─────────────────────────  display  ──────────────────────── */
function updateDisplay(){
  g.clear();
  g.setFont("6x8",1).setFontAlign(0,0).drawString("TLL", g.getWidth()/2, 12);

  g.setFont("6x8",2);
  g.drawString(hms(startTime,currentTime),         g.getWidth()/2, 50);
  g.drawString(`Points: ${gpsPoints.length}`,      g.getWidth()/2, 80);

  if(lastFixTime){
    g.setFont("6x8",1);
    g.drawString(`Last fix: ${((currentTime-lastFixTime)/1000|0)}s`, g.getWidth()/2, 110);
  }
  g.drawString("Tap to stop", g.getWidth()/2, 130);

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

/* ─────────────────────────  recording  ────────────────────── */
function startRecording(){
  if(isRecording) return;
  Bangle.setGPSPower(1);
  gpsPoints=[]; isRecording=true; startTime=new Date(); updateDisplay();
  let lastLogTime = 0;

  Bangle.on("GPS", gps => {
    lastFix = gps;
    if (gps.fix) {
      lastFixTime = new Date();
      const now = Date.now();
  
      if (
        (gps.hdop === undefined || gps.hdop <= HDOP_THRESHOLD) &&
        (now - lastLogTime >= 10000)
      ) {
        gpsPoints.push({
          lat: gps.lat,
          lon: gps.lon,
          alt: gps.alt,
          hdop: gps.hdop,
          time: new Date()
        });
        lastLogTime = now; // update only when we actually logged a point
      }
    }
    updateDisplay();
  });
}

function stopRecording(){
  if(!isRecording) return;
  isRecording=false;
  Bangle.setGPSPower(0);
  Bangle.removeAllListeners("GPS");

  if (gpsPoints.length) {
    let xml = makeGPX();
    xml = xml.replace(/\s{2,}/g, "");     // collapse runs of 2+ spaces
    xml = xml.replace(/>\s+</g, "><");    // remove space between tags
    xml = xml.trim();                     // remove leading/trailing whitespace
    require("Storage").write(`tll_${nextNum()}.gpx`, xml);
    showMsg("Track saved");
  } else showMsg("No data recorded");
}

/* ─────────────────────────  console helpers  ──────────────── */
function _send(txt){ Bluetooth.println(txt); Bluetooth.println("<<<END>>>"); }

global.listGPX = function(){
  _send(JSON.stringify(require("Storage").list(/\.gpx$/)));
};

global.getGPX = function(name){
  const d = require("Storage").read(name);
  _send(d!==undefined ? d : "ERROR: File not found");
};

/* ─────────────────────────  simple UI  ────────────────────── */
function showMsg(m){ g.clear(); g.setFont("6x8",2).setFontAlign(0,0)
  .drawString(m, g.getWidth()/2, g.getHeight()/2);
  setTimeout(showMenu, 2000);
}

function showMenu(){
  E.showMenu({
    "":{title:"TLL"},
    "Start Recording": startRecording,
    "Exit":             ()=>Bangle.showLauncher()
  });
}

/* ─────────────────────────  init  ─────────────────────────── */
Bangle.loadWidgets(); Bangle.drawWidgets();
showMenu();
Bangle.on("touch",()=>{ if(isRecording) stopRecording(); });
setInterval(()=>{ currentTime=new Date(); if(isRecording) updateDisplay(); },1000);
