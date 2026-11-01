/* ============================================================
   DipVis — theme-init.js
   1) fija la dirección visual (data-theme) lo antes posible
   2) inyecta marca, selector de tema, captions, leyenda y footer
   No modifica la lógica de D3.
   ============================================================ */
(function () {
  var THEMES = ["editorial", "minimal", "ink"];
  var LABELS = { editorial: "Editorial", minimal: "Minimal", ink: "Ink" };
  var KEY = "dipvis-theme";
  // Configuración por página (opcional). Sin window.DIPVIS, todo queda como en 2006-2011.
  var CFG = window.DIPVIS || {};
  var BASE = CFG.base || "";
  var PERIODO = CFG.periodo || "2006&ndash;2011";
  var LEDE = CFG.lede || ('Cada hilo es la trayectoria de un diputado al votar los proyectos de ley ' +
    'entre 2006 y 2011. Cuanto m&aacute;s arriba, m&aacute;s opositor; cuanto m&aacute;s abajo, m&aacute;s oficialista. ' +
    'Pas&aacute; el cursor por una l&iacute;nea o una provincia para destacarla.');
  var DATOS = CFG.datos || "Datos 2006&ndash;2011 &middot; UBA &middot; Maestr&iacute;a en Explotaci&oacute;n de Datos";

  // ---- 1. set theme ASAP ----
  function currentTheme() {
    var p = null;
    try { p = new URLSearchParams(location.search).get("theme"); } catch (e) {}
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    var t = p || stored || "editorial";
    if (THEMES.indexOf(t) === -1) t = "editorial";
    return t;
  }
  function refreshSvgPaint() {
    // Chromium no reevalúa el paint (fill/stroke) de los SVG cuando cambia
    // un atributo del ancestro. Forzamos un rebuild del render-tree del SVG
    // ocultándolo y mostrándolo: se conserva el DOM y los handlers de D3.
    var svgs = document.querySelectorAll("svg");
    for (var i = 0; i < svgs.length; i++) {
      var s = svgs[i];
      var prev = s.style.display;
      s.style.display = "none";
      void s.getBoundingClientRect();
      s.style.display = prev;
    }
  }
  function applyTheme(t, persist) {
    document.documentElement.setAttribute("data-theme", t);
    if (persist) { try { localStorage.setItem(KEY, t); } catch (e) {} }
    var btns = document.querySelectorAll(".theme-switch button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-theme") === t);
    }
    if (persist) {
      // sólo al cambiar en vivo (no en la carga inicial)
      requestAnimationFrame(refreshSvgPaint);
    }
  }
  var initial = currentTheme();
  applyTheme(initial, false);

  // ---- favicons (en la raíz; aplican a todo el sitio) ----
  (function () {
    var head = document.head || document.getElementsByTagName("head")[0];
    if (!head || head.querySelector("link[data-dipvis-favicon]")) return;
    function icon(rel, href, type, sizes) {
      var l = document.createElement("link");
      l.rel = rel; l.href = href;
      if (type) l.type = type;
      if (sizes) l.setAttribute("sizes", sizes);
      l.setAttribute("data-dipvis-favicon", "");
      head.appendChild(l);
    }
    icon("icon", BASE + "favicon.svg", "image/svg+xml");
    icon("icon", BASE + "favicon-32.png", "image/png", "32x32");
    icon("apple-touch-icon", BASE + "apple-touch-icon.png");
  })();

  // ---- helpers ----
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pageType() {
    if (document.getElementById("posturas")) return "home";
    if (document.getElementById("heatmap")) return "matrix";
    return "doc";
  }

  function build() {
    var menu = document.querySelector("ul.menu");

    // ---- marca ----
    if (menu && !menu.querySelector(".brand")) {
      var brand = el("a", "brand");
      brand.href = "index.html";
      brand.innerHTML =
        '<span class="brand-mark"></span>' +
        '<span class="brand-text">' +
        '<span class="brand-name">DipVis</span>' +
        '<span class="brand-sub">posturas legislativas &middot; ' + PERIODO + '</span>' +
        "</span>";
      var li = el("li", "brand-li");
      li.appendChild(brand);
      menu.insertBefore(li, menu.firstChild);
    }

    // ---- marcar link activo ----
    if (menu) {
      var here = (location.pathname.split("/").pop() || "index.html");
      var links = menu.querySelectorAll("a[href]");
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href") || "";
        if (href && href.split("/").pop() === here && !links[i].closest(".brand")) {
          links[i].classList.add("is-active");
        }
      }
    }

    // ---- selector de dirección ----
    if (menu && !menu.querySelector(".theme-switch")) {
      var sw = el("li", "theme-switch");
      var track = el("span", "ts-track");
      THEMES.forEach(function (t) {
        var b = el("button", null, LABELS[t]);
        b.setAttribute("data-theme", t);
        b.addEventListener("click", function () { applyTheme(t, true); });
        track.appendChild(b);
      });
      sw.appendChild(el("span", "ts-label", "Direcci&oacute;n"));
      sw.appendChild(track);
      menu.appendChild(sw);
    }
    applyTheme(document.documentElement.getAttribute("data-theme"), false);

    var type = pageType();
    if (type === "home") enhanceHome();
    if (type === "matrix") enhanceMatrix();
    if (type === "doc") enhanceDoc();

    injectFooter(type);
  }

  // ---- HOME ----
  function enhanceHome() {
    var table = document.querySelector("body > table");
    if (!table) return;

    // shell + cabecera
    if (!document.querySelector(".viz-shell")) {
      var shell = el("div", "viz-shell");
      table.parentNode.insertBefore(shell, table);
      var head = el("div", "viz-head",
        '<p class="viz-kicker">C&aacute;mara de Diputados &middot; Argentina</p>' +
        '<h1 class="viz-title">El pulso del voto, diputado por diputado</h1>' +
        '<p class="viz-lede">' + LEDE + '</p>');
      shell.appendChild(head);
      shell.appendChild(table);
    }

    // etiqueta del combo
    var combo = document.getElementById("combo");
    if (combo && !combo.querySelector(".combo-label")) {
      var wrap = el("div", "combo-wrap");
      var lbl = el("span", "combo-label", "Resaltar diputados");
      combo.insertBefore(wrap, combo.firstChild);
      wrap.appendChild(lbl);
    }

    // caption + leyenda del gráfico
    var posturas = document.getElementById("posturas");
    if (posturas && !posturas.querySelector(".panel-cap")) {
      var cap = el("div", "panel-cap");
      cap.innerHTML =
        '<span class="pc-title">Posturas de voto, ' + PERIODO + '</span>' +
        '<div class="viz-legend" style="padding:0;border:none;background:none">' +
        '<span class="lg op"><span class="sw"></span><b>Opositora</b></span>' +
        '<span class="lg va"><span class="sw"></span><b>Variable</b></span>' +
        '<span class="lg of"><span class="sw"></span><b>Oficialista</b></span>' +
        "</div>";
      posturas.insertBefore(cap, posturas.firstChild);
    }

    // caption del mapa
    var mapa = document.getElementById("mapa");
    if (mapa && !mapa.querySelector(".panel-cap")) {
      var capm = el("div", "panel-cap");
      capm.innerHTML =
        '<span class="pc-title">Por provincia</span>' +
        '<span class="pc-hint">clic &rarr; mapa de calor</span>';
      mapa.insertBefore(capm, mapa.firstChild);
    }
  }

  // ---- MATRIX ----
  function enhanceMatrix() {
    var controls = document.getElementById("controls");
    if (controls && !controls.querySelector(".ctrl-eyebrow")) {
      var eb = el("p", "ctrl-eyebrow", "Mapa de afinidad");
      var prov = document.getElementById("nombreProvincia");
      if (prov) controls.insertBefore(eb, prov.nextSibling);
      else controls.insertBefore(eb, controls.firstChild);
    }
    var ref = document.getElementById("refBloque");
    if (ref && !ref.querySelector(".refbloque-title")) {
      ref.insertBefore(el("p", "refbloque-title", "Bloques"), ref.firstChild);
    }
    var near = document.getElementById("near");
    if (near && !near.querySelector(".near-title")) {
      near.insertBefore(el("p", "near-title", "Diputados m&aacute;s afines"), near.firstChild);
    }
  }

  // ---- DOC ----
  function enhanceDoc() {
    document.body.classList.add("doc");
  }

  // ---- FOOTER ----
  function injectFooter(type) {
    if (document.querySelector(".site-footer")) return;
    var f = el("footer", "site-footer");
    f.innerHTML =
      '<span class="dot"></span>' +
      '<span>DipVis &mdash; visualizaci&oacute;n de posturas legislativas</span>' +
      '<span>&middot;</span>' +
      '<span>' + DATOS + '</span>' +
      '<span style="margin-left:auto"><a href="' + BASE + 'equipo.html">Equipo</a> &middot; ' +
      '<a href="' + BASE + 'datosOriginales.html">Datos</a> &middot; ' +
      '<a href="' + BASE + 'disclaimer.html">Aclaraciones</a></span>';
    document.body.appendChild(f);
  }

  // run
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
