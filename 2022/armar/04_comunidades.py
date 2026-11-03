"""Comunidades de 2026 y 2025 para el sitio: escribe 2022/data/comunidades.json y comunidades_2025.json.

    python 04_comunidades.py [<clase_03/redes/resultados> [<clase_02/datos/base_2022_hoy>]]

2026 sale tal cual de la clase 3 (fast greedy sobre la red de 2026, corte 0,4). C8, C9 y C10 se unen
en una sola (C8): entre las tres no hay ninguna votación en que voten distinto (79 diputados votan
idéntico en las 107 votaciones); la división era ruido de la estimación.

2025 se recalcula con el mismo método sobre el 2025 del sitio: hasta el 9/12/2025 y sin los diputados
con menos de 20 votos emitidos (en la clase, 2025 es el año calendario y mezcla las dos Cámaras).
Después se aplica la misma regla que en 2026: dos comunidades vecinas sin ninguna votación distinta
(la proporción de Sí de las dos difiere en más de 0,5) se unen, hasta que no quede ningún par así.
Cada diputado se cruza con el id del sitio (fideos_dips2.json) para enlazar con las trayectorias.
Necesita pandas e igraph (pip install igraph).
"""
import csv
import itertools
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import igraph as ig
import pandas as pd

AQUI = Path(__file__).resolve().parent
DATA = AQUI.parent / "data"
CLASE3 = Path("C:/Users/frana/00_DEV/00_TEACH/UNO/2026/clase_03/redes/resultados")
CLASE2 = Path("C:/Users/frana/00_DEV/00_TEACH/UNO/2026/clase_02/datos/base_2022_hoy")
FUSION_2026 = {9: 8, 10: 8}
CORTE = 0.4        # en la red sólo se unen diputados a menos de esta distancia (como en la clase)
MIN_VOTOS = 20     # como en 02_armar_json.py

LINDO = {"Pro": "PRO", "Ucr - Union Civica Radical": "UCR", "Union Por La Patria": "Unión por la Patria",
         "Mid - Movimiento De Integracion Y Desarrollo": "MID",
         "Pts-frente De Izquierda Y De Trabajadores Unidad": "PTS – Frente de Izquierda",
         "Partido Obrero En El Frente De Izquierda Y De Trabajadores-unidad": "Partido Obrero – Frente de Izquierda",
         "Izquierda Socialista - Frente De Izquierda Unidad": "Izquierda Socialista – Frente de Izquierda",
         "Pts-frente De Izquierda Unidad": "PTS – Frente de Izquierda",
         "Izquierda Socialista Fit-unidad": "Izquierda Socialista – Frente de Izquierda",
         "Partido Obrero -frente De Izquierda Y De Trabajadores -unidad": "Partido Obrero – Frente de Izquierda",
         "Coalicion Civica": "Coalición Cívica", "Innovacion Federal": "Innovación Federal",
         "Democracia Para Siempre": "Democracia para Siempre", "Liga Del Interior Eli": "Liga del Interior",
         "Produccion Y Trabajo": "Producción y Trabajo"}

# Reverso de cada tarjeta: (rótulo, tipo, qué la separa de la vecina, hipótesis).
# 2026 sale de 08_que_separa.R (clase 3).
REVERSO_2026 = {
    1: ("5 votaciones", "varias",
        "Vota en contra de los tratados internacionales (Chile, Italia, Francia, Mercosur–Singapur) que Unión por la Patria aprueba.",
        "Rechazo de principio a los acuerdos internacionales: se opone al gobierno y también al peronismo."),
    2: ("1 votación", "una",
        "El tratado de extradición con Chile (20/05): 10 a 0 en contra. El resto de Unión por la Patria lo aprobó.",
        "Un ala de izquierda del peronismo (Grabois, Hagman, Taiana) que se diferencia en temas de derechos humanos."),
    3: ("1 votación", "una",
        "El acuerdo Mercosur–Unión Europea (12/02): 27 a 0 en contra.",
        "El kirchnerismo del AMBA y el sindicalismo afín (M. Kirchner, Yasky, Palazzo): la industria antes que la apertura comercial."),
    4: ("1 votación", "una",
        "Votó a favor del acuerdo Mercosur–Unión Europea: 48 a 1.",
        "El peronismo de los gobernadores y del interior (G. Martínez, Rossi): las economías regionales que exportan empujan el voto."),
    5: ("Ausencias", "ruido",
        "Ningún voto distinto a C4. Lo que cambia: faltaron 13 y 15 veces.",
        "No es un grupo político. El modelo los ubica aparte porque tiene menos votos de ellos."),
    6: ("53 y 21 votaciones", "varias",
        "Con Unión por la Patria difiere en 53: acompaña leyes del gobierno. Con La Libertad Avanza, en 21: apoya los pedidos de la oposición para forzar debates.",
        "Bloques de gobernadores: votan la agenda del gobierno y se suman a la oposición a la hora del control."),
    7: ("1 votación", "una",
        "El emplazamiento para interpelar a Adorni (24/06): 11 a 1 a favor. La Libertad Avanza, en contra.",
        "Aliado casi total del gobierno, que se diferencia en un gesto de control político."),
    8: ("Vota en bloque", "bloque",
        "Adentro no hay ni una votación distinta. El algoritmo la partía en tres (C8, C9 y C10), pero 79 diputados votan igual en las 107 votaciones: acá van juntas.",
        "La Libertad Avanza con la UCR que quedó adentro. La interna de LLA, si existe, no se ve en los votos."),
}

