"""Comunidades de 2026 para el sitio: escribe 2022/data/comunidades.json.

Parte de los resultados de la clase 3 (fast greedy sobre la red de 2026, corte 0,4):
    python 04_comunidades.py <carpeta clase_03/redes/resultados>

C8, C9 y C10 se unen en una sola (C8): entre las tres no hay ninguna votación en que voten distinto
(79 diputados votan idéntico en las 107 votaciones); la división era ruido de la estimación.
Cada diputado se cruza con el id del sitio (fideos_dips2.json) para enlazar con las trayectorias.
"""
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
DATA = AQUI.parent / "data"
FUSION = {9: 8, 10: 8}

LINDO = {"Pro": "PRO", "Ucr - Union Civica Radical": "UCR", "Union Por La Patria": "Unión por la Patria",
         "Mid - Movimiento De Integracion Y Desarrollo": "MID",
         "Pts-frente De Izquierda Y De Trabajadores Unidad": "PTS – Frente de Izquierda",
         "Partido Obrero En El Frente De Izquierda Y De Trabajadores-unidad": "Partido Obrero – Frente de Izquierda",
         "Izquierda Socialista - Frente De Izquierda Unidad": "Izquierda Socialista – Frente de Izquierda"}

# Reverso de cada tarjeta: (rótulo, tipo, qué la separa de la vecina, hipótesis). Sale de 08_que_separa.R (clase 3).
REVERSO = {
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


def main(res):
    res = Path(res)
    # la unión sólo vale si las tres siguen sin votos distintos
    sep = {(int(r["comunidad_a"]), int(r["comunidad_b"])): int(r["votaciones_distintas"])
           for r in csv.DictReader(open(res / "que_separa_resumen.csv", encoding="utf-8"))}
    assert sep[(8, 10)] == 0 and sep[(9, 10)] == 0, sep

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

    filas = [r for r in csv.DictReader(open(res / "comunidades.csv", encoding="utf-8")) if r["anio"] == "2026"]
    dips = []
    for r in filas:
        s = del_sitio(r["nombre"])
        com = int(r["comunidad"])
        dips.append({"id": s["id"], "n": s["nombre"], "b": LINDO.get(r["bloque"], r["bloque"]), "p": s["provincia"], "f": familia(r["bloque"]),
                     "foto": s["foto"], "x": round(float(r["idp"]), 3), "c": FUSION.get(com, com), "c0": com,
                     "v": int(r["votos"])})
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
        rot, tipo, separa, hip = REVERSO[c]
        coms.append({"c": c, "n": len(m), "lo": num(min(xs)), "hi": num(max(xs)), "comp": comp,
                     "medio": [apellido(d["n"]) for d in medio], "antes": sorted({d["c0"] for d in m}),
                     "rot": rot, "tipo": tipo, "separa": separa, "hip": hip})

    out = {"anio": 2026, "comunidades": coms, "diputados": dips}
    (DATA / "comunidades.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(dips)} diputados en {len(coms)} comunidades:", ", ".join(f"C{c['c']} {c['n']}" for c in coms))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else
         "C:/Users/frana/00_DEV/00_TEACH/UNO/2026/clase_03/redes/resultados")
