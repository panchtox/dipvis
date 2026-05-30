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

  var tries = 0, MAX_TRIES = 100; // ~20s de espera máxima

  function ready() {
    return window.dips && window.dips.length &&
      !d3.select('#posturas svg').empty() &&
      d3.selectAll('path.posturadip').size() > 0 &&
      document.querySelector('#posturas .panel-cap'); // el caption lo inyecta theme-init.js
  }

  function init() {
    if (!ready()) {
      if (++tries > MAX_TRIES) {
        if (window.console) console.warn('olas.js: no apareció #posturas .panel-cap; capa no inicializada');
        return;
      }
      setTimeout(init, 200);
      return;
    }
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
