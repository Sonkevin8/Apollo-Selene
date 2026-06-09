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

// Major NZ cities — pixel-art building markers
const CITIES = [
  { lat: -36.8509, lng: 174.7645, name: 'Auckland',        size: 'large'  },
  { lat: -41.2865, lng: 174.7762, name: 'Wellington',      size: 'large'  },
  { lat: -43.5321, lng: 172.6362, name: 'Christchurch',    size: 'large'  },
  { lat: -45.8788, lng: 170.5028, name: 'Dunedin',         size: 'medium' },
  { lat: -37.7870, lng: 175.2793, name: 'Hamilton',        size: 'medium' },
  { lat: -37.6878, lng: 176.1651, name: 'Tauranga',        size: 'medium' },
  { lat: -39.4928, lng: 176.9120, name: 'Napier',          size: 'small'  },
  { lat: -39.0556, lng: 174.0752, name: 'New Plymouth',    size: 'small'  },
  { lat: -41.2706, lng: 173.2840, name: 'Nelson',          size: 'small'  },
  { lat: -45.0312, lng: 168.6626, name: 'Queenstown',      size: 'small'  },
  { lat: -38.1368, lng: 176.2497, name: 'Rotorua',         size: 'small'  },
  { lat: -46.4132, lng: 168.3538, name: 'Invercargill',    size: 'small'  },
  { lat: -39.9300, lng: 175.0500, name: 'Whanganui',       size: 'small'  },
  { lat: -40.3523, lng: 175.6082, name: 'Palmerston North',size: 'small'  },
];

// Famous NZ landmarks
const LANDMARKS = [
  { lat: -36.8484, lng: 174.7622, name: 'Sky Tower',          type: 'tower'      },
  { lat: -37.8726, lng: 175.6821, name: 'Hobbiton',           type: 'hobbit'     },
  { lat: -38.0827, lng: 176.2761, name: 'Wai-O-Tapu',         type: 'geyser'     },
  { lat: -43.5959, lng: 170.1415, name: 'Aoraki / Mt Cook',   type: 'mountain'   },
  { lat: -44.6703, lng: 167.9270, name: 'Milford Sound',      type: 'fjord'      },
  { lat: -34.4292, lng: 172.6762, name: 'Cape Reinga',        type: 'lighthouse' },
  { lat: -43.3868, lng: 170.1856, name: 'Franz Josef Glacier',type: 'glacier'    },
  { lat: -38.6833, lng: 176.0731, name: 'Lake Taupō',         type: 'lake'       },
  { lat: -39.2987, lng: 175.5644, name: 'Mt Ruapehu',         type: 'volcano'    },
  { lat: -44.7000, lng: 169.1500, name: 'Lake Wānaka',        type: 'lake'       },
];

