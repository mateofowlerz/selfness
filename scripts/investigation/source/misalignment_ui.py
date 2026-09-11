#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Local UI for the misalignment-reasoning search.

Stdlib-only HTTP server on 127.0.0.1. Serves a single-page UI backed by
live runs of misalignment_search: adjust scope/threshold/watch hits update,
click a message to read it with matches highlighted per signal group,
highlighted thinking blocks distinguished from visible text.

Run:  python3 scripts/misalignment_ui.py [--port 8137] [--no-open]
"""

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import sys
from urllib.parse import urlparse, parse_qs
import webbrowser

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from misalignment_search import (  # noqa: E402
    DEFAULT_PATTERNS,
    THINKING_RE,
    compile_groups,
    default_source,
    load_messages,
    score_messages,
)

ARGS = None  # argparse namespace, set in main()
MESSAGES = None
DEFS = None
GROUPS = None
BONUSES = None
SUMMARIES = {}
WOBBLE = {}  # index -> {"score": float, "chunk": str}; self-deception projections
EPISODES = []
SEGMENTS = []

PALETTE = ["#ff8800", "#e5484d", "#f5a524", "#46a758", "#3e9be0", "#a259ff", "#0fb5ba", "#e93d82"]

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Misalignment-reasoning search</title>
<style>
  :root { --bg:#14161a; --panel:#1c1f26; --border:#2c313a; --text:#d7dbe0;
          --dim:#8a919c; --accent:#f5a524; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:14px/1.45 -apple-system, "SF Mono", Menlo, monospace; }
  header { padding:10px 16px; background:var(--panel); border-bottom:1px solid var(--border);
           display:flex; gap:18px; align-items:center; flex-wrap:wrap;
           position:sticky; top:0; z-index:5; }
  header h1 { font-size:14px; margin:0; font-weight:600; color:var(--accent); }
  header label { color:var(--dim); font-size:12px; display:flex; align-items:center; gap:6px; }
  select, input[type=range] { accent-color:var(--accent); }
  select { background:#14161a; color:var(--text); border:1px solid var(--border);
           border-radius:4px; padding:2px 6px; font:inherit; }
  .tags { display:flex; gap:6px; flex-wrap:wrap; }
  .tag { border:1px solid var(--border); border-radius:10px; padding:1px 9px;
         font-size:11px; cursor:pointer; user-select:none; color:var(--dim); }
  .tag.on { color:#14161a; font-weight:600; }
  #wobble-tag { border-style:dashed; }
  .wob { color:#ffd166; font-weight:600; }
  main { display:grid; grid-template-columns: 420px 1fr; height:calc(100vh - 53px); }
  #list { overflow-y:auto; border-right:1px solid var(--border); }
  .hit { padding:9px 14px; border-bottom:1px solid var(--border); cursor:pointer;
         border-left:4px solid transparent; }
  .hit:hover { background:#20242c; }
  .hit.sel { background:#242a33; }
  .hit .meta { display:flex; gap:8px; align-items:baseline; font-size:12px; }
  .hit .idx { color:var(--accent); font-weight:600; }
  .hit .score { color:var(--dim); }
  .hit .grp { font-size:10px; margin-top:4px; display:flex; gap:4px; flex-wrap:wrap; }
  .chip { border-radius:8px; padding:0 7px; color:#14161a; font-weight:600; }
  .hit .sum { color:var(--text); font-size:12px; margin-top:5px; white-space:pre-line;
              border-left:2px solid var(--accent); padding-left:8px; opacity:.92; }
  .hit .ex { color:var(--dim); font-size:12px; margin-top:4px;
             display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  #detail { overflow-y:auto; padding:18px 22px; }
  #detail h2 { font-size:13px; color:var(--dim); font-weight:600; margin:0 0 10px; }
  .detail-sum { white-space:pre-line; font-size:12px; color:var(--text);
                border-left:2px solid var(--accent); padding-left:10px; margin:0 0 14px; }
  .detail-grp { font-size:11px; margin:0 0 12px; display:flex; gap:5px; flex-wrap:wrap; }
  #content { white-space:pre-wrap; word-break:break-word; font-size:13px;
             background:var(--panel); border:1px solid var(--border);
             border-radius:6px; padding:14px 16px; }
  .think { background:rgba(62,155,224,0.07); border-radius:3px; }
  mark { border-radius:2px; padding:0 2px; color:#14161a; font-weight:600; }
  #empty { color:var(--dim); padding:24px; }
</style>
</head>
<body>
<header>
  <h1>misalignment search</h1>
  <a href="/episodes" style="color:#3e9be0; font-size:12px;">episodes →</a>
  <label>scope
    <select id="scope">
      <option value="both" selected>thinking + visible</option>
      <option value="thinking">thinking only</option>
      <option value="visible">visible only</option>
    </select>
  </label>
  <label>min score <input id="minscore" type="range" min="1" max="8" value="4">
    <span id="minval">4</span></label>
  <div class="tags" id="tags"></div>
</header>
<main>
  <div id="list"></div>
  <div id="detail"><div id="empty">select a hit on the left</div></div>
</main>
<script>
let groups = {}, weights = {}, groupColors = {};
let activeGroups = new Set();
let current = null;
let wobbleOn = false, wobbleThreshold = 0.25;

async function boot() {
  const cfg = await (await fetch('/api/config')).json();
  groups = cfg.descriptions; weights = cfg.weights;
  const names = Object.keys(weights);
  names.forEach((g, i) => groupColors[g] = cfg.palette[i % cfg.palette.length]);
  const tags = document.getElementById('tags');
  for (const g of names) {
    activeGroups.add(g);
    const t = document.createElement('span');
    t.className = 'tag on';
    t.style.background = groupColors[g];
    t.style.borderColor = groupColors[g];
    t.textContent = g;
    t.title = groups[g] || '';
    t.onclick = () => {
      if (activeGroups.has(g)) { activeGroups.delete(g); t.classList.remove('on');
        t.style.background = 'transparent'; }
      else { activeGroups.add(g); t.classList.add('on'); t.style.background = groupColors[g]; }
      refresh();
    };
    tags.appendChild(t);
  }
  if (cfg.wobble_available) {
    wobbleThreshold = cfg.wobble_default_threshold || 0.25;
    const t = document.createElement('span');
    t.className = 'tag';
    t.id = 'wobble-tag';
    t.style.borderColor = '#ffd166';
    t.textContent = 'vibes: self-deception';
    t.title = 'semantic vector: (129/139 arc) minus (registration-mechanics centroid). ' +
      'Toggle to also surface messages the regexes miss; wobble >= ' + wobbleThreshold;
    t.onclick = () => {
      wobbleOn = !wobbleOn;
      t.classList.toggle('on', wobbleOn);
      t.style.background = wobbleOn ? '#ffd166' : 'transparent';
      refresh();
    };
    tags.appendChild(t);
  }
  document.getElementById('scope').onchange = refresh;
  const slider = document.getElementById('minscore');
  slider.oninput = () => { document.getElementById('minval').textContent = slider.value; refresh(); };
  refresh();
}

async function refresh() {
  const scope = document.getElementById('scope').value;
  const min = document.getElementById('minscore').value;
  const q = `/api/search?scope=${scope}&min_score=${min}&groups=${[...activeGroups].join(',')}` +
    `&wobble_min=${wobbleOn ? wobbleThreshold : 0}`;
  const data = await (await fetch(q)).json();
  const list = document.getElementById('list');
  list.innerHTML = '';
  if (!data.ranked.length) {
    list.innerHTML = '<div id="empty">no messages match these filters</div>'; return;
  }
  for (const r of data.ranked) {
    const d = document.createElement('div');
    d.className = 'hit' + (r.index === current ? ' sel' : '');
    const ex = (r.best_excerpt || '').replace(/\\s+/g, ' ').slice(0, 220);
    const top = topGroup(r.matched_groups);
    if (top) d.style.borderLeftColor = groupColors[top];
    d.innerHTML = `<div class="meta"><span class="idx">#${r.index}</span>
      <span class="score">score ${r.score || '–'}</span>
      ${r.wobble != null && r.wobble >= 0.2 ? `<span class="wob">wobble ${r.wobble.toFixed(2)}</span>` : ''}
      <span class="score">${(r.timestamp || '').slice(11,19)}</span></div>
      <div class="grp"></div>
      <div class="sum"></div>
      <div class="ex"></div>`;
    const grpEl = d.querySelector('.grp');
    for (const g of r.matched_groups) grpEl.appendChild(chip(g));
    d.querySelector('.sum').textContent = r.summary || '';
    if (!r.summary) d.querySelector('.sum').remove();
    d.querySelector('.ex').textContent = ex;
    d.onclick = () => showMessage(r.index, scope, d);
    list.appendChild(d);
  }
}

function topGroup(matched) {
  return [...matched].sort((a, b) => (weights[b] || 0) - (weights[a] || 0))[0];
}

function chip(g) {
  const c = document.createElement('span');
  c.className = 'chip';
  c.style.background = groupColors[g] || '#3a4048';
  c.textContent = g;
  c.title = groups[g] || '';
  return c;
}

async function showMessage(index, scope, el) {
  current = index;
  document.querySelectorAll('.hit.sel').forEach(n => n.classList.remove('sel'));
  if (el) el.classList.add('sel');
  const m = await (await fetch(`/api/message?index=${index}&scope=${scope}`)).json();
  const detail = document.getElementById('detail');
  detail.innerHTML = `<h2>message ${m.index} · ${m.timestamp} · score ${m.score}` +
    `${m.wobble != null ? ` · wobble ${m.wobble.toFixed(3)}` : ''}</h2>
    <div class="grp detail-grp"></div>`;
  const dgrp = detail.querySelector('.detail-grp');
  for (const g of m.matched_groups) dgrp.appendChild(chip(g));
  if (m.summary) {
    const s = document.createElement('div');
    s.className = 'detail-sum';
    s.textContent = m.summary;
    detail.appendChild(s);
  }
  const pre = document.createElement('div');
  pre.id = 'content';
  renderContent(pre, m.content, m.spans);
  detail.appendChild(pre);
  pre.scrollIntoView();
}

// Split content at span boundaries; match spans render as <mark>,
// thinking-only runs get the shaded background.
function renderContent(root, text, spans) {
  const bounds = new Set([0, text.length]);
  for (const s of spans) { bounds.add(s.start); bounds.add(s.end); }
  const pts = [...bounds].sort((a, b) => a - b);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const slice = text.slice(a, b);
    if (!slice) continue;
    const covering = spans.filter(s => s.start <= a && s.end >= b);
    const matches = covering.filter(s => s.group);
    let node;
    if (matches.length) {
      matches.sort((x, y) => (weights[y.group] || 0) - (weights[x.group] || 0));
      const top = matches[0];
      node = document.createElement('mark');
      node.style.background = activeGroups.has(top.group) ? groupColors[top.group] : '#3a4048';
      node.title = top.group + ' — /' + top.pattern + '/';
    } else {
      node = document.createElement('span');
      if (covering.some(s => s.thinking)) node.className = 'think';
    }
    node.textContent = slice;
    root.appendChild(node);
  }
}

boot();
</script>
</body>
</html>
"""


