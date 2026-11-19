window.__ModuleLoader__.load({ id: "dsh-context-heart", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";

/* 上下文爱心桌宠 —— 屏幕角落一颗红心，命还剩多少就看它
 * 平时微微跳动；上下文用得越多，越暗、越裂、发黑、掉渣、破碎
 * 左键点：展开/收起详情（血条 + 剩余百分比 + 分段占用）
 * 左键拖：挪位置；滚轮：缩放；右键：菜单
 *
 * 数据：DSH 自带上下文计量表（ContextMeter）就在输入框下面，很小很淡。
 * 读它 DOM 里的百分比；分段数字只在它的面板打开时才有，所以按需点开读一次再关。
 */

var POS_KEY = "ctxheart.pos";
var ZOOM_KEY = "ctxheart.zoom";
var LAST_KEY = "ctxheart.last";
var HIDE_KEY = "ctxheart.hidden";
var BASE = 76;            // 缩放 1 时的整体直径（心 64 + 外圈血条）
var RING_R = 34.5;        // 环心血条半径
var RING_C = 2 * Math.PI * RING_R;
var MIN_ZOOM = 0.6;
var MAX_ZOOM = 2.4;
var POLL_MS = 2000;       // 2 秒一次，别更频繁
var TIERS = [25, 50, 75]; // 0–25 / 25–50 / 50–75 / 75–100

var HEART_PATH = "M32 57.4C32 57.4 4.6 40.6 4.6 22.6C4.6 12.6 12.1 5.9 20.7 5.9C25.7 5.9 29.7 8.5 32 12.4C34.3 8.5 38.3 5.9 43.3 5.9C51.9 5.9 59.4 12.6 59.4 22.6C59.4 40.6 32 57.4 32 57.4Z";
var CORE_PATH = "M32 50.2C32 50.2 14.2 38.6 14.2 26.6C14.2 19.8 19.2 15.1 24.8 15.1C28.1 15.1 30.7 16.8 32 19.3C33.3 16.8 35.9 15.1 39.2 15.1C44.8 15.1 49.8 19.8 49.8 26.6C49.8 38.6 32 50.2 32 50.2Z";

var CRACKS = [
  ["cr1", "M32 7.6 L29.4 18.5 L33.2 24.6 L28.6 31.8 L30.4 39.2 L26.9 49.6"],
  ["cr2", "M18.6 14.2 L23.6 22.4 L19.8 28.6 L22.4 34.8"],
  ["cr3", "M45.4 13.4 L41 21.6 L45.8 27.8 L41.6 34.6 L43.4 40.2"],
  ["cr4", "M10.2 24.4 L16.8 27.6 L13.2 33.4 M35.4 45.4 L42.6 42.4 L48.6 45.6"],
  ["cr5", "M26.2 31.8 L21.4 38.6 L24.8 44.2 L21.6 50.2"],
  ["cr6", "M38 22 L44.2 20.2 M37.8 38.4 L44 36.6 L49.2 39.4"]
];

/* 破碎缺口：从边缘啃掉一块，露出黑底 */
var CHIPS = [
  ["chip1", "M47.6 10.4 L62.4 14.2 L58.2 23.6 L62.2 30.4 L50.4 32.2 L46.8 20.6 Z"],
  ["chip2", "M6.2 30.4 L2.6 43.4 L13.6 47.8 L19.2 36.2 L12.6 33.8 Z"],
  ["chip3", "M25.4 52.6 L40.6 50.4 L34.6 63.8 L28.4 61.4 Z"],
  ["chip4", "M39.4 41.6 L50.4 38.8 L47.6 49.4 L40.2 47.8 Z"]
];

var FRAGS = [
  ["fg1", "M55.6 23.4 L60.4 21.2 L58.6 27.6 Z", "0s"],
  ["fg2", "M9.6 34.6 L4.4 37.6 L9.8 40.2 Z", ".7s"],
  ["fg3", "M44.6 50.6 L50.6 53.2 L44.2 55.8 Z", "1.4s"],
  ["fg4", "M19.6 9.4 L24.2 4.6 L26.4 10.6 Z", "2.1s"],
  ["fg5", "M36.4 53.4 L41.6 57.6 L35.2 57.2 Z", "1.05s"]
];

function esc(n) { return String(n).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

function svgMarkup() {
  var cracks = CRACKS.map(function (c) {
    return '<path class="cr ' + c[0] + '" d="' + c[1] + '" stroke="#2b0407" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  }).join("");

  var frags = FRAGS.map(function (f) {
    return '<path class="fg ' + f[0] + '" d="' + f[1] + '" fill="#8d1230" style="animation-delay:' + f[2] + '"/>';
  }).join("");

  /* 缺口走遮罩：把心形边缘啃掉一块，露出下层的黑芯，才是碎，不是贴黑块 */
  var chips = CHIPS.map(function (c) {
    return '<path class="chip ' + c[0] + '" d="' + c[1] + '" fill="#000"/>';
  }).join("");

  /* 崩口的亮边：只画在心形里面，像刚崩开露出的新茬 */
  var chipEdges = CHIPS.map(function (c) {
    return '<path class="chip-edge" d="' + c[1] + '" fill="none" stroke="#ff9cae" stroke-width="1.1" stroke-linejoin="round"/>';
  }).join("");

  var defs =
    '<defs>' +
    '<linearGradient id="chg0" x1="0" y1="0" x2="0.2" y2="1">' +
    '<stop offset="0" stop-color="#ff8496"/><stop offset=".42" stop-color="#f52b50"/><stop offset="1" stop-color="#b3102e"/></linearGradient>' +
    '<linearGradient id="chg1" x1="0" y1="0" x2="0.2" y2="1">' +
    '<stop offset="0" stop-color="#ef5c72"/><stop offset=".45" stop-color="#cf1c3f"/><stop offset="1" stop-color="#8a0a22"/></linearGradient>' +
    '<linearGradient id="chg2" x1="0" y1="0" x2="0.2" y2="1">' +
    '<stop offset="0" stop-color="#d94a5e"/><stop offset=".45" stop-color="#a6152f"/><stop offset="1" stop-color="#5d091a"/></linearGradient>' +
    '<linearGradient id="chg3" x1="0" y1="0" x2="0.2" y2="1">' +
    '<stop offset="0" stop-color="#b93f50"/><stop offset=".4" stop-color="#7c1024"/><stop offset="1" stop-color="#2d040d"/></linearGradient>' +
    '<radialGradient id="chcore" cx=".5" cy=".45" r=".62">' +
    '<stop offset="0" stop-color="#050103"/><stop offset=".62" stop-color="#0d0209"/><stop offset="1" stop-color="#1a060f"/></radialGradient>' +
    '<mask id="chmask" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">' +
    '<path d="' + HEART_PATH + '" fill="#fff"/>' + chips +
    '</mask>' +
    '<clipPath id="chclip"><path d="' + HEART_PATH + '"/></clipPath>' +
    '</defs>';

  return '<svg viewBox="0 0 76 76" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    defs +
    /* 环心血条：绕心一圈，剩下的命就是这一圈还剩多少
     * fill="none" 写死在属性上：万一 CSS 没跟上，circle 也不会变黑饼 */
    '<circle class="ch-ring-track" cx="38" cy="38" r="' + RING_R + '" fill="none" stroke="rgba(255,255,255,.17)" stroke-width="2.4"/>' +
    '<circle class="ch-ring" cx="38" cy="38" r="' + RING_R + '" fill="none" stroke="#ff6b80" stroke-width="2.4" stroke-linecap="round" transform="rotate(-90 38 38)" stroke-dasharray="0 ' + RING_C.toFixed(2) + '"/>' +
    '<g transform="translate(6 6)">' +
    '<path d="' + HEART_PATH + '" fill="#1b0208" opacity=".55" transform="translate(0,1.6)"/>' +
    '<path class="ch-fill" d="' + HEART_PATH + '" fill="url(#chg0)" mask="url(#chmask)"/>' +
    '<path class="ch-core" d="' + CORE_PATH + '" fill="url(#chcore)"/>' +
    '<g class="ch-shine" fill="#ffffff" opacity=".16">' +
    '<ellipse cx="22" cy="19" rx="8.4" ry="5.6" transform="rotate(-26 22 19)"/>' +
    '<ellipse cx="43" cy="50" rx="4" ry="2.2" transform="rotate(18 43 50)" opacity=".5"/>' +
    '</g>' +
    '<g class="ch-cracks">' + cracks + '</g>' +
    '<g class="ch-edges" clip-path="url(#chclip)">' + chipEdges + '</g>' +
    '<g class="ch-frags">' + frags + '</g>' +
    '<path class="ch-rim" d="' + HEART_PATH + '" fill="none" stroke="#120104" stroke-width="1.1" opacity=".5"/>' +
    '</g>' +
    '</svg>';
}

function injectStyle() {
  var id = "ctxheart-style";
  /* 必须每次都重写：客户端热更会复用同一个 <style>，留着旧样式的话
   * 新加的环心血条就没有 fill:none，circle 会按 SVG 默认画成一整块黑饼。 */
  var s = document.getElementById(id);
  if (!s) {
    s = document.createElement("style");
    s.id = id;
    document.head.appendChild(s);
  }
  s.textContent = [
    "#ctxheart{position:fixed;z-index:2147483000;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;",
    "display:flex;align-items:center;justify-content:center;transition:opacity .2s}",
    "#ctxheart.dragging{cursor:grabbing}",
    "#ctxheart .ch-heart{width:100%;height:100%;transition:transform .16s ease}",
    "#ctxheart:hover .ch-heart{transform:scale(1.05)}",
    "#ctxheart .ch-beat{width:100%;height:100%;transform-origin:50% 56%;animation:chBeat 1.45s ease-in-out infinite}",
    "#ctxheart .ch-ring-track{fill:none;stroke:rgba(255,255,255,.17);stroke-width:2.4}",
    "#ctxheart .ch-ring{fill:none;stroke:#ff6b80;stroke-width:2.4;stroke-linecap:round;transition:stroke-dasharray .6s ease,stroke .4s}",
    "#ctxheart[data-tier=\"1\"] .ch-ring{stroke:#f2586d}",
    "#ctxheart[data-tier=\"2\"] .ch-ring{stroke:#d94a5e}",
    "#ctxheart[data-tier=\"3\"] .ch-ring{stroke:#ff2b4e;animation:chRingPulse 1.15s ease-in-out infinite}",
    "@keyframes chRingPulse{0%,100%{opacity:.5}50%{opacity:1}}",
    "@keyframes chBeat{0%,100%{transform:scale(1)}9%{transform:scale(1.1)}19%{transform:scale(1.005)}30%{transform:scale(1.055)}46%{transform:scale(1)}}",
    "#ctxheart[data-tier=\"1\"] .ch-beat{animation-duration:2.1s}",
    "#ctxheart[data-tier=\"2\"] .ch-beat{animation-duration:3.2s}",
    "#ctxheart[data-tier=\"3\"] .ch-beat{animation-duration:5.6s}",
    "#ctxheart .ch-heart{filter:drop-shadow(0 0 7px rgba(255,64,96,.5)) drop-shadow(0 3px 6px rgba(0,0,0,.45))}",
    "#ctxheart[data-tier=\"2\"] .ch-heart{filter:drop-shadow(0 0 9px rgba(190,24,54,.5)) drop-shadow(0 3px 6px rgba(0,0,0,.5))}",
    "#ctxheart[data-tier=\"3\"] .ch-heart{animation:chWarn 1.15s ease-in-out infinite}",
    "@keyframes chWarn{0%,100%{filter:drop-shadow(0 0 4px rgba(255,26,64,.4)) drop-shadow(0 3px 6px rgba(0,0,0,.5))}50%{filter:drop-shadow(0 0 17px rgba(255,16,58,.95)) drop-shadow(0 3px 6px rgba(0,0,0,.5))}}",
    "#ctxheart[data-tier=\"1\"] .ch-fill{fill:url(#chg1)}",
    "#ctxheart[data-tier=\"2\"] .ch-fill{fill:url(#chg2)}",
    "#ctxheart[data-tier=\"3\"] .ch-fill{fill:url(#chg3)}",
    "#ctxheart .ch-core{opacity:0;transition:opacity .6s}",
    "#ctxheart[data-tier=\"2\"] .ch-core{opacity:.42}",
    "#ctxheart[data-tier=\"3\"] .ch-core{opacity:.88}",
    "#ctxheart[data-tier=\"2\"] .ch-shine{opacity:.07}",
    "#ctxheart[data-tier=\"3\"] .ch-shine{opacity:0}",
    "#ctxheart .ch-shine{transition:opacity .6s}",
    "#ctxheart .cr{opacity:0;transition:opacity .5s}",
    "#ctxheart[data-tier=\"1\"] .cr1{opacity:.92}",
    "#ctxheart[data-tier=\"1\"] .cr2,#ctxheart[data-tier=\"1\"] .cr3{opacity:.2}",
    "#ctxheart[data-tier=\"2\"] .cr{opacity:.55}",
    "#ctxheart[data-tier=\"2\"] .cr1,#ctxheart[data-tier=\"2\"] .cr2{opacity:.95}",
    "#ctxheart[data-tier=\"3\"] .cr{opacity:1}",
    "#ctxheart .chip{opacity:0;transition:opacity .5s}",
    "#ctxheart[data-tier=\"2\"] .chip{opacity:.5}",
    "#ctxheart[data-tier=\"3\"] .chip{opacity:.96}",
    "#ctxheart .chip-edge{opacity:0;transition:opacity .6s}",
    "#ctxheart[data-tier=\"2\"] .chip-edge{opacity:.32}",
    "#ctxheart[data-tier=\"3\"] .chip-edge{opacity:.8}",
    "#ctxheart .fg{opacity:0;transform-box:fill-box;transform-origin:center}",
    "#ctxheart[data-tier=\"2\"] .fg{animation:chDrop 3.1s ease-in infinite}",
    "#ctxheart[data-tier=\"3\"] .fg{animation:chDrop 1.9s ease-in infinite}",
    "@keyframes chDrop{0%{opacity:0;transform:translate(0,0) rotate(0)}18%{opacity:.95}100%{opacity:0;transform:translate(3px,17px) rotate(34deg)}}",
    "#ctxheart .ch-tip{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);padding:1px 7px;border-radius:8px;",
    "background:rgba(20,6,12,.86);color:#ffc9d3;font:11px/1.6 system-ui,-apple-system,'Microsoft YaHei',sans-serif;",
    "white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;font-variant-numeric:tabular-nums}",
    "#ctxheart:hover .ch-tip{opacity:1}",
    "#ctxheart[data-tier=\"3\"] .ch-tip{opacity:.9}",
    "#ctxheart-restore{position:fixed;z-index:2147483000;width:20px;height:20px;border-radius:50%;cursor:pointer;",
    "background:radial-gradient(circle at 35% 30%,#ff6b80,#b3102e);box-shadow:0 0 8px rgba(255,60,90,.7);opacity:.55;transition:opacity .15s}",
    "#ctxheart-restore:hover{opacity:1}",
    "#ctxheart-panel{position:fixed;z-index:2147483001;width:266px;box-sizing:border-box;padding:12px 12px 10px;border-radius:14px;",
    "background:rgba(16,8,13,.965);color:#f3e6ea;font:12px/1.55 system-ui,-apple-system,'Microsoft YaHei',sans-serif;",
    "border:1px solid rgba(255,120,150,.26);box-shadow:0 16px 40px rgba(0,0,0,.55);backdrop-filter:blur(6px)}",
    "#ctxheart-panel .cp-head{display:flex;align-items:baseline;gap:8px}",
    "#ctxheart-panel .cp-title{color:#e6a9b6;font-size:11.5px}",
    "#ctxheart-panel .cp-pct{font-size:19px;font-weight:600;color:#ff90a4;font-variant-numeric:tabular-nums;line-height:1.2}",
    "#ctxheart-panel .cp-rest{margin-left:auto;color:#9db1c6;font-size:11.5px;font-variant-numeric:tabular-nums}",
    "#ctxheart-panel .cp-bar{position:relative;height:9px;margin:9px 0 4px;border-radius:6px;background:rgba(255,255,255,.09);overflow:hidden}",
    "#ctxheart-panel .cp-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,#ff4d6d,#ff8a5c);transition:width .4s,background .4s}",
    "#ctxheart-panel.low .cp-bar i{background:linear-gradient(90deg,#d81238,#ff3d5e);animation:cpPulse 1.2s ease-in-out infinite}",
    "@keyframes cpPulse{0%,100%{opacity:.75}50%{opacity:1}}",
    "#ctxheart-panel .cp-sub{display:flex;gap:1px;height:4px;margin:6px 0 10px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,.07)}",
    "#ctxheart-panel .cp-sub i{display:block;height:100%}",
    "#ctxheart-panel .cp-rows{display:flex;flex-direction:column;gap:4px}",
    "#ctxheart-panel .cp-row{display:flex;align-items:center;gap:7px;color:#d8cbd0}",
    "#ctxheart-panel .cp-row b{width:8px;height:8px;border-radius:2px;flex:none}",
    "#ctxheart-panel .cp-row .cp-name{flex:1;color:#c3b3ba}",
    "#ctxheart-panel .cp-row .cp-val{font-variant-numeric:tabular-nums;color:#efe2e6}",
    "#ctxheart-panel .cp-row.dim .cp-name,#ctxheart-panel .cp-row.dim .cp-val{color:#8d7f88}",
    "#ctxheart-panel .cp-foot{margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,120,150,.18);",
    "color:#ffc2cd;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:6px}",
    "#ctxheart-panel .cp-foot small{color:#9a8b93;font-size:11px}",
    "#ctxheart-panel .cp-note{margin-top:6px;color:#f0b45e;font-size:11px}",
    "#ctxheart-toast{position:fixed;z-index:2147483003;max-width:250px;padding:7px 11px;border-radius:10px;",
    "background:rgba(18,9,14,.97);color:#ffd9e0;font:12px/1.55 system-ui,-apple-system,'Microsoft YaHei',sans-serif;",
    "border:1px solid rgba(255,120,150,.32);box-shadow:0 10px 26px rgba(0,0,0,.5);",
    "opacity:0;transform:translateY(-4px);transition:opacity .18s,transform .18s;pointer-events:none}",
    "#ctxheart-toast.show{opacity:1;transform:translateY(0)}",
    "#ctxheart.squeeze .ch-heart{animation:chSqueeze .95s ease}",
    "@keyframes chSqueeze{0%{transform:scale(1,1)}22%{transform:scale(1.08,.82)}55%{transform:scale(.95,1.05)}78%{transform:scale(1.02,.98)}100%{transform:scale(1,1)}}",
    "#ctxheart.extract .ch-heart{animation:chExtract 1.4s ease}",
    "@keyframes chExtract{0%{transform:scale(1)}35%{transform:scale(1.1)}70%{transform:scale(.97)}100%{transform:scale(1)}}",
    "#ctxheart .ch-spark{position:absolute;left:50%;top:42%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;",
    "background:radial-gradient(circle,#fff,#ff9cb0 55%,rgba(255,90,120,0));box-shadow:0 0 12px rgba(255,140,170,.9);",
    "pointer-events:none;animation:chSpark 1.6s ease-out forwards}",
    "@keyframes chSpark{0%{opacity:0;transform:translateY(0) scale(.6)}25%{opacity:1}100%{opacity:0;transform:translateY(-38px) scale(1.2)}}",
    "#ctxheart-menu .cm-row small{color:#8d7f88;font-size:10.5px;margin-left:4px}",
    "#ctxheart-menu{position:fixed;z-index:2147483002;width:336px;max-width:calc(100vw - 16px);padding:8px;border-radius:12px;",
    "background:rgba(18,9,14,.975);color:#f3e6ea;font:12px/1.5 system-ui,-apple-system,'Microsoft YaHei',sans-serif;",
    "border:1px solid rgba(255,120,150,.28);box-shadow:0 12px 30px rgba(0,0,0,.5)}",
    "#ctxheart-menu .cm-title{display:flex;justify-content:space-between;align-items:baseline;padding:2px 8px 6px;color:#e39aa8;font-size:11px;letter-spacing:.4px}",
    "#ctxheart-menu .cm-title b{color:#ffcf8a;font-weight:600;font-size:11px;letter-spacing:0}",
    "#ctxheart-menu .cm-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:8px;cursor:pointer}",
    "#ctxheart-menu .cm-row:hover{background:rgba(255,120,150,.14)}",
    "#ctxheart-menu .cm-btn{color:#ffcf8a;white-space:nowrap;font-size:11.5px;flex:0 0 auto;margin-top:1px}",
    "#ctxheart-menu .cm-card{display:flex;gap:9px;align-items:flex-start;padding:7px 8px;border-radius:9px;cursor:pointer;transition:background .12s}",
    "#ctxheart-menu .cm-card:hover{background:rgba(255,120,150,.14)}",
    "#ctxheart-menu .cm-card.armed{background:rgba(255,120,150,.22);box-shadow:inset 0 0 0 1px rgba(255,120,150,.5)}",
    "#ctxheart-menu .cm-ic{flex:0 0 23px;width:23px;height:23px;margin-top:1px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(255,255,255,.07)}",
    "#ctxheart-menu .cm-ic svg{width:15px;height:15px;display:block}",
    "#ctxheart-menu .cm-ic.sq{color:#ffcf8a}",
    "#ctxheart-menu .cm-ic.ex{color:#ff8fa6}",
    "#ctxheart-menu .cm-body{flex:1 1 auto;min-width:0}",
    "#ctxheart-menu .cm-name{color:#f7ebf0;font-size:12.5px;font-weight:600;display:flex;align-items:baseline;gap:5px}",
    "#ctxheart-menu .cm-name small{color:#8d7f88;font-weight:400;font-size:10.5px}",
    "#ctxheart-menu .cm-desc{color:#b3a1ab;font-size:11px;line-height:1.5;margin-top:2px}",
    "#ctxheart-menu .cm-note{color:#f0b45e;font-size:10.5px;line-height:1.5;margin-top:3px}",
    "#ctxheart-menu .cm-nl{display:inline-block;margin-right:4px;padding:0 3px;border:1px solid rgba(240,180,94,.55);border-radius:4px;font-size:9.5px;line-height:1.35;vertical-align:1px}",
    "#ctxheart-menu .cm-sep{height:1px;margin:6px 4px;background:rgba(255,120,150,.18)}",
    "#ctxheart-menu .cm-hint{color:#947f89;font-size:11px;padding:2px 8px 4px}",
    "#ctxheart-menu .cm-warn{color:#f0b45e;font-size:11px;padding:2px 8px 4px}",
    "#ctxheart-menu .cm-zoom{display:flex;flex-direction:column;gap:6px;padding:2px 2px 0}",
    "#ctxheart-menu .cm-zhead{display:flex;justify-content:space-between;align-items:center}",
    "#ctxheart-menu .cm-zval{color:#ffcf8a}",
    "#ctxheart-menu input[type=range]{width:100%;height:18px;cursor:pointer;accent-color:#ff6b80}"
  ].join("");
}

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
}
function writeJSON(key, value) {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* ---------- 读自带的上下文计量表 ---------- */

function pctFrom(el) {
  if (!el) return null;
  var txt = (el.textContent || "").match(/(\d+)\s*%/);
  if (txt) return Math.max(0, Math.min(100, Number(txt[1])));
  var aria = el.getAttribute && (el.getAttribute("aria-label") || "");
  var m = aria.match(/(\d+)\s*%/);
  return m ? Math.max(0, Math.min(100, Number(m[1]))) : null;
}

/** 找到计量表那个可点的按钮。类名是 CSS Modules 哈希，升级 DSH 会变，所以按优先级兜底。 */
function findTrigger() {
  var el, i, list;
  el = document.querySelector('[class*="JObwrW_trigger"]');
  if (el && pctFrom(el) !== null) return el;
  el = document.querySelector('[aria-label*="上下文已用"]');
  if (el && pctFrom(el) !== null) return el;
  el = document.querySelector('[aria-label*="上下文"]');
  if (el && pctFrom(el) !== null) return el;
  list = document.querySelectorAll("[aria-label]");
  for (i = 0; i < list.length; i++) {
    var aria = list[i].getAttribute("aria-label") || "";
    if (/%/.test(aria) && /(上下.*文|context|コンテキスト|contexto|contexte|Kontext|контекст)/i.test(aria) && pctFrom(list[i]) !== null) return list[i];
  }
  el = document.querySelector('[class*="JObwrW_root"] button, [class*="JObwrW_root"] [role="button"]');
  if (el && pctFrom(el) !== null) return el;
  return null;
}

function findPanel() {
  var p = document.querySelector('[class*="JObwrW_panel"]');
  if (p) return p;
  p = document.querySelector('[role="dialog"][aria-label*="上下文"]');
  if (p) return p;
  return null;
}

function parseTokens(text) {
  if (!text) return null;
  var m = String(text).match(/([\d.]+)\s*([KkMmBb万亿]?)/);
  if (!m) return null;
  var v = Number(m[1]);
  if (!isFinite(v)) return null;
  var unit = m[2].toLowerCase();
  if (unit === "k") v *= 1e3;
  else if (unit === "m") v *= 1e6;
  else if (unit === "b") v *= 1e9;
  else if (unit === "万") v *= 1e4;
  else if (unit === "亿") v *= 1e8;
  return Math.round(v);
}

function parsePanel(panel) {
  var out = { system: null, tools: null, messages: null, used: null, window: null };
  var fig = panel.querySelector('[class*="figures"]');
  if (fig) {
    var t = (fig.textContent || "").replace(/\s+/g, " ");
    var m = t.match(/([\d.]+\s*[KkMmBb万亿]?)\s*\/\s*([\d.]+\s*[KkMmBb万亿]?)/);
    if (m) {
      out.used = parseTokens(m[1]);
      out.window = parseTokens(m[2]);
    }
  }
  var rows = panel.querySelectorAll("dl > div");
  if (!rows.length) rows = panel.querySelectorAll("dl dt");
  var got = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var dt = row.tagName === "DT" ? row : row.querySelector("dt");
    var dd = row.tagName === "DT" ? (row.parentElement && row.parentElement.querySelector("dd")) : row.querySelector("dd");
    if (!dt || !dd) continue;
    var label = (dt.textContent || "").trim();
    var val = parseTokens(dd.textContent || "");
    if (val === null) continue;
    got.push({ label: label, value: val });
  }
  for (var j = 0; j < got.length; j++) {
    var lab = got[j].label;
    if (out.system === null && /系统|System|システム/i.test(lab) && !/工具|Tool/i.test(lab)) { out.system = got[j].value; continue; }
    if (out.tools === null && /工具|Tool|ツール/i.test(lab)) { out.tools = got[j].value; continue; }
    if (out.messages === null && /对话|消息|Messages?|メッセージ/i.test(lab)) { out.messages = got[j].value; continue; }
  }
  // 标签万一换了语言，退回按顺序（系统 / 工具 / 对话）
  if (out.system === null && got[0]) out.system = got[0].value;
  if (out.tools === null && got[1]) out.tools = got[1].value;
  if (out.messages === null && got[2]) out.messages = got[2].value;
  return out;
}

/** 点开自带面板读一次分段，读完立刻关掉；用户自己开着就不动它。 */
function readBreakdown(cb) {
  var done = false;
  function finish(v) { if (done) return; done = true; cb(v); }
  var panel = findPanel();
  if (panel) { try { finish(parsePanel(panel)); } catch (e) { finish(null); } return; }
  var trig = findTrigger();
  if (!trig) { finish(null); return; }
  var opened = false;
  try { trig.click(); opened = true; } catch (e) { finish(null); return; }
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var p = findPanel();
    if (p) {
      clearInterval(timer);
      try { p.style.visibility = "hidden"; } catch (e) {}
      var res = null;
      try { res = parsePanel(p); } catch (e) { res = null; }
      if (opened) { try { trig.click(); } catch (e) {} }
      finish(res);
      return;
    }
    if (tries >= 14) {
      clearInterval(timer);
      if (opened) { try { trig.click(); } catch (e) {} }
      finish(null);
    }
  }, 32);
}

function tierOf(p) {
  if (p === null || p === undefined) return 0;
  if (p < TIERS[0]) return 0;
  if (p < TIERS[1]) return 1;
  if (p < TIERS[2]) return 2;
  return 3;
}

function fmtTokens(n) {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  if (n >= 1e6) return "~" + (Math.round(n / 1e5) / 10) + "M";
  if (n >= 1e3) return "~" + (Math.round(n / 100) / 10) + "K";
  return "~" + Math.round(n);
}

function fmtWan(n) {
  if (n === null || n === undefined || !isFinite(n)) return null;
  if (n >= 1e4) return (Math.round(n / 1e3) / 10) + " 万";
  return (Math.round(n / 100) / 10) + "K";
}

function createHeart() {
  injectStyle();

  var el = document.createElement("div");
  el.id = "ctxheart";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "上下文爱心");
  el.innerHTML = '<div class="ch-heart"><div class="ch-beat">' + svgMarkup() + '</div></div><div class="ch-tip">—</div>';
  document.body.appendChild(el);

  var tip = el.querySelector(".ch-tip");
  var ringEl = el.querySelector(".ch-ring");
  var zoom = Number((readJSON(ZOOM_KEY) || {}).z) || 1;
  var state = { p: null, used: null, win: null, segs: null, ok: false, at: 0 };
  var panel = null;
  var menu = null;
  var restore = null;

  function sizeNow() { return Math.round(BASE * zoom); }

  var anchored = true;   // true = 贴着右下角（还没被拖动过）

  function applyZoom() {
    var s = sizeNow();
    el.style.width = s + "px";
    el.style.height = s + "px";
    if (!anchored) clampIntoView();
    if (menu) { var z = menu.querySelector("[data-zoom]"); if (z) z.textContent = Math.round(zoom * 100) + "%"; }
  }

  function clampIntoView() {
    var s = sizeNow();
    var r = el.getBoundingClientRect();
    var x = Math.max(0, Math.min(window.innerWidth - s, r.left));
    var y = Math.max(0, Math.min(window.innerHeight - s, r.top));
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.right = "auto"; el.style.bottom = "auto";
    anchored = false;
    if (restore) { restore.style.left = (x + s / 2 - 10) + "px"; restore.style.top = (y + s / 2 - 10) + "px"; }
    return { x: x, y: y };
  }

  var pos = readJSON(POS_KEY);
  if (pos && typeof pos.x === "number") {
    anchored = false;
    el.style.left = Math.max(0, pos.x) + "px";
    el.style.top = Math.max(0, pos.y) + "px";
  } else {
    anchored = true;
    el.style.right = "18px";
    el.style.top = "128px";   // 右上角、语音桌宠下面；右下角被皮肤的 chibi 占着
  }
  applyZoom();

  var last = readJSON(LAST_KEY);
  if (last && typeof last.p === "number") {
    state.p = last.p; state.used = last.used; state.win = last.win; state.at = last.t || 0;
  }

  /* ---------- 画面 ---------- */

  function paint() {
    var tier = tierOf(state.p);
    el.setAttribute("data-tier", String(tier));
    el.setAttribute("data-percent", state.p === null ? "" : String(state.p));
    el.setAttribute("aria-label", "上下文爱心" + (state.p === null ? "" : " " + state.p + "%"));
    tip.textContent = state.p === null ? "读数暂不可用" : state.p + "%";
    if (ringEl) {
      var rest = state.p === null ? 0 : Math.max(0, 100 - state.p);
      ringEl.setAttribute("stroke-dasharray", (RING_C * rest / 100).toFixed(2) + " " + RING_C.toFixed(2));
      ringEl.style.opacity = state.p === null ? ".45" : "";
    }
    el.title = state.p === null
      ? "上下文爱心（读数暂不可用）"
      : "上下文已用 " + state.p + "%\n左键看详情 · 滚轮缩放 · 右键菜单";
    if (panel) fillPanel();
  }

  function segRows() {
    var segs = state.segs || {};
    var used = state.used;
    if (used === null && state.win !== null && state.p !== null) used = Math.round(state.win * state.p / 100);
    var known = theSum(segs);
    var other = null;
    if (used !== null && known !== null) {
      var rest = used - known;
      other = rest > 800 ? rest : null;
    }
    return { system: segs.system, tools: segs.tools, messages: segs.messages, other: other, used: used };
  }

  function theSum(segs) {
    if (segs == null) return null;
    var sum = 0, any = false;
    for (var k in segs) { if (typeof segs[k] === "number") { sum += segs[k]; any = true; } }
    return any ? sum : null;
  }

  function fillPanel() {
    if (!panel) return;
    var p = state.p;
    var r = segRows();
    var restPct = p === null ? null : Math.max(0, 100 - p);
    panel.className = p !== null && p >= 75 ? "low" : "";
    panel.innerHTML =
      '<div class="cp-head"><span class="cp-title">上下文已用</span>' +
      '<b class="cp-pct">' + (p === null ? "—" : p + "%") + '</b>' +
      '<span class="cp-rest">' + (restPct === null ? "剩余 —" : "剩余 " + restPct + "%") + '</span></div>' +
      '<div class="cp-bar"><i style="width:' + (p === null ? 0 : Math.round(restPct)) + '%"></i></div>' +
      subBar(r, p) +
      '<div class="cp-rows">' +
      row("#6aa9ff", "系统提示词", r.system) +
      row("#c08cff", "工具定义", r.tools) +
      row("#ffb454", "对话消息", r.messages) +
      row("#8b98ad", "其他 / 未归类", r.other, true) +
      '</div>' +
      footLine(r) +
      (state.ok ? "" : '<div class="cp-note">读数暂不可用：保持上一次 ' + (p === null ? "—" : p + "%") + '</div>');

    if (panel.parentNode) positionPanel();
  }

  function subBar(r) {
    var t = (r.system || 0) + (r.tools || 0) + (r.messages || 0) + (r.other || 0);
    if (!t) return '<div class="cp-sub"></div>';
    var w = function (v) { return (Math.max(0, v || 0) / t * 100).toFixed(2) + "%"; };
    return '<div class="cp-sub">' +
      '<i style="width:' + w(r.system) + ';background:#6aa9ff"></i>' +
      '<i style="width:' + w(r.tools) + ';background:#c08cff"></i>' +
      '<i style="width:' + w(r.messages) + ';background:#ffb454"></i>' +
      '<i style="width:' + w(r.other) + ';background:#8b98ad"></i>' +
      '</div>';
  }

  function row(color, name, val, dim) {
    return '<div class="cp-row' + (dim ? " dim" : "") + '">' +
      '<b style="background:' + color + '"></b>' +
      '<span class="cp-name">' + esc(name) + '</span>' +
      '<span class="cp-val">' + (val === null || val === undefined ? "—" : fmtTokens(val)) + '</span></div>';
  }

  function footLine(r) {
    var win = state.win;
    if (win === null && state.p !== null) {
      // 只有百分比时，用上次记下的窗口估一下
      var cached = readJSON(LAST_KEY);
      if (cached && typeof cached.win === "number") win = cached.win;
    }
    if (win === null || r.used === null) {
      return '<div class="cp-foot"><span>还剩 ' + (state.p === null ? "—" : Math.max(0, 100 - state.p) + "%") +
        '</span><small>总量待读取</small></div>';
    }
    var left = Math.max(0, win - r.used);
    return '<div class="cp-foot"><span>还剩约 ' + fmtWan(left) + ' token</span>' +
      '<small>总量 ' + fmtTokens(win) + '</small></div>';
  }

  function positionPanel() {
    var rect = el.getBoundingClientRect();
    var pw = 266, ph = panel.offsetHeight || 240;
    var left = Math.min(window.innerWidth - pw - 8, Math.max(8, rect.left - pw - 10));
    var top = Math.min(window.innerHeight - ph - 8, Math.max(8, rect.top + rect.height - ph));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  /* ---------- 读数 ---------- */

  function readPercent() {
    var p = pctFrom(findTrigger());
    if (p === null) return null;
    return p;
  }

  function refresh() {
    if (document.hidden) return;
    var p = readPercent();
    if (p === null) {
      if (state.ok) { state.ok = false; paint(); }
      return;
    }
    var changed = p !== state.p || !state.ok;
    state.p = p;
    state.ok = true;
    if (changed) {
      paint();
      writeJSON(LAST_KEY, { p: state.p, used: state.used, win: state.win, t: Date.now() });
    }
  }

  function refreshBreakdown() {
    readBreakdown(function (res) {
      if (!res) return;
      state.segs = { system: res.system, tools: res.tools, messages: res.messages };
      if (res.used !== null) state.used = res.used;
      if (res.window !== null) state.win = res.window;
      if (panel) fillPanel();
      writeJSON(LAST_KEY, { p: state.p, used: state.used, win: state.win, t: Date.now() });
    });
  }

  /* ---------- 详情面板 ---------- */

  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
  }

  function openPanel() {
    if (panel) return;
    panel = document.createElement("div");
    panel.id = "ctxheart-panel";
    document.body.appendChild(panel);
    fillPanel();
    positionPanel();
    // 分段数字只在自带面板打开时才有；开我们自己的面板时读一次
    refreshBreakdown();
  }

  function togglePanel() {
    if (panel) closePanel(); else openPanel();
  }

  function onKey(ev) {
    if (ev.key === "Escape") { closePanel(); closeMenu(); }
  }

  /* ---------- 挤压 / 抽离：借输入框替牢大按一次发送 ---------- */

  var toastEl = null, toastTimer = null;

  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "ctxheart-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    positionToast();
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (toastEl) toastEl.classList.remove("show"); }, ms || 2600);
  }

  function positionToast() {
    if (!toastEl) return;
    var r = el.getBoundingClientRect();
    var w = toastEl.offsetWidth || 220;
    var h = toastEl.offsetHeight || 34;
    var left = Math.min(window.innerWidth - w - 10, Math.max(10, r.left + r.width / 2 - w / 2));
    var top = r.bottom + 10;
    if (top + h > window.innerHeight - 8) top = r.top - h - 10;
    /* 菜单开着时别糊在菜单上：让到菜单下面（下面放不下就放上面） */
    if (menu) {
      var mr = menu.getBoundingClientRect();
      var hitY = top < mr.bottom + 4 && top + h > mr.top - 4;
      var hitX = left < mr.right && left + w > mr.left;
      if (hitX && hitY) {
        left = Math.min(window.innerWidth - w - 10, Math.max(10, mr.right - w));
        top = mr.bottom + 8;
        if (top + h > window.innerHeight - 8) top = Math.max(8, mr.top - h - 8);
      }
    }
    toastEl.style.left = left + "px";
    toastEl.style.top = Math.max(8, top) + "px";
  }

  function composerInput() {
    var e = document.querySelector('[contenteditable="true"]');
    if (e && e.isContentEditable) return e;
    var t = document.querySelector("textarea");
    return t && !t.readOnly && !t.disabled ? t : null;
  }

  function pressEnter(target) {
    var opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    target.dispatchEvent(new KeyboardEvent("keydown", opts));
    target.dispatchEvent(new KeyboardEvent("keypress", opts));
    target.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  /** 往输入框送一行再回车。输入框里有草稿、或者正忙，就退出来不动它。 */
  function sendLine(text, onSent) {
    var locked = document.querySelector('[contenteditable="false"]');
    if (locked && !document.querySelector('[contenteditable="true"]')) { toast("这轮还在跑，等露露收尾再按喵"); return false; }
    var input = composerInput();
    if (!input) { toast("找不到输入框，露露没敢乱按喵"); return false; }
    var existing = input.tagName === "TEXTAREA" ? input.value : input.textContent;
    if ((existing || "").trim() !== "") { toast("输入框里还有字，先清一下露露再按发送喵"); return false; }
    try {
      input.focus();
      if (input.tagName === "TEXTAREA") {
        var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        setter.call(input, text);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        document.execCommand("insertText", false, text);
      }
    } catch (e) { toast("塞不进去，可能正忙喵"); return false; }
    setTimeout(function () {
      var typed = input.tagName === "TEXTAREA" ? input.value : input.textContent;
      if (!typed || typed.trim() === "") { toast("没塞进去，露露先退出来喵"); return; }
      var btn = document.querySelector('button[aria-label="发送消息"]');
      if (btn && btn.disabled) { toast("发送键没亮，露露先退出来喵"); return; }
      pressEnter(input);
      if (typeof onSent === "function") setTimeout(onSent, 120);
    }, 90);
    return true;
  }

  /** 挤压：把 /compact 送进去，让内置压缩把那堆旧消息压扁。 */
  function squeeze() {
    if (!sendLine("/compact", function () {
      el.classList.add("squeeze");
      setTimeout(function () { el.classList.remove("squeeze"); }, 1000);
      toast("挤压中…压缩跑完，心会回一点血", 3200);
      [1500, 3500, 7000, 12000, 20000].forEach(function (t) { setTimeout(refresh, t); });
    })) return;
  }

  var extractArmedAt = 0;

  /** 抽离：让露露把要点写进记忆/文件，上下文里只留一条指针。要点两次。 */
  function extract() {
    if (Date.now() - extractArmedAt > 4000) {
      extractArmedAt = Date.now();
      toast("再点一次「抽离」就交出去（会开始一轮对话）", 3000);
      var card = menu && menu.querySelector('[data-act="extract"]');
      var row = card && card.querySelector(".cm-btn");
      if (card) card.classList.add("armed");
      if (row) { row.textContent = "确认？"; }
      setTimeout(function () {
        var c2 = menu && menu.querySelector('[data-act="extract"]');
        var rr = c2 && c2.querySelector(".cm-btn");
        if (c2) c2.classList.remove("armed");
        if (rr) rr.textContent = "两次确认";
      }, 4000);
      return;
    }
    extractArmedAt = 0;
    var line = "【抽离】把这段会话里值得长期留下的东西（决定、踩坑、约定、牢大的偏好）提炼出来，" +
      "写进记忆或落到 E:\\露露训练 下的文件；回复里只留一句「已抽离：…」的指针，不要复述细节。";
    sendLine(line, function () {
      el.classList.add("extract");
      spark();
      setTimeout(function () { el.classList.remove("extract"); }, 1600);
      toast("已交给露露，抽离中…", 3200);
      if (menu) closeMenu();
    });
  }

  function spark() {
    var s = document.createElement("div");
    s.className = "ch-spark";
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1700);
  }

  /** 点别处就收起面板/菜单；点爱心本身交给它自己的点击切换。 */
  function onDocDown(ev) {
    var t = ev.target;
    if (menu && !menu.contains(t) && !el.contains(t)) closeMenu();
    if (panel && !panel.contains(t) && !el.contains(t)) closePanel();
  }

  /* ---------- 右键菜单 ---------- */

  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
  }

  /* 两个动作的小图标（内联 SVG，不依赖字体） */
  var ICON_SQUEEZE =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 2.1v3.4M5.7 3.4 8 5.7l2.3-2.3"/>' +
    '<path d="M8 13.9v-3.4M5.7 12.6 8 10.3l2.3 2.3"/>' +
    '</svg>';
  var ICON_EXTRACT =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2.6 3.1h10.8L9.3 8.5v2.4H6.7V8.5L2.6 3.1z"/>' +
    '<path d="M8 14.6v-3.2M6.7 12.8 8 14.1l1.3-1.3"/>' +
    '</svg>';

  function openMenu(ev) {
    ev.preventDefault();
    closeMenu();
    menu = document.createElement("div");
    menu.id = "ctxheart-menu";
    menu.innerHTML =
      '<div class="cm-title"><span>上下文爱心</span><b>' +
      (state.ok ? "已用 " + state.p + "%" : "读数暂不可用") + '</b></div>' +

      '<div class="cm-card" data-act="squeeze">' +
        '<div class="cm-ic sq">' + ICON_SQUEEZE + '</div>' +
        '<div class="cm-body">' +
          '<div class="cm-name">挤压<small>压缩上下文</small></div>' +
          '<div class="cm-desc">把对话压成一段摘要，腾出上下文余量。压缩是 DSH 在干，爱心只替你按发送。</div>' +
          '<div class="cm-note"><span class="cm-nl">注意</span>要跑一会儿，期间输入框被占住；摘要换不回原文。</div>' +
        '</div>' +
        '<span class="cm-btn">/compact</span>' +
      '</div>' +

      '<div class="cm-card" data-act="extract">' +
        '<div class="cm-ic ex">' + ICON_EXTRACT + '</div>' +
        '<div class="cm-body">' +
          '<div class="cm-name">抽离<small>要点落盘</small></div>' +
          '<div class="cm-desc">让露露把决定、踩坑、约定和偏好写进记忆或文件，上下文里只留一条指针。</div>' +
          '<div class="cm-note"><span class="cm-nl">注意</span>要点两次才发，会真开一轮对话；没落盘等于没留下。</div>' +
        '</div>' +
        '<span class="cm-btn">两次确认</span>' +
      '</div>' +

      '<div class="cm-sep"></div>' +
      '<div class="cm-row" data-act="detail"><span>详情面板</span><span class="cm-btn">' + (panel ? "收起" : "展开") + '</span></div>' +
      '<div class="cm-sep"></div>' +
      '<div class="cm-row"><div class="cm-zoom">' +
      '<div class="cm-zhead"><span>大小</span><span class="cm-zval" data-zoom>' + Math.round(zoom * 100) + '%</span></div>' +
      '<input type="range" min="' + Math.round(MIN_ZOOM * 100) + '" max="' + Math.round(MAX_ZOOM * 100) + '" step="5" value="' + Math.round(zoom * 100) + '" data-zoom-range>' +
      '</div></div>' +
      '<div class="cm-sep"></div>' +
      '<div class="cm-row" data-act="reset"><span>重置位置</span><span class="cm-btn">回到右上角</span></div>' +
      '<div class="cm-row" data-act="hide"><span>隐藏爱心</span><span class="cm-btn">隐藏</span></div>' +
      '<div class="cm-sep"></div>' +
      (state.ok ? "" : '<div class="cm-warn">读数暂不可用，显示上一次读数</div>') +
      '<div class="cm-hint">左键点：详情 · 拖动：挪位置 · 滚轮：缩放</div>';
    document.body.appendChild(menu);

    var rect = el.getBoundingClientRect();
    var mw = menu.offsetWidth || 302, mh = menu.offsetHeight || 320;
    var left = Math.min(window.innerWidth - mw - 8, Math.max(8, rect.right - mw));
    var top = Math.min(window.innerHeight - mh - 8, Math.max(8, rect.bottom + 6));
    menu.style.left = left + "px";
    menu.style.top = top + "px";

    var range = menu.querySelector("[data-zoom-range]");
    if (range) {
      range.addEventListener("input", function () {
        var v = Number(range.value) || 100;
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v / 100));
        writeJSON(ZOOM_KEY, { z: zoom });
        applyZoom();
      });
    }
    menu.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    menu.addEventListener("click", function (e) {
      var r = e.target.closest("[data-act]");
      if (!r) return;
      var act = r.getAttribute("data-act");
      if (act === "squeeze") { closeMenu(); squeeze(); return; }
      if (act === "extract") { extract(); return; }
      if (act === "detail") { togglePanel(); closeMenu(); return; }
      if (act === "reset") {
        zoom = 1;
        writeJSON(ZOOM_KEY, { z: 1 });
        writeJSON(POS_KEY, null);
        anchored = true;
        el.style.left = "auto"; el.style.bottom = "auto";
        el.style.right = "18px"; el.style.top = "128px";
        applyZoom();
        closeMenu();
        return;
      }
      if (act === "hide") { hide(); closeMenu(); return; }
    });
  }

  /* ---------- 隐藏 / 复原 ---------- */

  function hide() {
    var p = el.getBoundingClientRect();
    closePanel();
    closeMenu();
    el.style.display = "none";
    restore = document.createElement("div");
    restore.id = "ctxheart-restore";
    restore.title = "点我恢复上下文爱心";
    restore.style.left = (p.left + sizeNow() / 2 - 10) + "px";
    restore.style.top = (p.top + sizeNow() / 2 - 10) + "px";
    restore.addEventListener("click", show);
    document.body.appendChild(restore);
    writeJSON(HIDE_KEY, true);
  }

  function show() {
    if (restore) { restore.remove(); restore = null; }
    el.style.display = "";
    writeJSON(HIDE_KEY, null);
    if (!anchored) clampIntoView();
  }

  /* ---------- 拖动 ---------- */

  var drag = null;
  var blockClick = false;

  function onDown(ev) {
    if (ev.button !== 0) return;
    var rect = el.getBoundingClientRect();
    drag = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top, moved: false, x: rect.left, y: rect.top };
    el.classList.add("dragging");
    try { el.setPointerCapture && el.setPointerCapture(ev.pointerId); } catch (e) {}
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
  }
  function onMove(ev) {
    if (!drag) return;
    var s = sizeNow();
    var nx = Math.max(0, Math.min(window.innerWidth - s, ev.clientX - drag.dx));
    var ny = Math.max(0, Math.min(window.innerHeight - s, ev.clientY - drag.dy));
    if (Math.abs(nx - drag.x) + Math.abs(ny - drag.y) > 4) drag.moved = true;
    anchored = false;
    el.style.right = "auto"; el.style.bottom = "auto";
    el.style.left = nx + "px"; el.style.top = ny + "px";
  }
  function onUp() {
    el.classList.remove("dragging");
    document.removeEventListener("pointermove", onMove);
    if (!drag) return;
    if (drag.moved) {
      var rect = el.getBoundingClientRect();
      writeJSON(POS_KEY, { x: Math.round(rect.left), y: Math.round(rect.top) });
      blockClick = true;
    }
    drag = null;
  }

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("click", function (ev) {
    if (ev.button !== 0) return;
    if (blockClick) { blockClick = false; return; }
    togglePanel();
  });
  el.addEventListener("contextmenu", openMenu);
  el.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var step = ev.deltaY > 0 ? -0.06 : 0.06;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((zoom + step) * 100) / 100));
    writeJSON(ZOOM_KEY, { z: zoom });
    applyZoom();
  }, { passive: false });

  function onResize() { if (!anchored) clampIntoView(); }

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onDocDown, true);
  paint();

  var timer = setInterval(refresh, POLL_MS);
  void refresh();
  // 首屏计量表可能要晚一拍才渲染，补两次
  var catchup = setTimeout(refresh, 1200);
  var catchup2 = setTimeout(refresh, 4000);

  // 隐藏状态不跨刷新保留（重新打开页面就看得见爱心）
  if (readJSON(HIDE_KEY) === true) writeJSON(HIDE_KEY, null);

  window.__ctxheart = {
    getState: function () { return { p: state.p, used: state.used, win: state.win, segs: state.segs, ok: state.ok, tier: tierOf(state.p) }; },
    read: function () { refresh(); return readPercent(); },
    breakdown: refreshBreakdown
  };

  return function cleanup() {
    clearInterval(timer);
    clearTimeout(catchup);
    clearTimeout(catchup2);
    closePanel();
    closeMenu();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("pointerdown", onDocDown, true);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("contextmenu", openMenu);
    if (restore) restore.remove();
    if (el.parentNode) el.parentNode.removeChild(el);
    try { delete window.__ctxheart; } catch (e) {}
  };
}

exports.inject = [];
exports.apply = function (ctx) {
  try {
    if (typeof ctx.effect === "function") {
      ctx.effect(function () {
        if (typeof document === "undefined" || typeof window === "undefined") return;
        return createHeart();
      }, "context-heart: floating heart");
    }
  } catch (e) {
    try { console.error("[dsh-context-heart] 爱心装载失败", e); } catch (_) {}
  }
};

return module.exports; } });
