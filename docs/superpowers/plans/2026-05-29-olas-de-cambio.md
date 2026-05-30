# Olas de cambio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una capa conmutable a los fideos de `index.html` que detecta y resalta diputados que cambian de bando (oficialista↔opositor), agrupados en "olas" por año y dirección, con panorama + aislar.

**Architecture:** Un script standalone `olas.js` (estilo `theme-init.js`) que, tras renderizar el gráfico, lee el global `dips`, detecta cruces de signo del `idp` entre años consecutivos, inyecta un toggle + un panel de olas, y conmuta clases CSS sobre los `path.posturadip` más marcas ✕ dibujadas en el SVG. No se toca la lógica D3 inline. Los estilos viven en `styles/theme.css` para respetar los temas.

**Tech Stack:** D3 v3 (ya cargado, global `d3`), JS vanilla, CSS con tokens de `theme.css`. Verificación con Playwright-core + Chromium ya instalado.

**Spec:** `docs/superpowers/specs/2026-05-29-olas-de-cambio-design.md`

---

## Precondiciones

- El server estático corre en `http://localhost:8888` sirviendo el repo (si no: `python -m http.server 8888` desde la raíz del repo).
- Playwright-core para verificación: en un dir temporal aparte del repo
  (`%USERPROFILE%\AppData\Local\Temp\dipvis-test`), `npm init -y && npm install playwright-core`.
- Chromium: `%USERPROFILE%\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe`.

Helper de cabecera para los scripts de verificación (Node ESM):

```js
import { chromium } from 'playwright-core';
const CHROME = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:8888/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000); // los callbacks d3.json dibujan el gráfico
```

---

## Task 1: Detección + wiring

**Files:**
- Create: `olas.js`
- Modify: `index.html` (agregar `<script src="olas.js"></script>` tras `theme-init.js`, ~línea 244)
- Test: `%TEMP%\dipvis-test\t1.mjs`

- [ ] **Step 1: Escribir el test de detección (falla porque `olas.js` no existe)**

Crear `%USERPROFILE%\AppData\Local\Temp\dipvis-test\t1.mjs`:

```js
import { chromium } from 'playwright-core';
const CHROME = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:8888/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const counts = await page.evaluate(() => {
  if (!window.DipVisOlas) return { __missing: true };
  const waves = window.DipVisOlas.detect(window.dips, 0); // umbral 0 = tabla del spec
  const m = {};
  waves.forEach(w => { m[w.key] = w.members.length; });
  return m;
});
const expect = { '2008|ofi-opo': 24, '2009|ofi-opo': 12, '2011|opo-ofi': 23, '2010|opo-ofi': 14 };
let ok = !counts.__missing;
for (const k in expect) if (counts[k] !== expect[k]) ok = false;
console.log(JSON.stringify({ ok, counts, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd %USERPROFILE%\AppData\Local\Temp\dipvis-test && node t1.mjs`
Expected: FAIL — `ok: false`, `counts: { "__missing": true }` (no existe `window.DipVisOlas`).

- [ ] **Step 3: Crear `olas.js` (detección + estado, sin UI todavía)**

Crear `olas.js` en la raíz del repo:

```js
/* ============================================================
   DipVis — olas.js
   Capa "Olas de cambio": detecta y resalta diputados que cruzan
   de bando (oficialista <-> opositor), agrupados por (año, dirección).
   No toca la lógica de D3 del gráfico.
   ============================================================ */
(function () {
  var THRESHOLD = 0.1; // mínimo de magnitud para contar un cruce (anti-ruido)

  // ---- detección pura ----
  // dir: "ofi-opo" llega a idp>0 ; "opo-ofi" llega a idp<0
  function detect(dips, threshold) {
    if (threshold == null) threshold = 0;
    var waves = {};
    (dips || []).forEach(function (d) {
      var pts = d.points.slice().sort(function (a, b) { return a.year - b.year; });
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i];
        if ((a.idp < 0) === (b.idp < 0)) continue;                 // no cruza el 0
        if (Math.max(Math.abs(a.idp), Math.abs(b.idp)) < threshold) continue; // trivial
        var dir = b.idp > 0 ? 'ofi-opo' : 'opo-ofi';
        var key = b.year + '|' + dir;
        var t = a.year + (0 - a.idp) / (b.idp - a.idp) * (b.year - a.year); // x del cruce
        if (!waves[key]) waves[key] = { year: b.year, dir: dir, key: key, members: [], crossings: [] };
        waves[key].members.push(d.id);
        waves[key].crossings.push({ id: d.id, t: t });
      }
    });
    return Object.keys(waves).map(function (k) { return waves[k]; })
      .sort(function (x, y) { return y.members.length - x.members.length; });
  }

  // expuesto para verificación / reuso
  window.DipVisOlas = { detect: detect, THRESHOLD: THRESHOLD };

  // ---- estado ----
  var waves = null, active = false, isolatedKey = null, panel = null, markLayer = null;

  function ready() {
    return window.dips && window.dips.length &&
      !d3.select('#posturas svg').empty() &&
      d3.selectAll('path.posturadip').size() > 0;
  }

  function init() {
    if (!ready()) { setTimeout(init, 200); return; }
    waves = detect(window.dips, THRESHOLD);
    window.DipVisOlas.waves = waves;
    buildUI();
  }

  // re-derivar escalas (las del gráfico son locales al callback de D3)
  function scales() {
    var idps = [];
    window.dips.forEach(function (d) { d.points.forEach(function (p) { idps.push(p.idp); }); });
    return {
      x: d3.time.scale().domain([2006, 2011]).range([margin1, w - margin1]),
      y: d3.scale.linear().domain([d3.min(idps), d3.max(idps)]).range([h - margin1, margin1])
    };
  }

  // ---- UI ----
  function buildUI() {
    var cap = document.querySelector('#posturas .panel-cap');
    if (!cap || cap.querySelector('.olas-toggle')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'olas-toggle';
    btn.innerHTML = 'Olas de cambio';
    btn.addEventListener('click', function () { setActive(!active); });
    cap.appendChild(btn);

    panel = document.createElement('div');
    panel.className = 'olas-panel';
    panel.style.display = 'none';
    var title = document.createElement('p');
    title.className = 'olas-panel-title';
    title.innerHTML = 'Olas de cambio';
    panel.appendChild(title);
    waves.forEach(function (wv) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'olas-row dir-' + wv.dir;
      row.setAttribute('data-key', wv.key);
      var arrow = wv.dir === 'ofi-opo' ? 'ofi&rarr;opo' : 'opo&rarr;ofi';
      row.innerHTML =
        '<span class="olas-sw"></span>' +
        '<span class="olas-yr">' + wv.year + '</span> ' +
        '<span class="olas-dir">' + arrow + '</span>' +
        '<span class="olas-n">' + wv.members.length + '</span>';
      row.addEventListener('click', function (e) { e.stopPropagation(); isolate(wv.key); });
      panel.appendChild(row);
    });
    var all = document.createElement('button');
    all.type = 'button';
    all.className = 'olas-all';
    all.innerHTML = 'Ver todas';
    all.addEventListener('click', function (e) { e.stopPropagation(); isolate(null); });
    panel.appendChild(all);
    document.getElementById('posturas').appendChild(panel);
  }

  function setActive(on) {
    active = on;
    isolatedKey = null;
    document.body.classList.toggle('olas-mode', on);
    var tog = document.querySelector('.olas-toggle');
    if (tog) tog.classList.toggle('active', on);
    if (panel) panel.style.display = on ? '' : 'none';
    if (on) { applyClasses(); drawMarks(); }
    else { clearClasses(); clearMarks(); }
  }

  function applyClasses() {
    d3.selectAll('path.posturadip')
      .classed('dim', true).classed('wave-up', false).classed('wave-down', false);
    waves.forEach(function (wv) {
      if (isolatedKey && wv.key !== isolatedKey) return;
      var cls = wv.dir === 'ofi-opo' ? 'wave-up' : 'wave-down';
      wv.members.forEach(function (id) {
        var p = d3.select('#dip' + id);
        if (!p.empty()) p.classed('dim', false).classed(cls, true);
      });
    });
  }

  function clearClasses() {
    d3.selectAll('path.posturadip').classed('dim', false).classed('wave-up', false).classed('wave-down', false);
  }

  function drawMarks() {
    clearMarks();
    var svg = d3.select('#posturas svg');
    if (svg.empty()) return;
    var sc = scales(), r = 4;
    markLayer = svg.append('g').attr('class', 'olas-marks');
    waves.forEach(function (wv) {
      if (isolatedKey && wv.key !== isolatedKey) return;
      wv.crossings.forEach(function (cr) {
        var g = markLayer.append('g')
          .attr('class', 'olas-mark dir-' + wv.dir)
          .attr('transform', 'translate(' + sc.x(cr.t) + ',' + sc.y(0) + ')');
        g.append('line').attr('x1', -r).attr('y1', -r).attr('x2', r).attr('y2', r);
        g.append('line').attr('x1', -r).attr('y1', r).attr('x2', r).attr('y2', -r);
      });
    });
  }

  function clearMarks() {
    if (markLayer) { markLayer.remove(); markLayer = null; }
    d3.select('#posturas svg').selectAll('g.olas-marks').remove();
  }

  function isolate(key) {
    isolatedKey = key;
    if (panel) {
      var rows = panel.querySelectorAll('.olas-row');
      for (var i = 0; i < rows.length; i++)
        rows[i].classList.toggle('active', !!key && rows[i].getAttribute('data-key') === key);
    }
    applyClasses();
    drawMarks();
  }

  // clic afuera del panel vuelve al panorama
  document.addEventListener('click', function (e) {
    if (!active || !isolatedKey) return;
    if (e.target.closest && (e.target.closest('.olas-panel') || e.target.closest('.olas-toggle'))) return;
    isolate(null);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
```