# 2025: los números salen de este script (que_separa y los votos de clase_02); se verifican con ESPERADO_2025.
REVERSO_2025 = {
    1: ("Vota en bloque", "bloque",
        "El grueso de Unión por la Patria, con parte de la izquierda. El algoritmo lo partía en cinco, pero adentro no hay ni una votación distinta. Con C2 difiere en 2: la suspensión de las PASO (06/02), que rechazó 45 a 6, y un artículo de la emergencia en discapacidad.",
        "El núcleo opositor: vota junto en todo lo que llega al recinto."),
    2: ("Pocos votos", "ruido",
        "La suspensión de las PASO: 3 a 0 a favor. Y un artículo de la emergencia en discapacidad. Las dos, con muy pocos votos del grupo.",
        "Grupo chico y mezclado (tres peronistas y dos de Izquierda Socialista): cuesta leerlo como una línea política."),
    3: ("1 votación", "una",
        "La suspensión de las PASO: 3 a 1 en contra, mientras C4 votó a favor 15 a 1.",
        "Cuatro peronistas que quedan entre los dos lados de esa votación."),
    4: ("1 y 19 votaciones", "varias",
        "Con C3 la separa la suspensión de las PASO: 15 a 1 a favor. Con el medio, 19: rechazó la reforma penal y Ficha Limpia, que el resto aprobó.",
        "Peronismo del interior (Catamarca, Tucumán, Santa Fe) que acompañó al gobierno en las PASO y se le opuso en lo demás."),
    5: ("19 votaciones", "varias",
        "Con el peronismo difiere en 19: aprobó la reforma penal y Ficha Limpia y rechazó los emplazamientos de Unión por la Patria. Votó los cambios a la ley de DNU (08/10): 36 a 0.",
        "El medio de 2025 (Encuentro Federal, Democracia para Siempre, Innovación Federal, Coalición Cívica): vota leyes del gobierno y empuja el control de los decretos."),
    6: ("Ausencias", "ruido",
        "Faltaron en promedio a 38 de las 97 votaciones. Las diferencias con sus vecinos son votaciones en las que votó uno solo de ellos.",
        "No es un grupo político: el modelo los ubica aparte porque tiene pocos votos de ellos."),
    7: ("29 votaciones", "varias",
        "Con el PRO y los aliados difiere en 29: votó el aumento a jubilados, la emergencia pediátrica y emplazamientos de la oposición. Con muchas ausencias.",
        "Radicales (De Loredo, Brouwer de Koning, Reyes) y aliados que se despegaron del gobierno en jubilaciones y salud."),
    8: ("4 votaciones", "varias",
        "Con La Libertad Avanza difiere en 4: la emergencia por Bahía Blanca (22 a 2 a favor; LLA, 0 a 30), un artículo de la emergencia en discapacidad y el concurso del Defensor de Niños.",
        "El PRO y los aliados del gobierno: votan con LLA salvo en algunas emergencias."),
    9: ("Vota en bloque", "bloque",
        "La Libertad Avanza sola: 34 de sus 35 diputados. Votó en contra de la emergencia por Bahía Blanca (0 a 30) y del orden de mérito para el Defensor de Niños (0 a 33).",
        "Antes de que asumiera la Cámara nueva, el oficialismo era chico y compacto: 10 de ellos votaron idéntico en las 97 votaciones."),
}
# lo que suponen los textos de 2025: tamaños y votaciones distintas entre vecinas. Si cambian los datos, que avise.
ESPERADO_2025 = {"tamanios": [81, 5, 4, 17, 55, 3, 8, 51, 35], "distintas": [2, 1, 1, 19, 9, 13, 29, 4]}


