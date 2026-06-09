// MapPhaser — Auckland community map with animated trees + people pegs
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const AUCKLAND = { lat: -36.8509, lng: 174.7645 };
const NZ_CENTER = { lat: -41.5, lng: 172.8 };

// Tree spots spread across North & South Island parks, forests, and reserves
const TREE_SPOTS = [
  // — Auckland region —
  { lat: -36.8523, lng: 174.7651 }, { lat: -36.8560, lng: 174.7700 },
  { lat: -36.8480, lng: 174.7580 }, { lat: -36.8610, lng: 174.7490 },
  { lat: -36.8440, lng: 174.7760 }, { lat: -36.8590, lng: 174.7820 },
  { lat: -36.8350, lng: 174.7640 }, { lat: -36.8670, lng: 174.7560 },
  { lat: -36.9100, lng: 174.7020 }, { lat: -36.7980, lng: 174.8150 },
  // — Northland —
  { lat: -35.7270, lng: 174.3240 }, { lat: -35.4050, lng: 173.9600 },
  { lat: -34.9760, lng: 173.4640 }, { lat: -35.8500, lng: 174.4600 },
  { lat: -36.0960, lng: 174.5050 }, { lat: -35.1800, lng: 174.0800 },
  // — Waikato / Bay of Plenty —
  { lat: -37.7870, lng: 175.2820 }, { lat: -37.5500, lng: 175.1500 },
  { lat: -37.9800, lng: 176.0400 }, { lat: -37.6860, lng: 176.1660 },
  { lat: -38.1390, lng: 176.2500 }, { lat: -37.4500, lng: 175.5500 },
  { lat: -38.3500, lng: 176.4000 }, { lat: -37.0500, lng: 175.8600 },
  // — Coromandel / Gisborne —
  { lat: -36.7900, lng: 175.5000 }, { lat: -37.1500, lng: 175.8800 },
  { lat: -38.6620, lng: 178.0170 }, { lat: -38.4000, lng: 177.5000 },
  // — Hawke's Bay / Taranaki —
  { lat: -39.4900, lng: 176.9100 }, { lat: -39.6500, lng: 176.8000 },
  { lat: -39.0660, lng: 174.0830 }, { lat: -39.2500, lng: 174.2000 },
  { lat: -39.4500, lng: 174.4500 }, { lat: -38.7000, lng: 174.7000 },
  // — Whanganui / Manawatu —
  { lat: -39.9320, lng: 175.0530 }, { lat: -40.1000, lng: 175.3000 },
  { lat: -40.3520, lng: 175.6080 }, { lat: -40.5500, lng: 175.8000 },
  // — Wairarapa / Wellington —
  { lat: -40.9500, lng: 175.6600 }, { lat: -41.0500, lng: 175.4000 },
  { lat: -41.2870, lng: 174.7760 }, { lat: -41.1500, lng: 174.9500 },
  { lat: -41.4000, lng: 174.6500 }, { lat: -41.3200, lng: 174.8500 },
  // — Nelson / Marlborough —
  { lat: -41.2710, lng: 173.2840 }, { lat: -41.1500, lng: 173.5000 },
  { lat: -41.5140, lng: 173.9610 }, { lat: -41.7500, lng: 173.8000 },
  { lat: -42.4000, lng: 173.6800 }, { lat: -41.9000, lng: 173.0000 },
  // — West Coast —
  { lat: -42.4540, lng: 171.2120 }, { lat: -42.7160, lng: 170.9740 },
  { lat: -43.3700, lng: 170.1800 }, { lat: -43.4600, lng: 170.0100 },
  { lat: -42.1000, lng: 171.5000 }, { lat: -41.7500, lng: 172.1000 },
  // — Canterbury —
  { lat: -43.5320, lng: 172.6360 }, { lat: -43.6500, lng: 172.5000 },
  { lat: -43.4500, lng: 172.8000 }, { lat: -44.4020, lng: 171.2550 },
  { lat: -43.9000, lng: 170.4500 }, { lat: -44.1000, lng: 171.0000 },
  // — Otago / Queenstown —
  { lat: -45.0310, lng: 168.6630 }, { lat: -44.7000, lng: 169.1300 },
  { lat: -44.2500, lng: 169.8800 }, { lat: -45.8880, lng: 170.5020 },
  { lat: -45.6000, lng: 170.1000 }, { lat: -45.3500, lng: 168.9000 },
  // — Fiordland / Southland —
  { lat: -45.4130, lng: 167.7200 }, { lat: -45.6500, lng: 167.9000 },
  { lat: -46.4130, lng: 168.3560 }, { lat: -46.2000, lng: 168.0000 },
  { lat: -46.0000, lng: 167.5000 }, { lat: -45.8500, lng: 168.8000 },
];