- [ ] **Step 4: Wire en `index.html`**

Modificar `index.html`: justo después de la línea `<script src="theme-init.js"></script>` (la última de la "DipVis theme layer", ~línea 244), agregar:

```html
<script src="olas.js"></script>
```

- [ ] **Step 5: Correr el test de detección y verificar que pasa**

Run: `cd %USERPROFILE%\AppData\Local\Temp\dipvis-test && node t1.mjs`
Expected: PASS — `ok: true`, `counts` incluye `"2008|ofi-opo": 24`, `"2011|opo-ofi": 23`, `"2010|opo-ofi": 14`, `"2009|ofi-opo": 12`, `errors: []`.

- [ ] **Step 6: Commit**

```bash
git add olas.js index.html
git commit -m "feat(home): detección de olas de cambio de bando + wiring"
```

---

## Task 2: Estilos de la capa + verificación de interacción

**Files:**
- Modify: `styles/theme.css` (agregar bloque al final)
- Test: `%TEMP%\dipvis-test\t2.mjs`

- [ ] **Step 1: Escribir el test de interacción (falla porque faltan estilos/comportamiento visible)**

Crear `%USERPROFILE%\AppData\Local\Temp\dipvis-test\t2.mjs`:

```js
import { chromium } from 'playwright-core';
const CHROME = process.env.USERPROFILE + '\\AppData\\Local\\ms-playwright\\chromium-1217\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:8888/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const res = {};
// toggle existe
res.toggleExists = await page.$('.olas-toggle') !== null;
// prender
await page.click('.olas-toggle');
await page.waitForTimeout(300);
res.panorama = await page.evaluate(() => ({
  bodyMode: document.body.classList.contains('olas-mode'),
  up: document.querySelectorAll('path.posturadip.wave-up').length,
  down: document.querySelectorAll('path.posturadip.wave-down').length,
  dim: document.querySelectorAll('path.posturadip.dim').length,
  marks: document.querySelectorAll('.olas-marks .olas-mark').length,
  panelVisible: getComputedStyle(document.querySelector('.olas-panel')).display !== 'none',
  dimOpacity: (function(){var p=document.querySelector('path.posturadip.dim');return p?getComputedStyle(p).opacity:null;})(),
  upStroke: (function(){var p=document.querySelector('path.posturadip.wave-up');return p?getComputedStyle(p).stroke:null;})()
}));
// aislar la primera ola del panel (la más grande)
const firstKey = await page.evaluate(() => document.querySelector('.olas-row').getAttribute('data-key'));
const expectMembers = await page.evaluate(k => window.DipVisOlas.waves.find(w => w.key === k).members.length, firstKey);
await page.click('.olas-row');
await page.waitForTimeout(300);
res.isolated = await page.evaluate(() => ({
  upPlusDown: document.querySelectorAll('path.posturadip.wave-up, path.posturadip.wave-down').length,
  marks: document.querySelectorAll('.olas-marks .olas-mark').length
}));
res.expectMembers = expectMembers;
// volver al panorama
await page.click('.olas-all');
await page.waitForTimeout(300);
res.backToPanorama = await page.evaluate(() =>
  document.querySelectorAll('path.posturadip.wave-up, path.posturadip.wave-down').length);
// apagar
await page.click('.olas-toggle');
await page.waitForTimeout(300);
res.off = await page.evaluate(() => ({
  bodyMode: document.body.classList.contains('olas-mode'),
  dim: document.querySelectorAll('path.posturadip.dim').length,
  marks: document.querySelectorAll('.olas-marks .olas-mark').length
}));

const ok =
  res.toggleExists &&
  res.panorama.bodyMode && res.panorama.up > 0 && res.panorama.down > 0 &&
  res.panorama.dim > 0 && res.panorama.marks > 0 && res.panorama.panelVisible &&
  parseFloat(res.panorama.dimOpacity) < 1 &&
  res.isolated.upPlusDown === res.expectMembers &&
  res.isolated.marks === res.expectMembers &&
  res.backToPanorama > res.expectMembers &&
  !res.off.bodyMode && res.off.dim === 0 && res.off.marks === 0 &&
  errors.length === 0;
console.log(JSON.stringify({ ok, res, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd %USERPROFILE%\AppData\Local\Temp\dipvis-test && node t2.mjs`
Expected: FAIL — el comportamiento JS funciona pero `panorama.dimOpacity` es `"1"` (sin CSS de dim) y/o `panelVisible` resuelve mal → `ok: false`. (Confirma que el test depende del CSS.)

