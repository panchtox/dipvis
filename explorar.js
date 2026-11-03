/* ============================================================
   DipVis — explorar.js
   Lo que comparten la portada y la página de comunidades:
   colores por familia de bloque, nombres prolijos y el eje de puntos
   (un punto por diputado, apilados sobre su punto ideal de 2026).
   ============================================================ */
(function () {
  var DV = {};

  // Seis familias sólo para colorear (las mismas de la clase 3 de Aplicaciones de Ciencia de Datos)
  DV.FAMILIAS = ["Izquierda", "Peronismo", "Otros", "PRO", "UCR", "LLA"];
  DV.COLOR = { Izquierda: "#148F6A", Peronismo: "#3D94D6", Otros: "#9AA1A9", PRO: "#DDAA1C", UCR: "#B5362A", LLA: "#7340AD" };
  DV.CORTO = { Izquierda: "Izquierda", Peronismo: "FdT / UxP", Otros: "Otros", PRO: "PRO", UCR: "UCR", LLA: "LLA" };

  DV.num = function (v, d) {
    return v.toFixed(d == null ? 2 : d).replace("-", "−").replace(".", ",");
  };
  // "DEL CAÑO, Nicolás" -> "Del Caño, Nicolás"
  DV.persona = function (n) {
    var p = n.split(","), ap = p[0].trim().toLowerCase().replace(/(^|[\s\-'])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
    return p.length > 1 ? ap + "," + p.slice(1).join(",") : ap;
  };
  // para buscar sin importar tildes ni mayúsculas
  DV.plano = function (s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  };
  DV.leyenda = function (el) {
    el.innerHTML = DV.FAMILIAS.map(function (f) {
      return '<span class="ley-item"><i style="background:' + DV.COLOR[f] + '"></i>' + DV.CORTO[f] + "</span>";
    }).join("");
  };

  /* ---------- el eje de puntos ----------
     cont: elemento contenedor (se redibuja al cambiar el ancho)
     dips: [{x, f, c, n, id, ...}]
     op:   {coms: [{c, lo, hi}] para dibujar los tramos de cada comunidad,
            alHover(d|null), alClick(d), alTramo(c|null), alClickTramo(c)} */
  DV.eje = function (cont, dips, op) {
    op = op || {};
    var NS = "http://www.w3.org/2000/svg";
    var tip = document.createElement("div");
    tip.className = "eje-tip";
    tip.hidden = true;
    cont.classList.add("eje");
    var svg = document.createElementNS(NS, "svg");
    cont.appendChild(svg);
    cont.appendChild(tip);
    var api = { svg: svg };
    var ultimoAncho = 0;

    function S(tag, at, padre) {
      var e = document.createElementNS(NS, tag);
      for (var k in at) e.setAttribute(k, at[k]);
      (padre || svg).appendChild(e);
      return e;
    }

    function dibujar() {
      var W = cont.clientWidth;
      if (!W || W === ultimoAncho) return;
      ultimoAncho = W;
      svg.innerHTML = "";
      var r = W < 560 ? 2.4 : W < 900 ? 3 : 3.6, paso = 2 * r + 1.2, pad = 14;
      // el eje cubre siempre de -2,75 a 1,45 (así 2025 y 2026 se comparan) y se estira si un año se pasa
      var xs = dips.map(function (d) { return d.x; });
      var lo = Math.min(-2.75, Math.min.apply(null, xs) - 0.1), hi = Math.max(1.45, Math.max.apply(null, xs) + 0.1);
      var X = function (v) { return pad + (v - lo) / (hi - lo) * (W - 2 * pad); };
      // apilar: cada columna de ancho «paso» junta a los diputados que caen ahí
      var pilas = {}, alto = 0;
      var orden = dips.slice().sort(function (a, b) { return a.x - b.x; });
      orden.forEach(function (d) {
        var col = Math.round((X(d.x) - pad) / paso);
        var k = pilas[col] = (pilas[col] || 0) + 1;
        d._cx = pad + col * paso;
        d._k = k;
        alto = Math.max(alto, k);
      });
      // tramos de las comunidades, en filas para que no se pisen
      var filas = [], tramos = [];
      (op.coms || []).forEach(function (c) {
        var x1 = X(c.loN), x2 = X(c.hiN), a = Math.min(x1, (x1 + x2) / 2 - 14), b = Math.max(x2, (x1 + x2) / 2 + 14);
        var f = 0;
        while (filas[f] != null && filas[f] > a - 6) f++;
        filas[f] = b;
        tramos.push({ c: c.c, x1: x1, x2: x2, fila: f });
      });
      var base = alto * paso + 8, altoTramos = filas.length * 30, H = base + altoTramos + 40;
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);

      // el cero
      S("line", { x1: X(0), x2: X(0), y1: 0, y2: base + altoTramos + 6, class: "eje-cero" });
      var g = S("g", { class: "eje-puntos" });
      orden.forEach(function (d, i) {
        var e = S("circle", { cx: d._cx, cy: base - 4 - (d._k - 1) * paso - r, r: r, fill: DV.COLOR[d.f], class: "c" + d.c, "data-i": i }, g);
        d._el = e;
      });
      var gt = S("g", { class: "eje-tramos" });
      tramos.forEach(function (t) {
        var y = base + 14 + t.fila * 30;
        var gg = S("g", { class: "tramo", "data-c": t.c }, gt);
        S("rect", { x: Math.min(t.x1, (t.x1 + t.x2) / 2 - 16) - 4, y: y - 10, width: Math.max(t.x2 - t.x1, 32) + 8, height: 34, fill: "transparent" }, gg);
        S("path", { d: "M" + t.x1 + "," + (y - 5) + "V" + y + "H" + t.x2 + "V" + (y - 5) }, gg);
        var tx = S("text", { x: (t.x1 + t.x2) / 2, y: y + 17, "text-anchor": "middle" }, gg);
        tx.textContent = "C" + t.c;
      });
      var yl = base + altoTramos + 30;
      var angosto = W < 560;   // en el celular los rótulos largos se pisan
      var t1 = S("text", { x: pad, y: yl, class: "eje-rot" }); t1.textContent = angosto ? "← peronismo" : "← peronismo e izquierda";
      var t2 = S("text", { x: W - pad, y: yl, "text-anchor": "end", class: "eje-rot" }); t2.textContent = angosto ? "LLA →" : "La Libertad Avanza y aliados →";
      var t0 = S("text", { x: X(0), y: yl, "text-anchor": "middle", class: "eje-rot" }); t0.textContent = "0";
      api.orden = orden;
    }

    svg.addEventListener("mouseover", function (e) {
      var i = e.target.getAttribute && e.target.getAttribute("data-i");
      var tr = e.target.closest && e.target.closest(".tramo");
      if (i != null) {
        var d = api.orden[+i];
        tip.innerHTML = "<b>" + DV.persona(d.n) + "</b><span>" + d.b + " &middot; C" + d.c + "</span>";
        tip.hidden = false;
        var cw = cont.clientWidth, x = d._cx;
        tip.style.left = Math.max(0, Math.min(cw - 220, x - 110)) + "px";
        tip.style.top = (+e.target.getAttribute("cy") - 52) + "px";
        if (op.alHover) op.alHover(d);
      } else if (tr && op.alTramo) {
        op.alTramo(+tr.getAttribute("data-c"));
      }
    });
    svg.addEventListener("mouseout", function (e) {
      var i = e.target.getAttribute && e.target.getAttribute("data-i");
      if (i != null) { tip.hidden = true; if (op.alHover) op.alHover(null); }
      var tr = e.target.closest && e.target.closest(".tramo");
      if (tr && op.alTramo && !tr.contains(e.relatedTarget)) op.alTramo(null);
    });
    svg.addEventListener("click", function (e) {
      var i = e.target.getAttribute && e.target.getAttribute("data-i");
      var tr = e.target.closest && e.target.closest(".tramo");
      if (i != null && op.alClick) op.alClick(api.orden[+i]);
      else if (tr && op.alClickTramo) op.alClickTramo(+tr.getAttribute("data-c"));
    });

    // foco: atenuar todo menos una comunidad (c) o un diputado (id)
    api.foco = function (c, id) {
      var hay = c != null || id != null;
      cont.classList.toggle("con-foco", hay);
      (api.orden || []).forEach(function (d) {
        var on = (c != null && d.c === c) || (id != null && d.id === id);
        d._el.classList.toggle("on", on);
        if (id != null && d.id === id) d._el.parentNode.appendChild(d._el);
      });
      var trs = svg.querySelectorAll(".tramo");
      for (var k = 0; k < trs.length; k++) trs[k].classList.toggle("on", c != null && +trs[k].getAttribute("data-c") === c);
    };

    // el rango de cada comunidad viene como texto ("−1,02"); para dibujarlo hace falta el número
    (op.coms || []).forEach(function (c) {
      var xs = dips.filter(function (d) { return d.c === c.c; }).map(function (d) { return d.x; });
      c.loN = Math.min.apply(null, xs);
      c.hiN = Math.max.apply(null, xs);
    });
    dibujar();
    var espera;
    window.addEventListener("resize", function () { clearTimeout(espera); espera = setTimeout(dibujar, 120); });
    return api;
  };

  window.DV = DV;
})();