// Heuristic gender prediction from first name (for sprite variety only)
const predictGender = (name = '') => {
  const first = (name || '').trim().split(/[\s,]+/)[0].toLowerCase().replace(/[^a-z]/g, '');
  if (!first) return 'neutral';
  const fem = new Set(['emma','olivia','ava','sophia','isabella','mia','charlotte','amelia','harper','evelyn','abigail','emily','ella','elizabeth','camila','luna','sofia','grace','chloe','penelope','riley','zoey','nora','lily','eleanor','hannah','addison','aubrey','ellie','stella','natalie','zoe','leah','hazel','violet','aurora','savannah','audrey','brooklyn','bella','claire','skylar','lucy','anna','caroline','nova','emilia','kennedy','samantha','maya','willow','kinsley','naomi','aaliyah','elena','sarah','ariana','allison','gabriella','alice','madelyn','cora','ruby','eva','serenity','autumn','adeline','hailey','gianna','valentina','isla','eliana','quinn','ivy','sadie','piper','lydia','alexa','josephine','emery','julia','delilah','arianna','vivian','kaylee','sophie','brielle','madeline','peyton','rylee','clara','hadley','melanie','mackenzie','reagan','liliana','ashley','amber','jessica','jennifer','lisa','michelle','patricia','linda','barbara','margaret','sandra','betty','dorothy','helen','carol','ruth','sharon','laura','amy','kathleen','shirley','angela','brenda','pamela','martha','deborah','stephanie','rebecca','carolyn','janet','virginia','maria','heather','diane','julie','joyce','kelly','tiffany','june','gloria','cheryl','connie','jacqueline','sylvia','dawn','theresa','georgia','ann','gail','doris','alma','norma','lena','pearl','viola','mabel','ethel','frances','lillian','edna','gertrude','mae','fiona','siobhan','aoife','niamh','caitlin','sinead','brigid','orla','roisin','taylor','madison','morgan','alexis','courtney','brittany','megan','danielle','natasha','vanessa','diana','holly','heidi','mandy','cindy','wendy','sandy','brandy','tammy','jenny','penny','daisy','patsy','betsy','kelsey','chelsea','lacey','stacy','tracy','kasey','destiny','harmony','melody','charity','felicity','trinity','natalie','rosie','rosemary','rosa','claudia','carla','carmen','cristina','fernanda','gabriela','isabel','lucia','mariana','paola','paula','raquel','silvia','valeria','zara','jade','kim','jess','kate','katie','karen','kathy','kay','kimberley','kimberly','kirsten','kylie','kourtney','krista','kristin','kristina']);
  const masc = new Set(['liam','noah','william','james','oliver','benjamin','elijah','lucas','mason','ethan','daniel','jacob','logan','jackson','sebastian','jack','aiden','owen','samuel','ryan','nathan','luke','christian','josiah','henry','wyatt','andrew','adam','jaxon','carter','grayson','julian','levi','asher','jayden','mateo','leo','gabriel','isaiah','nolan','david','landon','dylan','evan','caleb','jaxson','oscar','dominic','chase','cameron','jordan','eli','tyler','austin','cooper','bentley','cole','nicolas','jace','roman','tucker','miles','blake','alex','ian','brody','derek','sean','eric','marcus','theodore','max','finn','shane','dean','kyle','zach','jake','mike','john','tom','rob','bob','pete','mark','paul','george','charles','richard','gary','donald','kenneth','steven','edward','brian','ronald','anthony','kevin','jason','matthew','timothy','jose','larry','jeffrey','frank','scott','stephen','raymond','gregory','joshua','jerry','dennis','walter','patrick','peter','harold','douglas','carl','arthur','roger','joe','juan','albert','jonathan','justin','terry','gerald','keith','willie','ralph','lawrence','nicholas','roy','bruce','brandon','harry','fred','wayne','billy','steve','louis','jeremy','aaron','randy','howard','eugene','carlos','russell','bobby','victor','martin','ernest','phillip','todd','jesse','craig','alan','shawn','clarence','philip','chris','johnny','earl','jimmy','antonio','danny','bryan','tony','luis','stanley','leonard','dale','manuel','rodney','curtis','norman','allen','marvin','vincent','glenn','travis','jeff','chad','melvin','alfred','neil','derrick','corey','brett','edgar','mario','roberto','lance','jared','rory','declan','conor','brendan','cian','oisin','padraig','seamus','eoin','colm','cormac','cathal','donal','feargal','kieran','killian','niall','ronan','ruairi','darragh','diarmuid','eoghan','fionn','lorcan','tadhg','fergus','callum','hamish','angus','alistair','iain','ewan','fraser','duncan','malcolm','douglas','ross','graeme','gordon','stuart','nigel','ian','bruce','craig','murray','robbie','drew','theo','ben','sam','tim','dan','ken','bill','jim','ray','ron','ed','al','dave','nick','greg','brad','chad','todd','troy','lance','travis','dustin','wyatt','zane','bryce','colton','brayden','kayden','hayden','caden','kaden','darren','warren']);
  if (fem.has(first)) return 'female';
  if (masc.has(first)) return 'male';
  const femEnd = ['elle','ette','ine','ina','ia','lla','na','ra','sa','ya','lee','lie','ree','ie','ee'];
  const mascEnd = ['ton','son','sen','ren','den','ken','ron','don','dan','man','lan','ler','ter','ner','ber','ard','ert','ck','rk','nk','ox','us'];
  for (const e of femEnd) { if (first.endsWith(e) && first.length > e.length + 1) return 'female'; }
  for (const e of mascEnd) { if (first.endsWith(e) && first.length > e.length + 1) return 'male'; }
  return 'neutral';
};