- [ ] **Step 3: Agregar el bloque de estilos al final de `styles/theme.css`**

```css
/* ===== Capa "Olas de cambio" (home) ===== */
:root { --olas-up: #b0671f; --olas-down: #2f6f8f; --olas-dim: #d8d4cc; }
[data-theme="ink"] { --olas-dim: #2b303b; }

#posturas { position: relative; }

.olas-toggle {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: .06em;
  text-transform: uppercase; cursor: pointer; background: transparent;
  color: var(--ink-soft); border: 1px solid var(--line-2); border-radius: 999px;
  padding: 4px 12px; margin-left: 14px;
}
.olas-toggle:hover { border-color: var(--accent); color: var(--ink); }
.olas-toggle.active { background: var(--accent); color: #fff; border-color: var(--accent); }

body.olas-mode .posturadip.dim { stroke: var(--olas-dim) !important; opacity: .35; }
body.olas-mode .posturadip.wave-up { stroke: var(--olas-up) !important; opacity: 1; stroke-width: 2.2; }
body.olas-mode .posturadip.wave-down { stroke: var(--olas-down) !important; opacity: 1; stroke-width: 2.2; }

.olas-marks line { stroke-width: 1.6; stroke-linecap: round; }
.olas-mark.dir-ofi-opo line { stroke: var(--olas-up); }
.olas-mark.dir-opo-ofi line { stroke: var(--olas-down); }

.olas-panel {
  position: absolute; top: 46px; right: 14px; z-index: 5;
  background: var(--panel, #fff); border: 1px solid var(--line-2);
  border-radius: 8px; padding: 10px 12px; min-width: 152px;
  box-shadow: 0 6px 24px rgba(0,0,0,.12); font-family: var(--font-body);
}
.olas-panel-title {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--faint); margin: 0 0 8px;
}
.olas-row {
  display: flex; align-items: center; gap: 7px; width: 100%;
  background: transparent; border: 0; cursor: pointer; text-align: left;
  padding: 3px 4px; border-radius: 5px; font-size: 12.5px; color: var(--ink-soft);
}
.olas-row:hover { background: var(--panel-2, rgba(0,0,0,.04)); }
.olas-row.active { background: var(--panel-2, rgba(0,0,0,.07)); font-weight: 600; color: var(--ink); }
.olas-row .olas-sw { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.olas-row.dir-ofi-opo .olas-sw { background: var(--olas-up); }
.olas-row.dir-opo-ofi .olas-sw { background: var(--olas-down); }
.olas-row .olas-yr { font-family: var(--font-mono); }
.olas-row .olas-dir { color: var(--faint); }
.olas-row .olas-n { margin-left: auto; font-family: var(--font-mono); font-weight: 600; color: var(--ink); }
.olas-all {
  margin-top: 6px; width: 100%; background: transparent; border: 0; cursor: pointer;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em;
  text-transform: uppercase; color: var(--faint); padding: 4px;
}
.olas-all:hover { color: var(--accent); }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd %USERPROFILE%\AppData\Local\Temp\dipvis-test && node t2.mjs`
Expected: PASS — `ok: true`. En particular: `panorama` con `up>0`, `down>0`, `dim>0`, `marks>0`, `dimOpacity` `"0.35"`; `isolated.upPlusDown === expectMembers` y `isolated.marks === expectMembers`; `backToPanorama > expectMembers`; `off` con `dim:0`, `marks:0`, `bodyMode:false`; `errors: []`.