// Major NZ rivers as simplified polyline paths
const RIVERS = [
  { name: 'Waikato River',          coords: [[-38.69,176.07],[-38.37,175.85],[-38.04,175.65],[-37.79,175.28],[-37.55,175.19],[-37.24,174.98]] },
  { name: 'Whanganui River',        coords: [[-39.06,175.57],[-38.88,175.26],[-39.32,175.05],[-39.93,175.05]] },
  { name: 'Rangitīkei River',       coords: [[-39.30,175.90],[-39.70,175.70],[-40.13,175.38],[-40.28,175.26]] },
  { name: 'Clutha / Mata-Au River', coords: [[-44.70,169.13],[-45.04,169.33],[-45.25,169.38],[-45.83,169.70],[-46.24,169.75]] },
  { name: 'Waitaki River',          coords: [[-44.24,169.87],[-44.51,170.18],[-44.73,170.46],[-44.95,171.18]] },
  { name: 'Buller / Kawatiri River',coords: [[-41.80,172.50],[-41.87,171.98],[-41.75,171.60]] },
  { name: 'Manawatū River',         coords: [[-40.26,175.84],[-40.35,175.62],[-40.47,175.36],[-40.46,175.11]] },
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

// Pixel-art SVGs for landmark types
const LANDMARK_SVGS = {
  tower:      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="36" viewBox="0 0 14 36" style="image-rendering:pixelated;display:block"><rect x="5" y="0" width="4" height="8" fill="#ddd"/><rect x="3" y="8" width="8" height="3" fill="#bbb"/><rect x="4" y="11" width="6" height="20" fill="#999"/><rect x="2" y="29" width="10" height="3" fill="#777"/><rect x="0" y="32" width="14" height="4" fill="#555"/></svg>`,
  hobbit:     `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="22" viewBox="0 0 28 22" style="image-rendering:pixelated;display:block"><ellipse cx="14" cy="14" rx="12" ry="8" fill="#3a7a18"/><ellipse cx="14" cy="12" rx="7" ry="7" fill="#7a4820"/><ellipse cx="14" cy="12" rx="5" ry="5" fill="#4a8a22"/><rect x="12" y="8" width="4" height="8" fill="#5a3015"/><rect x="11" y="7" width="6" height="2" fill="#3a6a18"/></svg>`,
  geyser:     `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28" style="image-rendering:pixelated;display:block"><rect x="8" y="18" width="4" height="10" fill="#7a4820"/><ellipse cx="10" cy="18" rx="5" ry="4" fill="#5ab5cc"/><rect x="7" y="2" width="2" height="16" fill="#aadeee" class="geyser-steam"/><rect x="11" y="0" width="2" height="18" fill="#cceeee" class="geyser-steam"/><rect x="9" y="1" width="2" height="17" fill="#88ccdd" class="geyser-steam"/></svg>`,
  mountain:   `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="26" viewBox="0 0 36 26" style="image-rendering:pixelated;display:block"><polygon points="18,2 2,24 34,24" fill="#6a7a8a"/><polygon points="18,2 11,14 25,14" fill="#c8dce8"/><polygon points="18,2 14,10 22,10" fill="#f0f8ff"/></svg>`,
  fjord:      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="26" viewBox="0 0 32 26" style="image-rendering:pixelated;display:block"><polygon points="4,2 12,20 2,24" fill="#5a6a7a"/><polygon points="28,2 20,20 30,24" fill="#5a6a7a"/><rect x="0" y="20" width="32" height="6" fill="#3a7aaa"/></svg>`,
  lighthouse: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="34" viewBox="0 0 14 34" style="image-rendering:pixelated;display:block"><rect x="4" y="0" width="6" height="8" fill="#eee"/><rect x="2" y="8" width="10" height="3" fill="#ccc"/><rect x="3" y="11" width="3" height="14" fill="#ddd"/><rect x="8" y="11" width="3" height="14" fill="#ddd"/><rect x="3" y="13" width="8" height="5" fill="#e84040" class="lh-flash"/><rect x="2" y="25" width="10" height="9" fill="#bbb"/></svg>`,
  glacier:    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="24" viewBox="0 0 30 24" style="image-rendering:pixelated;display:block"><polygon points="15,1 3,18 27,18" fill="#b8d8f0"/><polygon points="15,1 9,12 21,12" fill="#daf0ff"/><polygon points="15,1 12,8 18,8" fill="#ffffff"/><rect x="2" y="18" width="26" height="4" fill="#9ac4e0"/></svg>`,
  lake:       `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18" viewBox="0 0 32 18" style="image-rendering:pixelated;display:block"><ellipse cx="16" cy="9" rx="14" ry="7" fill="#2a7aaa"/><ellipse cx="16" cy="9" rx="10" ry="4" fill="#3a8abb" opacity="0.6"/></svg>`,
  volcano:    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="28" viewBox="0 0 36 28" style="image-rendering:pixelated;display:block"><polygon points="18,4 2,26 34,26" fill="#5a3a2a"/><polygon points="18,4 13,14 23,14" fill="#8a4a2a"/><rect x="14" y="1" width="8" height="5" fill="#ff4400" class="volcano-smoke" rx="2"/><rect x="13" y="0" width="10" height="3" fill="#ff7700" class="volcano-smoke" rx="2" opacity="0.7"/></svg>`,
};

const makeLandmarkIcon = (type, name) => {
  const svg = LANDMARK_SVGS[type] || LANDMARK_SVGS.mountain;
  return L.divIcon({
    className: '',
    html: `<div class="landmark-marker landmark-marker--${type}" style="position:relative;display:inline-block">${svg}<div class="lm-label">${name}</div></div>`,
    iconSize: [36, 52],
    iconAnchor: [18, 52],
  });
};

// Pixel-art city building icon (3 sizes)
const makeCityIcon = (name, size, seed = 0) => {
  const delay = (seed * 0.23).toFixed(2);
  const pal = size === 'large'
    ? { body: '#1e3a6e', roof: '#132a5e', win: '#ffe066' }
    : size === 'medium'
    ? { body: '#1a4a1a', roof: '#0f3a0f', win: '#88ff88' }
    : { body: '#3a1a4a', roof: '#2a0f3a', win: '#dd88ff' };

  let floors = '';
  let w, h;

  if (size === 'large') {
    w = 28; h = 34;
    floors  = `<rect x="12" y="0" width="4" height="7" fill="#bbb"/>`;
    floors += `<rect x="10" y="5" width="8" height="2" fill="#999"/>`;
    floors += `<rect x="1" y="6" width="26" height="3" fill="${pal.roof}"/>`;
    floors += `<rect x="3" y="9" width="22" height="22" fill="${pal.body}"/>`;
    [[11],[16],[21]].forEach(([y]) => [5,12,19].forEach(x => {
      floors += `<rect x="${x}" y="${y}" width="4" height="3" fill="${pal.win}" class="city-win"/>`;
    }));
    floors += `<rect x="10" y="27" width="8" height="4" fill="#050d1a"/>`;
  } else if (size === 'medium') {
    w = 24; h = 28;
    floors  = `<rect x="1" y="4" width="22" height="3" fill="${pal.roof}"/>`;
    floors += `<rect x="3" y="7" width="18" height="18" fill="${pal.body}"/>`;
    [[9],[14]].forEach(([y]) => [5,15].forEach(x => {
      floors += `<rect x="${x}" y="${y}" width="4" height="3" fill="${pal.win}" class="city-win"/>`;
    }));
    floors += `<rect x="9" y="21" width="6" height="4" fill="#050d1a"/>`;
  } else {
    w = 20; h = 24;
    floors  = `<rect x="0" y="4" width="20" height="3" fill="${pal.roof}"/>`;
    floors += `<rect x="2" y="7" width="16" height="14" fill="${pal.body}"/>`;
    [4, 13].forEach(x => {
      floors += `<rect x="${x}" y="9" width="3" height="3" fill="${pal.win}" class="city-win"/>`;
    });
    floors += `<rect x="7" y="17" width="6" height="4" fill="#050d1a"/>`;
  }

  return L.divIcon({
    className: '',
    html: `<div class="city-marker city-marker--${size}" style="animation-delay:${delay}s;position:relative;display:inline-block">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;image-rendering:pixelated;overflow:visible">${floors}</svg>` +
      `<div class="city-label">${name}</div></div>`,
    iconSize: [w, h + 14],
    iconAnchor: [Math.floor(w / 2), h + 14],
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

  /* ── River flow ── */
  .river-line { stroke-dasharray:8 5; animation:river-dash 2.4s linear infinite; }
  @keyframes river-dash { to { stroke-dashoffset:-26; } }

  /* ── City buildings ── */
  @keyframes city-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
  .city-marker { animation:city-bob 3s ease-in-out infinite; }
  @keyframes city-win-flicker { 0%,88%,100%{opacity:1} 90%{opacity:0.1} 93%{opacity:1} 96%{opacity:0.3} }
  .city-win { animation:city-win-flicker 5s ease-in-out infinite; }
  .city-label { position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:5px;font-family:"Press Start 2P",monospace;color:#ffe066;text-shadow:0 0 5px #000,0 0 10px rgba(180,120,0,0.8);pointer-events:none;letter-spacing:0.05em; }

  /* ── Landmarks ── */
  @keyframes landmark-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  .landmark-marker { animation:landmark-bob 4s ease-in-out infinite; }
  @keyframes lh-flash { 0%,100%{opacity:1;fill:#e84040} 50%{opacity:0.1;fill:#ffaa00} }
  .lh-flash { animation:lh-flash 1.4s step-end infinite; }
  @keyframes geyser-steam { 0%,100%{transform:translateY(0);opacity:0.9} 50%{transform:translateY(-4px);opacity:0.4} }
  .geyser-steam { animation:geyser-steam 1.2s ease-in-out infinite; }
  @keyframes volcano-puff { 0%,100%{transform:translateY(0) scaleX(1);opacity:0.9} 50%{transform:translateY(-4px) scaleX(1.4);opacity:0.5} }
  .volcano-smoke { animation:volcano-puff 1.6s ease-in-out infinite; }
  .lm-label { position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);white-space:nowrap;max-width:70px;text-align:center;font-size:4.5px;font-family:"Press Start 2P",monospace;color:#ffdd44;text-shadow:0 0 4px #000,0 0 8px rgba(160,100,0,0.8);pointer-events:none;line-height:1.3;letter-spacing:0.03em; }

  /* ── Retro frame ── */
  .retro-map-wrap { position:relative;border:3px solid #ffe066;box-shadow:0 0 0 2px #7a4a10,0 0 24px rgba(255,224,102,0.28),inset 0 0 50px rgba(0,0,0,0.45); }
  .retro-scanlines { position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px);pointer-events:none;z-index:920; }
  .retro-vignette  { position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 38%,rgba(0,0,0,0.6) 100%);pointer-events:none;z-index:915; }
  .retro-corner { position:absolute;width:16px;height:16px;pointer-events:none;z-index:925; }
  .retro-corner--tl { top:0;left:0;border-top:3px solid #ffe066;border-left:3px solid #ffe066; }
  .retro-corner--tr { top:0;right:0;border-top:3px solid #ffe066;border-right:3px solid #ffe066; }
  .retro-corner--bl { bottom:0;left:0;border-bottom:3px solid #ffe066;border-left:3px solid #ffe066; }
  .retro-corner--br { bottom:0;right:0;border-bottom:3px solid #ffe066;border-right:3px solid #ffe066; }
  .retro-frame-header,.retro-status-bar { display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.8rem;background:#08080e;border:3px solid #ffe066;font-family:"Press Start 2P",monospace; }
  .retro-frame-header { border-bottom:none;font-size:8px; }
  .retro-status-bar   { border-top:none;font-size:6.5px;color:#aaa; }
  .retro-title  { color:#ffe066;text-shadow:0 0 10px rgba(255,224,102,0.7); }
  .retro-subtitle { color:#888;font-size:6px; }
  .retro-blink { animation:retro-blink 1s step-end infinite;color:#ffe066; }
  @keyframes retro-blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .retro-player-count { color:#88ff88;font-size:6px; }

  /* ── Leaflet retro overrides ── */
  .leaflet-tile { filter:sepia(0.22) saturate(0.72) brightness(0.80) contrast(1.12); }
  .leaflet-container { background:#0d1020 !important; }
  .leaflet-tooltip { font-family:"Press Start 2P",monospace !important;font-size:6px !important;background:#08080e !important;border:1px solid #ffe066 !important;color:#ffe066 !important;border-radius:2px !important;padding:3px 6px !important;box-shadow:0 0 6px rgba(255,224,102,0.4) !important; }
  .leaflet-tooltip-top::before { border-top-color:#ffe066 !important; }
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

    // Animated river polylines
    RIVERS.forEach(({ name, coords }) => {
      L.polyline(coords, {
        color: '#4dd0e1',
        weight: 2.5,
        opacity: 0.75,
        className: 'river-line',
        dashArray: '8 5',
      }).addTo(map).bindTooltip(name, { direction: 'center', sticky: true });
    });

    // City building markers
    CITIES.forEach(({ lat, lng, name, size }, i) => {
      L.marker([lat, lng], { icon: makeCityIcon(name, size, i), zIndexOffset: 150, interactive: true })
        .addTo(map)
        .bindTooltip(name, { direction: 'top', offset: [0, -20] });
    });

    // Landmark markers
    LANDMARKS.forEach(({ lat, lng, name, type }) => {
      L.marker([lat, lng], { icon: makeLandmarkIcon(type, name), zIndexOffset: 100, interactive: true })
        .addTo(map)
        .bindTooltip(name, { direction: 'top', offset: [0, -44] });
    });

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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <style>{ANIM_CSS}{`
        .auck-map-panel {
          position:absolute; top:0; right:0; width:300px; max-height:420px;
          overflow-y:auto; background:#08080e;
          border:2px solid #ffe066;
          border-radius:4px; padding:1rem; z-index:1000;
          box-shadow:0 0 0 1px #7a4a10, 0 4px 24px rgba(0,0,0,0.7);
          font-size:0.82rem;
          font-family:"Press Start 2P", monospace;
        }
        .auck-map-panel h3{margin:0 0 0.4rem;font-size:0.72rem;color:#ffe066;text-shadow:0 0 6px rgba(255,224,102,0.5)}
        .auck-close{float:right;background:none;border:1px solid #ffe066;color:#ffe066;cursor:pointer;font-size:0.9rem;padding:0 4px;line-height:1.4;margin-top:-2px}
        .auck-section{margin-top:0.7rem}
        .auck-section h4{margin:0 0 0.4rem;font-size:0.56rem;text-transform:uppercase;color:#88ff88;letter-spacing:0.1em}
        .auck-item{display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid rgba(255,224,102,0.12)}
        .auck-item:last-child{border-bottom:none}
        .auck-item img{width:40px;height:40px;object-fit:cover;border-radius:0;border:1px solid #ffe066;flex-shrink:0;image-rendering:pixelated}
        .auck-item-info{flex:1;min-width:0}
        .auck-item-info strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.6rem;color:#ffe066}
        .auck-item-info span{opacity:0.65;font-size:0.55rem}
        .auck-buy-btn{flex-shrink:0;padding:0.22rem 0.5rem;border-radius:0;border:1px solid #ffe066;background:transparent;color:#ffe066;cursor:pointer;font-size:0.55rem;font-family:inherit;white-space:nowrap}
        .auck-buy-btn:hover{background:#ffe066;color:#08080e}
        .auck-audio{width:100%;margin-top:0.25rem}
        .auck-empty{opacity:0.5;font-style:normal;font-size:0.6rem}
        .leaflet-container{font-family:inherit}
      `}</style>

      {/* ── Retro game header ── */}
      <div className="retro-frame-header">
        <span className="retro-title">▶ MAP EXCHANGE</span>
        <span className="retro-subtitle">AOTEAROA / NZ</span>
      </div>

      {/* ── Map canvas with retro wrapper ── */}
      <div className="retro-map-wrap">
        <div ref={containerRef} style={{ width: '100%', height: '480px' }} />

        {/* CRT scanlines */}
        <div className="retro-scanlines" />
        {/* Edge vignette */}
        <div className="retro-vignette" />
        {/* Pixel corner decorations */}
        <div className="retro-corner retro-corner--tl" />
        <div className="retro-corner retro-corner--tr" />
        <div className="retro-corner retro-corner--bl" />
        <div className="retro-corner retro-corner--br" />

        {/* Drifting music notes + scan line overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 900 }}>
          <span className="map-float-note map-float-note--1">♪</span>
          <span className="map-float-note map-float-note--2">♫</span>
          <span className="map-float-note map-float-note--3">♩</span>
          <span className="map-float-note map-float-note--4">♪</span>
          <span className="map-float-note map-float-note--5">♫</span>
          <div className="map-scan-line" />
        </div>

        {/* Profile panel */}
        {selected && (
          <div className="auck-map-panel">
            <button className="auck-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
            <h3>{selected.profile.display_name || selected.profile.username || 'Member'}</h3>
            {selected.profile.city && <div style={{ opacity: 0.6, fontSize: '0.55rem', marginBottom: '0.3rem' }}>{selected.profile.city}</div>}
            {selected.profile.bio && <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '0.6rem', lineHeight: 1.6 }}>{selected.profile.bio}</p>}
            {loadingProfile ? <p style={{ opacity: 0.5, marginTop: '0.75rem', fontSize: '0.6rem' }}>Loading…</p> : (
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
                          : <span style={{ opacity: 0.4, fontSize: '0.52rem' }}>NFS</span>}
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

      {/* ── Retro game status bar ── */}
      <div className="retro-status-bar">
        <span>🗺 EXPLORING NZ</span>
        <span className="retro-player-count">{users.length > 0 ? `${users.length} PLAYER${users.length !== 1 ? 'S' : ''} ONLINE` : 'SEARCHING…'}</span>
        <span className="retro-blink">▼ TAP A PEG</span>
      </div>
    </div>
  );
};

export default MapPhaser;