const SKIN_TONES = ['#f5cba7', '#e8a87c', '#d4836a', '#c06838', '#8d4e2a', '#fadbb0'];

// Animated SVG sprite icon — gender predicted from display name
const makePersonIcon = (seed = 0, name = '') => {
  const gender = predictGender(name);
  const hues = [260, 200, 320, 160, 40, 0, 180];
  const h = hues[seed % hues.length];
  const skin      = SKIN_TONES[seed % SKIN_TONES.length];
  const delay     = (seed * 0.17).toFixed(2);
  const noteDelay = (seed * 0.53).toFixed(2);
  const notes = ['\u266a', '\u266b', '\u2669'];
  const note      = notes[seed % notes.length];
  const shirt     = `hsl(${h},55%,45%)`;
  const shirtDark = `hsl(${h},55%,32%)`;
  const dress     = `hsl(${h},65%,58%)`;
  const dressDk   = `hsl(${h},65%,44%)`;
  const hair      = `hsl(${(h + 40) % 360},50%,28%)`;

  let svg = '';
  if (gender === 'male') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="44" viewBox="0 0 26 44" style="display:block;overflow:visible">`
      + `<rect x="6" y="1" width="14" height="5" fill="${shirtDark}" rx="2"/>`
      + `<rect x="3" y="5.5" width="20" height="2" fill="${shirtDark}" rx="1"/>`
      + `<rect x="7.5" y="7" width="11" height="10" fill="${skin}" rx="2"/>`
      + `<rect x="9" y="10" width="2" height="2" fill="#1a0800" rx="0.5"/>`
      + `<rect x="15" y="10" width="2" height="2" fill="#1a0800" rx="0.5"/>`
      + `<rect x="10" y="14.5" width="6" height="1.5" fill="#a05030" rx="0.5"/>`
      + `<rect x="10" y="17" width="6" height="3" fill="${skin}"/>`
      + `<rect x="4" y="20" width="18" height="9" fill="${shirt}" rx="1"/>`
      + `<rect x="1.5" y="20" width="3" height="7" fill="${shirt}" rx="1"/>`
      + `<rect x="21.5" y="20" width="3" height="7" fill="${shirt}" rx="1"/>`
      + `<rect x="1.5" y="26" width="3" height="3" fill="${skin}" rx="1"/>`
      + `<rect x="21.5" y="26" width="3" height="3" fill="${skin}" rx="1"/>`
      + `<rect x="4" y="29" width="18" height="2" fill="#2a1a08" rx="0.5"/>`
      + `<g class="ap-leg-svg"><rect x="4.5" y="31" width="7" height="9" fill="#1e2d5a" rx="1"/><rect x="4" y="39" width="8.5" height="3.5" fill="#111" rx="1"/></g>`
      + `<g class="ap-leg-svg ap-leg-svg-r"><rect x="14.5" y="31" width="7" height="9" fill="#1e2d5a" rx="1"/><rect x="13.5" y="39" width="8.5" height="3.5" fill="#111" rx="1"/></g>`
      + `</svg>`;
  } else if (gender === 'female') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="44" viewBox="0 0 26 44" style="display:block;overflow:visible">`
      + `<ellipse cx="13" cy="8" rx="8" ry="8" fill="${hair}"/>`
      + `<rect x="4" y="6" width="3" height="10" fill="${hair}" rx="1.5"/>`
      + `<rect x="19" y="6" width="3" height="10" fill="${hair}" rx="1.5"/>`
      + `<rect x="7" y="5" width="12" height="11" fill="${skin}" rx="3"/>`
      + `<rect x="9" y="9" width="2" height="2" fill="#1a0800" rx="0.5"/>`
      + `<rect x="15" y="9" width="2" height="2" fill="#1a0800" rx="0.5"/>`
      + `<rect x="8.5" y="7.5" width="1.5" height="1.5" fill="#1a0800" rx="0.3"/>`
      + `<rect x="11" y="7.5" width="1.5" height="1.5" fill="#1a0800" rx="0.3"/>`
      + `<rect x="14" y="7.5" width="1.5" height="1.5" fill="#1a0800" rx="0.3"/>`
      + `<rect x="16" y="7.5" width="1.5" height="1.5" fill="#1a0800" rx="0.3"/>`
      + `<rect x="10" y="13" width="6" height="1.5" fill="#c05070" rx="0.5"/>`
      + `<rect x="10" y="16" width="6" height="2.5" fill="${skin}"/>`
      + `<rect x="7" y="18.5" width="12" height="7" fill="${dress}" rx="1"/>`
      + `<polygon points="4.5,25.5 21.5,25.5 24,38 2,38" fill="${dress}"/>`
      + `<polygon points="6,25.5 20,25.5 21.5,33 4.5,33" fill="${dressDk}" opacity="0.22"/>`
      + `<rect x="9" y="38" width="3.5" height="5" fill="${skin}" rx="1"/>`
      + `<rect x="13.5" y="38" width="3.5" height="5" fill="${skin}" rx="1"/>`
      + `<rect x="8" y="41" width="5.5" height="2.5" fill="#c05070" rx="1"/>`
      + `<rect x="13" y="41" width="5.5" height="2.5" fill="#c05070" rx="1"/>`
      + `</svg>`;
  } else {
    // neutral — casual hoodie
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="44" viewBox="0 0 26 44" style="display:block;overflow:visible">`
      + `<rect x="6" y="1" width="14" height="9" fill="${hair}" rx="3"/>`
      + `<rect x="7.5" y="7" width="11" height="10" fill="${skin}" rx="2"/>`
      + `<rect x="9" y="10" width="2" height="2" fill="#1a0800" rx="0.5"/>`
      + `<rect x="15" y="10" width="2" height="2" fill="#1a0800" rx="0.5"/>`
      + `<rect x="10.5" y="14" width="5" height="1.5" fill="#a06050" rx="0.5"/>`
      + `<rect x="10" y="17" width="6" height="3" fill="${skin}"/>`
      + `<rect x="4" y="20" width="18" height="9" fill="${shirt}" rx="3"/>`
      + `<rect x="1.5" y="20" width="3.5" height="8" fill="${shirt}" rx="1.5"/>`
      + `<rect x="21" y="20" width="3.5" height="8" fill="${shirt}" rx="1.5"/>`
      + `<rect x="1.5" y="27" width="3.5" height="3" fill="${skin}" rx="1"/>`
      + `<rect x="21" y="27" width="3.5" height="3" fill="${skin}" rx="1"/>`
      + `<g class="ap-leg-svg"><rect x="5" y="29" width="7" height="10" fill="${shirtDark}" rx="1"/><rect x="4.5" y="38" width="8.5" height="3.5" fill="#222" rx="1"/></g>`
      + `<g class="ap-leg-svg ap-leg-svg-r"><rect x="14" y="29" width="7" height="10" fill="${shirtDark}" rx="1"/><rect x="13" y="38" width="8.5" height="3.5" fill="#222" rx="1"/></g>`
      + `</svg>`;
  }

  return L.divIcon({
    className: '',
    html: `<div class="auck-person" style="animation-delay:${delay}s;overflow:visible;width:26px;height:44px">${svg}<div class="ap-note" style="animation-delay:${noteDelay}s;color:hsl(${h},85%,68%)">${note}</div></div>`,
    iconSize: [26, 44],
    iconAnchor: [13, 44],
  });
};

// Animated tree divIcon
const makeTreeIcon = (seed = 0) => {
  const greens = ['#2d7a1f','#3a8a28','#1e6b14','#4a9a35','#267030'];
  const g = greens[seed % greens.length];
  const delay = (seed * 0.31).toFixed(2);
  return L.divIcon({
    className: '',
    html: `
      <div class="auck-tree" style="animation-delay:${delay}s;transform-origin:bottom center;">
        <div class="at-canopy-back" style="background:${g}cc"></div>
        <div class="at-canopy" style="background:${g}"></div>
        <div class="at-canopy-top" style="background:${g}dd"></div>
        <div class="at-trunk"></div>
        <div class="at-shadow"></div>
      </div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
  });
};