def familia(bloque):
    """Seis familias sólo para colorear (las mismas que la clase 3)."""
    b = bloque.lower()
    if "izquierda" in b:
        return "Izquierda"
    if b in ("frente de todos", "union por la patria"):
        return "Peronismo"
    if b == "la libertad avanza":
        return "LLA"
    if b == "pro":
        return "PRO"
    if b.startswith("ucr"):
        return "UCR"
    return "Otros"


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper()
    s = re.sub(r"[^A-Z, ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def apellido(nombre):
    return nombre.split(",")[0].strip().title()


def num(v):
    return f"{v:.2f}".replace("-", "−").replace(".", ",")


# ---------- 2025: red, comunidades y unión de las que no votan distinto ----------

def red_y_comunidades(df):
    """Como 04_redes de la clase 3: une a los diputados a menos de CORTE, fast greedy con 1/distancia
    como peso, y numera las comunidades de izquierda a derecha del eje (por la mediana)."""
    n, x = list(df.nombre), list(df.idp)
    aristas, pesos = [], []
    for i, j in itertools.combinations(range(len(n)), 2):
        d = abs(x[i] - x[j])
        if d <= CORTE:
            aristas.append((i, j))
            pesos.append(max(d, 1e-9))
    g = ig.Graph(n=len(n), edges=aristas)
    m = g.community_fastgreedy(weights=[1 / w for w in pesos]).as_clustering().membership
    out = pd.DataFrame({"nombre": n, "idp": x, "k": m})
    orden = out.groupby("k").idp.median().sort_values().index
    out["comunidad"] = out.k.map({k: i + 1 for i, k in enumerate(orden)})
    return out.drop(columns="k")


def que_separa(votos, col, a, b):
    """Cuántas votaciones votaron distinto las comunidades a y b (la proporción de Sí difiere en más de 0,5)."""
    v = votos[votos[col].isin([a, b])]
    t = v.assign(s=v.voto.eq("AFIRMATIVO"), n=v.voto.eq("NEGATIVO")).groupby(["id_votacion", col])[["s", "n"]].sum()
    p = (t.s / (t.s + t.n)).unstack(col)
    return int(((p[a] - p[b]).abs() > 0.5).sum())


def unir_sin_votos_distintos(r, votos):
    """Une comunidades vecinas mientras haya un par sin ninguna votación distinta."""
    r = r.copy()
    r["c"] = r.comunidad
    while True:
        v = votos.merge(r[["nombre", "c"]], on="nombre")
        orden = list(r.groupby("c").idp.median().sort_values().index)
        pares = [(a, b, que_separa(v, "c", a, b)) for a, b in zip(orden, orden[1:])]
        cero = [(a, b) for a, b, k in pares if k == 0]
        if not cero:
            break
        a, b = cero[0]
        r.loc[r.c == b, "c"] = a
    orden = list(r.groupby("c").idp.median().sort_values().index)
    r["c"] = r.c.map({k: i + 1 for i, k in enumerate(orden)})
    return r, [k for _, _, k in pares]


def filas_2025(base):
    idp = pd.read_csv(AQUI / "idps.csv")
    leg = pd.read_csv(AQUI / "legisladores.csv").rename(columns={"legislador": "nombre"})
    d = idp[idp.anio == 2025].merge(leg[leg.periodo == 2025][["nombre", "bloque", "emitidos"]], on="nombre")
    d = d[d.emitidos >= MIN_VOTOS]
    r = red_y_comunidades(d[["nombre", "idp"]]).merge(d[["nombre", "bloque", "emitidos"]], on="nombre")
    # las votaciones del 2025 del sitio: hasta el 9/12/2025
    info = pd.read_csv(base / "info_sesiones_dt.csv", encoding="latin-1")
    info["f"] = pd.to_datetime(info.fecha.str[:10], format="%d/%m/%Y")
    ids = info[(info.f >= "2025-01-01") & (info.f < "2025-12-10")].id_votacion
    s = pd.read_csv(base / "sesiones_dt.csv.gz")
    votos = s[s.id_votacion.isin(ids)].rename(columns={"legislador": "nombre"})[["nombre", "id_votacion", "voto"]]
    r, distintas = unir_sin_votos_distintos(r, votos)
    tam = [int((r.c == k).sum()) for k in sorted(r.c.unique())]
    assert {"tamanios": tam, "distintas": distintas} == ESPERADO_2025, (tam, distintas)
    return [{"nombre": f.nombre, "bloque": f.bloque, "idp": f.idp, "votos": f.emitidos, "c": int(f.c), "c0": int(f.comunidad)}
            for f in r.itertuples()]


# ---------- el json de un año ----------

def armar(anio, filas, reverso, antes_txt, archivo):
    sitio = json.load(open(DATA / "fideos_dips2.json", encoding="utf-8"))["diputados"]
    por_nombre = {norm(d["nombre"]): d for d in sitio}

    def del_sitio(nombre):
        n = norm(nombre)
        if n in por_nombre:
            return por_nombre[n]
        # nombres unidos por alias (RODRIGUEZ MACHADO, LAURA ELENA -> RODRIGUEZ MACHADO, Laura)
        ap, _, nom = n.partition(",")
        cand = [d for k, d in por_nombre.items() if k.partition(",")[0] == ap and nom.split()[0] in k.partition(",")[2]]
        assert len(cand) == 1, (nombre, cand)
        return cand[0]

    dips = []
    for r in filas:
        s = del_sitio(r["nombre"])
        dips.append({"id": s["id"], "n": s["nombre"], "b": LINDO.get(r["bloque"], r["bloque"]), "p": s["provincia"],
                     "f": familia(r["bloque"]), "foto": s["foto"], "x": round(float(r["idp"]), 3), "c": r["c"],
                     "c0": r["c0"], "v": int(r["votos"])})
    dips.sort(key=lambda d: d["x"])

    coms = []
    for c in sorted({d["c"] for d in dips}):
        m = [d for d in dips if d["c"] == c]
        cuenta = Counter(d["b"] for d in m)
        principal, cuantos = cuenta.most_common(1)[0]
        otros = len(m) - cuantos
        comp = f"{cuantos} de {principal}" + (f" y {otros} de otros bloques" if otros else "")
        if len({d["f"] for d in m}) == 1 and len(cuenta) > 1 and m[0]["f"] == "Izquierda":
            comp = f"Los {len(m)} del Frente de Izquierda, repartidos en {len(cuenta)} bloques"
        xs = sorted(d["x"] for d in m)
        mediana = xs[len(xs) // 2] if len(xs) % 2 else (xs[len(xs) // 2 - 1] + xs[len(xs) // 2]) / 2
        medio = sorted(m, key=lambda d: abs(d["x"] - mediana))[:3]
        antes = sorted({d["c0"] for d in m})
        rot, tipo, separa, hip = reverso[c]
        coms.append({"c": c, "n": len(m), "lo": num(min(xs)), "hi": num(max(xs)), "comp": comp,
                     "medio": [apellido(d["n"]) for d in medio], "antes": antes,
                     "antes_txt": antes_txt(antes) if len(antes) > 1 else "",
                     "rot": rot, "tipo": tipo, "separa": separa, "hip": hip})

    out = {"anio": anio, "comunidades": coms, "diputados": dips}
    (DATA / archivo).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{anio}: {len(dips)} diputados en {len(coms)} comunidades:", ", ".join(f"C{c['c']} {c['n']}" for c in coms))


def main(res, base):
    res, base = Path(res), Path(base)
    # 2026: la unión de C8-C10 sólo vale si las tres siguen sin votos distintos
    sep = {(int(r["comunidad_a"]), int(r["comunidad_b"])): int(r["votaciones_distintas"])
           for r in csv.DictReader(open(res / "que_separa_resumen.csv", encoding="utf-8"))}
    assert sep[(8, 10)] == 0 and sep[(9, 10)] == 0, sep
    filas = [{"nombre": r["nombre"], "bloque": r["bloque"], "idp": r["idp"], "votos": r["votos"],
              "c": FUSION_2026.get(int(r["comunidad"]), int(r["comunidad"])), "c0": int(r["comunidad"])}
             for r in csv.DictReader(open(res / "comunidades.csv", encoding="utf-8")) if r["anio"] == "2026"]
    armar(2026, filas, REVERSO_2026, lambda a: "antes C" + ", C".join(map(str, a[:-1])) + f" y C{a[-1]}",
          "comunidades.json")
    armar(2025, filas_2025(base), REVERSO_2025, lambda a: f"el algoritmo la partía en {len(a)}", "comunidades_2025.json")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else CLASE3, sys.argv[2] if len(sys.argv) > 2 else CLASE2)
