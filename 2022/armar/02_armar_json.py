"""Arma los tres JSON que leen las páginas de /2022/ a partir de idps.csv y legisladores.csv.

Mismo formato que data/ de 2006-2011:
- fideos_dips2.json: una línea por diputado (nombre, bloque, distrito, color, puntos por año)
- combo_nombres.json: id y nombre para el buscador
- matrix.json: una fila por diputado y año, para el mapa de calor por provincia
Color: según de qué lado del cero queda la línea. El lado oficialista es el de LLA (punto ideal positivo).
«oficialista» = positivo en todos sus períodos, «opositora» = negativo en todos, «variable» = cambió de signo.
(Los nombres de clase son los del sitio original.)
Uso, parados en 2022/armar/:  python 02_armar_json.py
"""
import json
from pathlib import Path
import pandas as pd

AQUI = Path(__file__).parent
DATA = AQUI.parent / "data"
DATA.mkdir(exist_ok=True)

COLOR = {"oficialista": "#6b9eea", "opositora": "#bbf098", "variable": "#f0a198"}   # los del sitio original
PROV = {  # provincia del scraper -> (código INDEC que usa maps/provincias.json, región de la matriz original)
    "Buenos Aires": (6, "BUENOS AIRES"), "C.A.B.A.": (2, "CABA"), "Catamarca": (10, "NOROESTE"),
    "Chaco": (22, "NORESTE"), "Chubut": (26, "SUR"), "Córdoba": (14, "CENTRO"), "Corrientes": (18, "NORESTE"),
    "Entre Ríos": (30, "NORESTE"), "Formosa": (34, "NORESTE"), "Jujuy": (38, "NOROESTE"), "La Pampa": (42, "SUR"),
    "La Rioja": (46, "NOROESTE"), "Mendoza": (50, "CUYO"), "Misiones": (54, "NORESTE"), "Neuquén": (58, "CUYO"),
    "Rio Negro": (62, "SUR"), "Salta": (66, "NOROESTE"), "San Juan": (70, "CUYO"), "San Luis": (74, "CUYO"),
    "Santa Cruz": (78, "SUR"), "Santa Fe": (82, "CENTRO"), "Santiago del Estero": (86, "NOROESTE"),
    "Tierra del Fuego": (94, "SUR"), "Tucumán": (90, "NOROESTE"),
}
FOTO = "silueta_medium.jpg"


def lindo(nombre):
    """'PEREZ, JUAN CARLOS' -> 'PEREZ, Juan Carlos' (como el sitio original: apellido en mayúsculas)."""
    if "," not in nombre:
        return nombre.title()
    ape, nom = nombre.split(",", 1)
    return f"{ape.strip()}, {nom.strip().title()}"


idps = pd.read_csv(AQUI / "idps.csv")
leg = pd.read_csv(AQUI / "legisladores.csv").rename(columns={"legislador": "nombre", "periodo": "anio"})
d = idps.merge(leg, on=["nombre", "anio"], how="left")
faltan = d[d.provincia.isna() | ~d.provincia.isin(PROV)]
assert faltan.empty, faltan
d["oficialista"] = d.idp > 0          # del lado de LLA

nombres = sorted(d.nombre.unique(), key=lambda n: lindo(n))
ids = {n: i + 1 for i, n in enumerate(nombres)}
fideos, combo, matriz = [], [], []
for n in nombres:
    g = d[d.nombre == n].sort_values("anio")
    ultimo = g.iloc[-1]
    of = g.oficialista
    postura = "oficialista" if of.all() else "opositora" if not of.any() else "variable"
    cod, region = PROV[ultimo.provincia]
    fideos.append({"nombre": lindo(n), "foto": "../images/" + FOTO, "distrito": str(cod),
                   "provincia": ultimo.provincia, "bloque": ultimo.bloque, "id": ids[n],
                   "points": [{"year": int(a), "idp": round(float(v), 4)} for a, v in zip(g.anio, g.idp)],
                   "col": COLOR[postura], "estados": [round(float(v), 4) for v in g.idp]})
    combo.append({"idip": ids[n], "nombre": lindo(n)})
    for _, r in g.iterrows():
        c, reg = PROV[r.provincia]
        matriz.append({"nombre": lindo(n), "foto": FOTO, "region": reg, "distrito": str(c), "bloque": r.bloque,
                       "year": str(int(r.anio)), "id": ids[n], "idp": round(float(r.idp), 4)})

(DATA / "fideos_dips2.json").write_text(json.dumps({"diputados": fideos}, ensure_ascii=False), encoding="utf-8")
(DATA / "combo_nombres.json").write_text(json.dumps(combo, ensure_ascii=False), encoding="utf-8")
(DATA / "matrix.json").write_text(json.dumps({"datosMatrix": matriz}, ensure_ascii=False), encoding="utf-8")

print(f"{len(fideos)} diputados, {len(matriz)} filas diputado-año")
print(pd.Series([f["col"] for f in fideos]).map({v: k for k, v in COLOR.items()}).value_counts().to_string())
print(d.groupby("anio").agg(diputados=("nombre", "size"), lado_LLA=("oficialista", "sum")).to_string())