- [ ] **Step 5: Verificación visual (screenshot)**

Run:
```bash
cd "C:\Users\frana\00_DEV\00_playground\dipvis"
"%USERPROFILE%\AppData\Local\ms-playwright\chromium-1217\chrome-win64\chrome.exe" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --virtual-time-budget=12000 --screenshot="%CD%\_olas.png" --window-size=1500,950 "http://localhost:8888/index.html"
```
Luego, en una sesión interactiva, prender el toggle y capturar; revisar que el panorama colorea por dirección, el resto queda gris, las ✕ caen sobre la línea del 0, y el panel lista las olas con conteos. Borrar `_olas.png` al terminar.

- [ ] **Step 6: Commit**

```bash
git add styles/theme.css
git commit -m "feat(home): estilos de la capa olas de cambio (panorama, panel, marcas)"
```

---

## Notas para el ejecutor

- **No tocar** el `<script>` D3 inline de `index.html` ni `matrix2.html`.
- `olas.js` depende de los globals `dips`, `w`, `h`, `margin1`, `d3` que ya define `index.html`. Si alguno se renombra, `olas.js` se rompe — son el contrato.
- El umbral `THRESHOLD = 0.1` está al tope de `olas.js`; el test de detección usa umbral `0` a propósito para chequear contra la tabla del spec. Con `0.1` los conteos pueden ser ≤ los de la tabla (se descartan cruces triviales): es esperado.
- Las marcas ✕ usan interpolación lineal del cruce; la curva real es `basis`, así que el ✕ es una aproximación visual (aceptado en el spec).