EPISODES_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>transcript episodes</title>
<style>
  :root { --bg:#14161a; --panel:#1c1f26; --border:#2c313a; --text:#d7dbe0;
          --dim:#8a919c; --accent:#f5a524; --gold:#ffd166; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
         font:13px/1.45 -apple-system, "SF Mono", Menlo, monospace; }
  header { padding:10px 16px; background:var(--panel); border-bottom:1px solid var(--border);
           display:flex; gap:14px; align-items:center; flex-wrap:wrap;
           position:sticky; top:0; z-index:5; }
  header h1 { font-size:14px; margin:0; font-weight:600; color:var(--accent); }
  header a { color:#3e9be0; font-size:12px; }
  header input[type=search] { background:var(--bg); color:var(--text);
    border:1px solid var(--border); border-radius:4px; padding:4px 8px; font:inherit; width:300px; }
  header label { color:var(--dim); font-size:12px; display:flex; align-items:center; gap:5px; }
  header button { background:var(--bg); color:var(--dim); border:1px solid var(--border);
    border-radius:4px; padding:4px 10px; font:inherit; cursor:pointer; }
  #count { color:var(--dim); font-size:12px; }
  main { max-width:1000px; margin:0 auto; padding:16px; }
  .ep { background:var(--panel); border:1px solid var(--border); border-left:4px solid #3a4048;
        border-radius:6px; padding:10px 14px; margin:10px 0; }
  .ep.alarm { border-left-color:var(--gold); }
  .meta { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; font-size:12px; }
  .num { color:var(--accent); font-weight:700; }
  .ts { color:var(--dim); }
  .toolcount { color:var(--dim); }
  .wob { color:var(--gold); font-weight:600; }
  .chip { display:inline-block; border-radius:8px; padding:0 7px; font-size:10px;
          font-weight:600; color:#14161a; margin:0 2px; }
  .think { margin-top:6px; white-space:pre-wrap; word-break:break-word; color:var(--text);
           background:rgba(62,155,224,0.06); border-radius:3px; padding:6px 10px; }
  .more { color:#3e9be0; cursor:pointer; font-size:12px; user-select:none; }
  .vis { margin-top:6px; color:#9fb3c8; font-style:italic; white-space:pre-wrap;
         word-break:break-word; font-size:12px; }
  .artifacts { margin-top:6px; display:flex; gap:4px; flex-wrap:wrap; }
  .art { color:var(--dim); font-size:10px; border:1px solid var(--border); border-radius:8px;
         padding:0 7px; }
  .tools { margin-top:6px; }
  .tool { border-top:1px dashed var(--border); padding:5px 0; font-size:12px; }
  .tool .name { color:#e93d82; font-weight:600; }
  .pre { white-space:pre-wrap; word-break:break-word; color:var(--dim); margin:2px 0;
         font-size:11px; }
  .note { color:var(--dim); font-style:italic; }
  #sentinel { height: 1px; }
  #strip { display:flex; gap:2px; width:100%; margin-top:9px; }
  .seg { height:26px; border-radius:4px; min-width:36px; cursor:pointer; overflow:hidden;
         font-size:9px; color:var(--dim); padding:2px 6px; white-space:nowrap;
         background:#20242c; border-left:3px solid; text-overflow:ellipsis; }
  .seg:hover { color:var(--text); background:#242a33; }
  #spark { width:100%; height:20px; display:block; margin-top:3px; }
  .seghead { margin:18px 0 8px; padding:9px 14px; background:#1e222b;
             border:1px solid var(--border); border-radius:6px; border-left:4px solid; }
  .seghead .t { font-weight:700; font-size:12px; }
  .seghead .s { color:var(--dim); font-size:11px; margin-top:3px; }</style>
</head>
<body>
<header>
  <h1>episodes</h1>
  <a href="/">← hits search</a>
  <input id="q" type="search" placeholder="filter: thinking, tools, artifacts…">
  <label><input type="checkbox" id="alarm"> alarms only (wobble ≥ 0.25)</label>
  <label><input type="checkbox" id="fulltext"> full text</label>
  <button id="preval" title="previous alarm">▲ alarm</button>
  <button id="nextal" title="next alarm">▼ alarm</button>
  <span id="count"></span>
  <div id="strip"></div>
  <canvas id="spark" height="20"></canvas>
</header>
<main id="list"></main>
<div id="sentinel"></div>
<script>
let EPS = [];
let SEGS = [];
let segOfEp = {}, segByStart = {};
let lastSegRendered = null;
let filtered = [];
let rendered = 0;
const PAGE = 60;
const THINK_PREVIEW_LEN = 600;
const SEGC = {1:'#5b84d6',2:'#8a6fd6',3:'#b05fc8',4:'#d05fa0',5:'#d66070',
              6:'#d67b4a',7:'#c9a23f',8:'#9aa83f',9:'#55a868',10:'#3fa08f'};

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

async function boot() {
  const data = await (await fetch('/api/episodes')).json();
  const sdata = await (await fetch('/api/segments')).json();
  EPS = data.episodes;
  SEGS = sdata.segments;
  for (const s of SEGS) {
    segByStart[s.ep_start] = s;
    for (let ep = s.ep_start; ep <= s.ep_end; ep++) segOfEp[ep] = s;
  }
  document.getElementById('q').addEventListener('input', refresh);
  document.getElementById('alarm').addEventListener('change', refresh);
  document.getElementById('fulltext').addEventListener('change', refresh);
  document.getElementById('preval').onclick = () => jumpAlarm(-1);
  document.getElementById('nextal').onclick = () => jumpAlarm(1);
  refresh();
  if (SEGS.length) { buildStrip(); drawSpark(); }
  goToHash();
  window.addEventListener('hashchange', goToHash);
}

function buildStrip() {
  const el = document.getElementById('strip');
  const total = SEGS.reduce((a, s) => a + s.n_episodes, 0);
  for (const s of SEGS) {
    const d = document.createElement('div');
    d.className = 'seg';
    d.style.width = Math.max(s.n_episodes / total * 100, 4.5) + '%';
    d.style.borderLeftColor = SEGC[s.id] || '#666';
    const name = s.label ? s.label.name : '';
    d.textContent = s.id + '·' + name;
    d.title = `#${s.id} ${name}\n${s.ts_start.slice(11)} → ${s.ts_end.slice(11)} · ` +
      `${s.n_episodes} eps · wobble μ ${s.wobble_mean}\n\n${s.label ? s.label.summary : ''}` +
      `\n\nhandoff: ${s.label ? s.label.handoff : ''}`;
    d.onclick = () => jumpToSegment(s);
    el.appendChild(d);
  }
}

function drawSpark() {
  const cv = document.getElementById('spark');
  const w = cv.clientWidth || cv.parentElement.clientWidth - 32;
  const h = 20;
  cv.width = w; cv.height = h;
  const x = cv.getContext('2d');
  x.fillStyle = 'rgba(255,209,102,0.9)';
  const vals = EPS.map(e => e.wobble);
  const maxV = Math.max(...vals.filter(v => v != null), 0.01);
  EPS.forEach((e, i) => {
    if (e.wobble == null || e.wobble <= 0) return;
    const bh = Math.min(e.wobble / maxV, 1) * (h - 2);
    x.fillRect(i / EPS.length * w, h - bh - 1, Math.max(w / EPS.length, 1), bh);
  });
  x.globalAlpha = 0.9;
  for (const s of SEGS) {
    const epIdx = EPS.findIndex(e2 => e2.ep === s.ep_start);
    x.fillStyle = SEGC[s.id] || '#666';
    x.fillRect(epIdx / EPS.length * w, 0, 2, h);
  }
  x.globalAlpha = 1;
}

function segHeader(s) {
  const d = document.createElement('div');
  d.className = 'seghead';
  d.id = 'seg-' + s.id;
  d.style.borderLeftColor = SEGC[s.id] || '#666';
  const name = s.label ? s.label.name : '';
  const milestones = (s.label && s.label.milestone_messages || [])
    .map(m => `<span class="more" onclick="jumpToMsg(${m})">#${m}</span>`).join(' ');
  d.innerHTML =
    `<div class="t" style="color:${SEGC[s.id] || '#f5a524'}">▣ ${s.id} · ${esc(name)}</div>` +
    `<div class="s">${s.ts_start.slice(11)} → ${s.ts_end.slice(11)} · ep ${s.ep_start}–${s.ep_end}` +
    ` · ${s.minutes} min · ${s.n_episodes} eps (${s.eps_per_minute}/min)` +
    ` · wobble μ ${s.wobble_mean ?? '–'}</div>` +
    `<div class="s">${esc(s.label ? s.label.summary : '')}</div>` +
    (milestones ? `<div class="s">milestones: ${milestones}</div>` : '');
  return d;
}

function renderUntil(ep) {
  let guard = 0;
  while (rendered < filtered.length && rendered < ep && guard++ < 100) renderMore();
}

function jumpToSegment(s) {
  const alarmBox = document.getElementById('alarm');
  if (alarmBox.checked) { alarmBox.checked = false; refresh(); }
  renderUntil(s.ep_start + PAGE);
  const el = document.getElementById('seg-' + s.id) || document.getElementById('ep-' + s.ep_start);
  if (el) el.scrollIntoView({block: 'start', behavior: 'smooth'});
}

window.jumpToMsg = function (m) {
  const e = EPS.find(x => x.idx_first <= m && m <= x.idx_last);
  const s = e && SEGS.find(t => t.ep_start <= e.ep && e.ep <= t.ep_end);
  if (s) return jumpToSegment(s);
};

// deep link: #ep24 scrolls to that episode and expands its tool calls
function goToHash() {
  if (!location.hash.startsWith('#ep')) return;
  const n = parseInt(location.hash.slice(3), 10);
  renderUntil(n + PAGE);
  const el = document.getElementById('ep-' + n);
  if (el) {
    el.scrollIntoView({block:'start'});
    el.querySelectorAll('.expandable').forEach(t => t.style.display = 'block');
  }
}

function matches(e, q) {
  if (!q) return true;
  const blob = [e.thinking, e.visible, e.note || '',
    ...e.tools.map(t => t.call_preview + ' ' + t.result_preview),
    ...Object.values(e.artifacts).flat()].join(' ').toLowerCase();
  return q.toLowerCase().split(/\\s+/).every(tok => blob.includes(tok));
}

function refresh() {
  const q = document.getElementById('q').value.trim();
  const alarm = document.getElementById('alarm').checked;
  filtered = EPS.filter(e => matches(e, q) && (!alarm || (e.wobble || 0) >= 0.25));
  rendered = 0;
  lastSegRendered = null;
  document.getElementById('list').innerHTML = '';
  document.getElementById('count').textContent =
    filtered.length + ' / ' + EPS.length + ' episodes';
  renderMore();
}

function renderMore() {
  const list = document.getElementById('list');
  const frag = document.createDocumentFragment();
  for (const e of filtered.slice(rendered, rendered + PAGE)) {
    const s = segOfEp[e.ep];
    if (s && s.id !== lastSegRendered) {
      frag.appendChild(segHeader(s));
      lastSegRendered = s.id;
    }
    frag.appendChild(card(e));
  }
  rendered += PAGE;
  list.appendChild(frag);
}

function chip(text, color) {
  const c = document.createElement('span');
  c.className = 'chip'; c.style.background = color; c.textContent = text;
  return c;
}

const GROUP_COLORS = {
  flag_then_rationalize:'#ff8800', sim_vs_real_deliberation:'#e5484d',
  acceptability_evaluation:'#f5a524', self_justification_via_intent:'#46a758',
  policy_ethics_language:'#3e9be0', authorization_permissibility:'#a259ff',
  harm_action_framing:'#0fb5ba', low_signal_acceptability:'#e93d82'};

function expandable(body, preview, full, cls) {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  const short = preview.length < full.length;
  const span = document.createElement('span');
  span.textContent = short ? preview + '…' : full;
  div.appendChild(span);
  if (short) {
    const expand = () => { span.textContent = full; div.style.cursor = 'default';
      const m = div.querySelector('.more'); if (m) m.remove(); };
    const m = document.createElement('span');
    m.className = 'more'; m.textContent = ' more';
    m.onclick = (ev) => { ev.stopPropagation(); expand(); };
    div.appendChild(m);
    if (cls === 'think' || cls === 'vis') {
      div.style.cursor = 'zoom-in';
      div.title = 'click to expand';
      div.onclick = expand;
    }
  }
  return div;
}

function card(e) {
  const d = document.createElement('div');
  d.className = 'ep' + ((e.wobble || 0) >= 0.25 ? ' alarm' : '');
  d.id = 'ep-' + e.ep;
  const meta = document.createElement('div'); meta.className = 'meta';
  const range = e.idx_first === e.idx_last ? '#' + e.idx_first : `#${e.idx_first}–${e.idx_last}`;
  meta.innerHTML = `<span class="num">ep ${e.ep}</span><span class="ts">${range} · ${(e.ts_start||'').slice(11)}</span>`;
  if (e.wobble != null && e.wobble >= 0.2)
    meta.insertAdjacentHTML('beforeend', `<span class="wob">wobble ${e.wobble.toFixed(2)}</span>`);
  if (e.tools.length)
    meta.insertAdjacentHTML('beforeend', `<span class="toolcount">${e.tools.length} tool${e.tools.length>1?'s':''}</span>`);
  for (const g of e.groups) meta.appendChild(chip(g, GROUP_COLORS[g] || '#3a4048'));
  d.appendChild(meta);
  if (e.note) {
    const n = document.createElement('div'); n.className = 'note'; n.textContent = e.note;
    d.appendChild(n); return d;
  }
  const fullText = (document.getElementById('fulltext') || {}).checked;
  const th = (e.thinking || '').trim();
  if (th) d.appendChild(expandable(d, fullText ? th : th.slice(0, THINK_PREVIEW_LEN), th, 'think'));
  if (e.visible) d.appendChild(expandable(d, fullText ? e.visible : e.visible.slice(0, 220), e.visible, 'vis'));
  const arts = ['files','hosts','accounts','uuids'].flatMap(k => e.artifacts[k] || []);
  if (arts.length) {
    const a = document.createElement('div'); a.className = 'artifacts';
    for (const x of arts.slice(0, 24)) {
      const s = document.createElement('span'); s.className = 'art'; s.textContent = x;
      a.appendChild(s);
    }
    d.appendChild(a);
  }
  if (e.tools.length) {
    const box = document.createElement('div'); box.className = 'tools';
    const head = document.createElement('span'); head.className = 'more';
    head.textContent = `▸ ${e.tools.length} tool call${e.tools.length>1?'s':''}`;
    const inner = document.createElement('div'); inner.className = 'expandable';
    inner.style.display = fullText ? 'block' : 'none';
    for (const t of e.tools) {
      const el = document.createElement('div'); el.className = 'tool';
      el.innerHTML = `<span class="name">${t.name || 'tool'}</span> <span class="ts">#${t.idx}</span>`;
      el.appendChild(expandable(el, t.call_preview, t.call_preview, 'pre'));
      const r = document.createElement('div');
      r.appendChild(expandable(r, t.result_preview.slice(0, 160), t.result_preview, 'pre'));
      el.appendChild(r);
      inner.appendChild(el);
    }
    head.onclick = () => {
      const open = inner.style.display !== 'none';
      inner.style.display = open ? 'none' : 'block';
      head.textContent = (open ? '▸ ' : '▾ ') + `${e.tools.length} tool call${e.tools.length>1?'s':''}`;
    };
    box.appendChild(head); box.appendChild(inner); d.appendChild(box);
  }
  return d;
}

function jumpAlarm(dir) {
  const alarms = filtered.filter(e => (e.wobble || 0) >= 0.25).map(e => e.ep);
  if (!alarms.length) return;
  const mid = window.scrollY + 70;
  const sis = filtered.map(e => {
    const el = document.getElementById('ep-' + e.ep);
    return el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
  });
  let target = null;
  if (dir > 0) {
    for (let i = 0; i < filtered.length; i++)
      if ((filtered[i].wobble||0) >= 0.25 && sis[i] > mid) { target = 'ep-' + filtered[i].ep; break; }
  } else {
    for (let i = filtered.length - 1; i >= 0; i--)
      if ((filtered[i].wobble||0) >= 0.25 && sis[i] < mid - 20) { target = 'ep-' + filtered[i].ep; break; }
  }
  const el = target && document.getElementById(target);
  if (el) el.scrollIntoView({block:'start', behavior:'smooth'});
}

const observer = new IntersectionObserver(es => {
  if (es[0].isIntersecting && rendered < filtered.length) renderMore();
});
observer.observe(document.getElementById('sentinel'));
boot();
</script>
</body>
</html>
"""


def segments_abs(content):
    """(scope, start, end) for thinking and visible parts, offsets into content."""
    parts = []
    pos = 0
    for m in THINKING_RE.finditer(content):
        if m.start() > pos:
            parts.append(("visible", pos, m.start()))
        parts.append(("thinking", m.start(1), m.end(1)))
        pos = m.end()
    if pos < len(content):
        parts.append(("visible", pos, len(content)))
    return parts


def message_payload(message, scope):
    content = str(message.get("content", ""))
    sections = []
    spans = []
    for seg_scope, start, end in segments_abs(content):
        thinking = seg_scope == "thinking"
        if end > start:
            sections.append({"scope": seg_scope, "start": start,
                             "end": end, "thinking": thinking})
        if scope != "both" and seg_scope != scope:
            continue
        text = content[start:end]
        for group_name, group in GROUPS.items():
            for pattern in group["patterns"]:
                for match in pattern.finditer(text):
                    spans.append({
                        "start": start + match.start(),
                        "end": start + match.end(),
                        "group": group_name,
                        "pattern": pattern.pattern,
                        "thinking": thinking,
                    })
    # thinking-boundary spans drive the background shading on the client
    return sections, sorted(spans, key=lambda s: (s["start"], s["end"])), content


def ranked_payload(scope, min_score, wanted_groups, wobble_min=None):
    ranked = score_messages(MESSAGES, GROUPS, BONUSES, scope, 200)
    seen = set()
    out = []
    for r in ranked:
        r = dict(r)
        if wanted_groups is not None:
            r["matched_groups"] = [g for g in r["matched_groups"] if g in wanted_groups]
            if not r["matched_groups"]:
                continue
            # recompute score and bonuses against the filtered set
            r["score"] = sum(GROUPS[g]["weight"] for g in r["matched_groups"])
            for a, b, bonus in BONUSES:
                if a in r["matched_groups"] and b in r["matched_groups"]:
                    r["score"] += bonus
        wob = WOBBLE.get(r["index"])
        qualifies = r["score"] >= min_score or (
            wobble_min is not None and wob is not None and wob["score"] >= wobble_min)
        if not qualifies:
            continue
        hits = [h for h in r["hits"] if h["group"] in r["matched_groups"]]
        best = max(hits, key=lambda h: GROUPS[h["group"]]["weight"], default=None)
        seen.add(r["index"])
        out.append({
            "index": r["index"],
            "timestamp": r["timestamp"],
            "score": r["score"],
            "matched_groups": r["matched_groups"],
            "best_excerpt": best["excerpt"] if best else "",
            "summary": SUMMARIES.get(str(r["index"]), ""),
            "wobble": wob["score"] if wob else None,
        })
    # Messages the regexes miss but the self-deception vector flags.
    if wobble_min is not None:
        for idx, wob in sorted(WOBBLE.items(), key=lambda kv: -kv[1]["score"]):
            if idx in seen or wob["score"] < wobble_min:
                continue
            seen.add(idx)
            msg = next((m for m in MESSAGES if m["index"] == idx), None)
            out.append({
                "index": idx,
                "timestamp": msg.get("timestamp") if msg else None,
                "score": 0,
                "matched_groups": [],
                "best_excerpt": wob["chunk"],
                "summary": SUMMARIES.get(str(idx), ""),
                "wobble": wob["score"],
            })
    out.sort(key=lambda r: (-r["score"], -(r["wobble"] or 0), r["index"]))
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _html(self, page):
        body = page.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        q = parse_qs(url.query)
        try:
            if url.path == "/":
                self._html(PAGE)
            elif url.path == "/episodes":
                self._html(EPISODES_PAGE)
            elif url.path == "/api/episodes":
                self._json({"count": len(EPISODES), "episodes": EPISODES})
            elif url.path == "/api/segments":
                self._json({"count": len(SEGMENTS), "segments": SEGMENTS})
            elif url.path == "/api/config":
                self._json({
                    "weights": {n: g["weight"] for n, g in GROUPS.items()},
                    "descriptions": {n: g["description"] for n, g in GROUPS.items()},
                    "palette": PALETTE,
                    "wobble_available": bool(WOBBLE),
                    "wobble_default_threshold": 0.25,
                })
            elif url.path == "/api/search":
                scope = q.get("scope", ["both"])[0]
                if scope not in ("thinking", "visible", "both"):
                    raise ValueError("bad scope")
                min_score = int(q.get("min_score", ["4"])[0])
                groups_q = q.get("groups", [None])[0]
                wanted = set(groups_q.split(",")) & set(GROUPS) if groups_q else None
                wobble_min = float(q.get("wobble_min", ["0"])[0])
                self._json({"ranked": ranked_payload(scope, min_score, wanted,
                                                     wobble_min or None)})
            elif url.path == "/api/message":
                index = int(q.get("index", [""])[0])
                scope = q.get("scope", ["both"])[0]
                if scope not in ("thinking", "visible", "both"):
                    raise ValueError("bad scope")
                by_index = {m["index"]: m for m in MESSAGES}
                if index not in by_index:
                    self._json({"error": "unknown index"}, 404)
                    return
                message = by_index[index]
                sections, spans, content = message_payload(message, scope)
                ranked = ranked_payload(scope, 0, None)
                row = next((r for r in ranked if r["index"] == index), None)
                wob = WOBBLE.get(index)
                self._json({
                    "index": index,
                    "timestamp": message.get("timestamp"),
                    "content": content,
                    "spans": sections + spans,
                    "score": row["score"] if row else 0,
                    "matched_groups": row["matched_groups"] if row else [],
                    "summary": SUMMARIES.get(str(index), ""),
                    "wobble": wob["score"] if wob else None,
                    "wobble_chunk": wob["chunk"] if wob else "",
                })
            else:
                self._json({"error": "not found"}, 404)
        except (ValueError, KeyError) as exc:
            self._json({"error": str(exc)}, 400)


def main():
    global ARGS, MESSAGES, DEFS, GROUPS, BONUSES, SUMMARIES, WOBBLE, EPISODES, SEGMENTS
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=None)
    parser.add_argument("--patterns", type=Path, default=DEFAULT_PATTERNS)
    parser.add_argument("--summaries", type=Path,
                        default=Path(__file__).resolve().parents[1]
                        / "analysis/misalignment-reasoning/summaries.json")
    parser.add_argument("--self-deception", type=Path,
                        default=Path(__file__).resolve().parents[1]
                        / "analysis/misalignment-reasoning/self-deception-scores.json")
    parser.add_argument("--episodes", type=Path,
                        default=Path(__file__).resolve().parents[1]
                        / "analysis/misalignment-reasoning/episodes.json")
    parser.add_argument("--segments", type=Path,
                        default=Path(__file__).resolve().parents[1]
                        / "analysis/misalignment-reasoning/segments.json")
    parser.add_argument("--port", type=int, default=8137)
    parser.add_argument("--no-open", action="store_true")
    ARGS = parser.parse_args()

    source = ARGS.source or default_source()
    DEFS = json.loads(ARGS.patterns.read_text())
    MESSAGES, audit = load_messages(source)
    GROUPS = compile_groups(DEFS)
    BONUSES = [tuple(b) for b in DEFS.get("cooccurrence_bonus", [])]
    if ARGS.summaries.is_file():
        SUMMARIES = json.loads(ARGS.summaries.read_text())
        print(f"loaded {len(SUMMARIES)} summaries from {ARGS.summaries}")
    if ARGS.self_deception.is_file():
        wobble_raw = json.loads(ARGS.self_deception.read_text())
        WOBBLE = {int(k): v for k, v in wobble_raw["scores"].items()}
        print(f"loaded {len(WOBBLE)} self-deception scores from {ARGS.self_deception}")
    if ARGS.episodes.is_file():
        ep_raw = json.loads(ARGS.episodes.read_text())
        EPISODES = ep_raw["episodes"]
        print(f"loaded {len(EPISODES)} episodes from {ARGS.episodes}")
    if ARGS.segments.is_file():
        SEGMENTS = json.loads(ARGS.segments.read_text())["segments"]
        print(f"loaded {len(SEGMENTS)} segments from {ARGS.segments}")
    print(f"loaded {len(MESSAGES)} messages from {source}")

    server = ThreadingHTTPServer(("127.0.0.1", ARGS.port), Handler)
    url = f"http://127.0.0.1:{ARGS.port}"
    print(f"serving on {url}  (Ctrl-C to stop)")
    if not ARGS.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