const youAreHereIcon = L.divIcon({
  className: '',
  html: `<div class="auck-you">
    <div class="auck-you-dot"></div>
    <div class="auck-you-ring"></div>
    <div class="auck-you-ring auck-you-ring--2"></div>
    <div class="auck-you-ring auck-you-ring--3"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const cassettteHubIcon = L.divIcon({
  className: '',
  html: `<div class="auck-cassette">
    <div class="ac-body">
      <div class="ac-window">
        <div class="ac-reel ac-reel-l"></div>
        <div class="ac-reel ac-reel-r"></div>
      </div>
    </div>
    <div class="ac-pulse"></div>
    <div class="ac-pulse ac-pulse--2"></div>
    <div class="ac-label">MIX</div>
  </div>`,
  iconSize: [38, 32],
  iconAnchor: [19, 16],
});

const ANIM_CSS = `
  @keyframes ap-bob       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes ap-walk      { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(18deg)} }
  @keyframes tree-sway    { 0%,100%{transform:rotate(0deg)} 40%{transform:rotate(2.5deg)} 70%{transform:rotate(-1.5deg)} }
  @keyframes you-pulse    { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(2.8);opacity:0} }
  @keyframes ap-note-rise { 0%{transform:translateX(-50%) translateY(0) scale(1);opacity:1} 100%{transform:translateX(-50%) translateY(-26px) scale(0.65);opacity:0} }
  @keyframes ac-reel-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ac-pulse     { 0%,100%{transform:scale(1);opacity:0.65} 50%{transform:scale(2.2);opacity:0} }
  @keyframes map-note-drift{ 0%{transform:translateY(0) rotate(-8deg);opacity:0} 12%{opacity:0.65} 85%{opacity:0.4} 100%{transform:translateY(-340px) rotate(14deg);opacity:0} }
  @keyframes map-scan     { 0%{transform:translateY(-100%)} 100%{transform:translateY(420px)} }

  .auck-person { position:relative; width:26px; height:44px; animation:ap-bob 1.1s ease-in-out infinite; cursor:pointer; overflow:visible; }
  .ap-leg-svg { transform-box:fill-box; transform-origin:top center; animation:ap-walk 0.6s ease-in-out infinite alternate; }
  .ap-leg-svg-r { animation-delay:0.3s; }
  .ap-note { position:absolute;top:-14px;left:50%;font-size:11px;font-style:normal;animation:ap-note-rise 2s ease-out infinite;pointer-events:none;text-shadow:0 0 4px currentColor; }

  .auck-tree { position:relative; width:28px; height:40px; animation:tree-sway 3.4s ease-in-out infinite; cursor:default; }
  .at-canopy-back{ position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:26px;height:20px;border-radius:50%;opacity:0.5; }
  .at-canopy     { position:absolute;bottom:14px;left:50%;transform:translateX(-50%);width:24px;height:22px;border-radius:50%; }
  .at-canopy-top { position:absolute;bottom:22px;left:50%;transform:translateX(-50%);width:16px;height:16px;border-radius:50%; }
  .at-trunk      { position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:6px;height:14px;background:#6b3d1e;border-radius:2px; }
  .at-shadow     { position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:14px;height:4px;border-radius:50%;background:rgba(0,0,0,0.18); }

  .auck-you       { position:relative;width:40px;height:40px; }
  .auck-you-dot   { position:absolute;inset:14px;border-radius:50%;background:#e63946;border:2px solid #fff;box-shadow:0 0 0 2px rgba(230,57,70,0.5); }
  .auck-you-ring  { position:absolute;inset:0;border-radius:50%;border:2px solid rgba(230,57,70,0.6);animation:you-pulse 1.6s ease-out infinite; }
  .auck-you-ring--2 { animation-delay:0.55s; }
  .auck-you-ring--3 { animation-delay:1.1s; }

  .auck-cassette { position:relative;width:38px;height:32px;cursor:pointer; }
  .ac-body { width:38px;height:22px;background:#1a003a;border-radius:4px;border:1.5px solid rgba(180,0,255,0.75);box-shadow:0 0 10px rgba(180,0,255,0.5),inset 0 0 6px rgba(180,0,255,0.2); }
  .ac-window { display:flex;justify-content:space-around;align-items:center;height:100%;padding:0 6px; }
  .ac-reel { width:8px;height:8px;border-radius:50%;border:2px solid rgba(210,0,255,0.9);box-shadow:0 0 4px rgba(200,0,255,0.6);animation:ac-reel-spin 1.1s linear infinite; }
  .ac-reel-r { animation-direction:reverse;animation-duration:0.9s; }
  .ac-pulse { position:absolute;inset:-5px;border-radius:8px;border:1.5px solid rgba(180,0,255,0.55);animation:ac-pulse 2s ease-out infinite; }
  .ac-pulse--2 { animation-delay:1s; }
  .ac-label { position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;letter-spacing:0.12em;color:rgba(210,100,255,0.9);text-shadow:0 0 6px rgba(180,0,255,0.8);white-space:nowrap; }

  .map-float-note { position:absolute;font-size:17px;pointer-events:none;animation:map-note-drift linear infinite; }
  .map-float-note--1 { left:7%;  bottom:0;animation-duration:7.2s;animation-delay:0s;   color:rgba(180,0,255,0.55); }
  .map-float-note--2 { left:21%; bottom:0;animation-duration:5.8s;animation-delay:1.4s; color:rgba(100,149,237,0.55); }
  .map-float-note--3 { left:44%; bottom:0;animation-duration:8.5s;animation-delay:2.9s; color:rgba(200,0,255,0.5); }
  .map-float-note--4 { left:66%; bottom:0;animation-duration:6.4s;animation-delay:0.8s; color:rgba(180,0,255,0.52); }
  .map-float-note--5 { left:84%; bottom:0;animation-duration:7.8s;animation-delay:3.6s; color:rgba(100,200,255,0.5); }
  .map-scan-line { position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(180,0,255,0.18) 30%,rgba(200,100,255,0.22) 50%,rgba(180,0,255,0.18) 70%,transparent);pointer-events:none;animation:map-scan 5s linear infinite;z-index:910; }

  .auck-map-panel { animation: panel-slide-in 0.22s ease-out both; }
  @keyframes panel-slide-in { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
`;

const MapPhaser = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const treeMarkersRef = useRef([]);
  const youMarkerRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load profiles with location
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('profiles')
      .select('id, display_name, username, city, bio, address_lat, address_lng')
      .not('address_lat', 'is', null)
      .not('address_lng', 'is', null)
      .then(({ data }) => setUsers(data || []));
  }, []);

  // Initialise map + geolocation
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [NZ_CENTER.lat, NZ_CENTER.lng],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Plant animated trees at Auckland green spots
    TREE_SPOTS.forEach((spot, i) => {
      const m = L.marker([spot.lat, spot.lng], { icon: makeTreeIcon(i), interactive: false }).addTo(map);
      treeMarkersRef.current.push(m);
    });

    // Mixtape exchange hub at Auckland centre
    L.marker([AUCKLAND.lat, AUCKLAND.lng], { icon: cassettteHubIcon, zIndexOffset: 300 })
      .addTo(map)
      .bindTooltip('Mixtape Exchange Hub', { direction: 'top', offset: [0, -18] });

    // Geolocation: zoom to visitor's position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14, { animate: true });
          if (youMarkerRef.current) youMarkerRef.current.remove();
          youMarkerRef.current = L.marker([latitude, longitude], { icon: youAreHereIcon, zIndexOffset: 500 })
            .addTo(map)
            .bindTooltip('You are here', { direction: 'top', offset: [0, -12] });
        },
        () => { /* permission denied — stay on Auckland */ },
        { timeout: 6000 }
      );
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      treeMarkersRef.current = [];
      youMarkerRef.current = null;
    };
  }, []);

  // Profile panel loader
  const openProfile = useCallback(async (profile) => {
    setLoadingProfile(true);
    setSelected({ profile, artwork: [], mixtapes: [] });
    const [artRes, mixRes] = await Promise.all([
      supabase.from('gallery_items').select('id,title,image_url,price,medium,year').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('mixtape_uploads').select('id,title,file_url,price,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }),
    ]);
    setSelected({ profile, artwork: artRes.data || [], mixtapes: mixRes.data || [] });
    setLoadingProfile(false);
  }, []);

  // Render animated-person markers for each user
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    users.forEach((profile, i) => {
      const lat = parseFloat(profile.address_lat);
      const lng = parseFloat(profile.address_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.marker([lat, lng], { icon: makePersonIcon(i, profile.display_name || profile.username || ''), zIndexOffset: 200 })
        .addTo(map)
        .bindTooltip(profile.display_name || profile.username || 'Member', { direction: 'top', offset: [0, -36] })
        .on('click', () => openProfile(profile));
      markersRef.current.push(marker);
    });
  }, [users, openProfile]);

  const handleBuy = (item, type) => {
    const subject = encodeURIComponent(`Purchase enquiry: ${item.title}`);
    const body = encodeURIComponent(`Hi,\n\nI'm interested in purchasing "${item.title}" (${type}) listed at NZD ${item.price}.\n\nPlease get in touch.`);
    window.open(`mailto:hello@apolloselene.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <style>{ANIM_CSS}{`
        .auck-map-panel {
          position:absolute; top:0; right:0; width:300px; max-height:400px;
          overflow-y:auto; background:var(--card-bg,#1a1a2e);
          border:1px solid var(--border-color,rgba(255,255,255,0.1));
          border-radius:12px; padding:1rem; z-index:1000;
          box-shadow:0 4px 24px rgba(0,0,0,0.4); font-size:0.85rem;
        }
        .auck-map-panel h3{margin:0 0 0.25rem;font-size:1rem}
        .auck-close{float:right;background:none;border:none;color:inherit;cursor:pointer;font-size:1.1rem;margin-top:-2px}
        .auck-section{margin-top:0.75rem}
        .auck-section h4{margin:0 0 0.4rem;font-size:0.78rem;text-transform:uppercase;opacity:0.6}
        .auck-item{display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,255,255,0.06)}
        .auck-item:last-child{border-bottom:none}
        .auck-item img{width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0}
        .auck-item-info{flex:1;min-width:0}
        .auck-item-info strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .auck-item-info span{opacity:0.65;font-size:0.78rem}
        .auck-buy-btn{flex-shrink:0;padding:0.22rem 0.55rem;border-radius:6px;border:1px solid var(--button-bg,#6c63ff);background:transparent;color:var(--button-bg,#6c63ff);cursor:pointer;font-size:0.76rem;white-space:nowrap}
        .auck-buy-btn:hover{background:var(--button-bg,#6c63ff);color:#fff}
        .auck-audio{width:100%;margin-top:0.25rem}
        .auck-empty{opacity:0.5;font-style:italic;font-size:0.8rem}
        .leaflet-container{font-family:inherit}
      `}</style>

      <div ref={containerRef} style={{ width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden' }} />

      {/* Drifting music notes + scan line overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '12px', zIndex: 900 }}>
        <span className="map-float-note map-float-note--1">♪</span>
        <span className="map-float-note map-float-note--2">♫</span>
        <span className="map-float-note map-float-note--3">♩</span>
        <span className="map-float-note map-float-note--4">♪</span>
        <span className="map-float-note map-float-note--5">♫</span>
        <div className="map-scan-line" />
      </div>

      {selected && (
        <div className="auck-map-panel">
          <button className="auck-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
          <h3>{selected.profile.display_name || selected.profile.username || 'Member'}</h3>
          {selected.profile.city && <div style={{ opacity: 0.6, fontSize: '0.76rem' }}>{selected.profile.city}</div>}
          {selected.profile.bio && <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '0.82rem' }}>{selected.profile.bio}</p>}
          {loadingProfile ? <p style={{ opacity: 0.5, marginTop: '0.75rem' }}>Loading…</p> : (
            <>
              <div className="auck-section">
                <h4>Artwork</h4>
                {selected.artwork.length === 0
                  ? <p className="auck-empty">No artwork listed yet.</p>
                  : selected.artwork.map((item) => (
                    <div key={item.id} className="auck-item">
                      {item.image_url && <img src={item.image_url} alt={item.title} />}
                      <div className="auck-item-info">
                        <strong>{item.title}</strong>
                        <span>{item.medium}{item.year ? ` · ${item.year}` : ''}</span>
                      </div>
                      {item.price != null
                        ? <button className="auck-buy-btn" onClick={() => handleBuy(item, 'artwork')}>NZD {Number(item.price).toFixed(2)}</button>
                        : <span style={{ opacity: 0.4, fontSize: '0.72rem' }}>NFS</span>}
                    </div>
                  ))}
              </div>
              <div className="auck-section">
                <h4>Mixtapes</h4>
                {selected.mixtapes.length === 0
                  ? <p className="auck-empty">No mixtapes uploaded yet.</p>
                  : selected.mixtapes.map((item) => (
                    <div key={item.id} className="auck-item" style={{ flexWrap: 'wrap' }}>
                      <div className="auck-item-info" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ flex: 1 }}>{item.title || 'Untitled Mixtape'}</strong>
                        {item.price != null && <button className="auck-buy-btn" onClick={() => handleBuy(item, 'mixtape')}>NZD {Number(item.price).toFixed(2)}</button>}
                      </div>
                      <audio className="auck-audio" controls src={item.file_url} />
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPhaser;
