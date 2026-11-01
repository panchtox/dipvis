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
import json, re, unicodedata
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
SILUETA = "../images/silueta_medium.jpg"
# la misma persona escrita de dos maneras en las actas de la HCDN
ALIAS = {"LOPEZ, Jimena": "LOPEZ, JIMENA", "RODRIGUEZ MACHADO, LAURA ELENA": "RODRIGUEZ MACHADO, LAURA",
         "PRADES, C. FACUNDO": "PRADES, CARLOS FACUNDO"}


def clave(n):
    """Igual que en 03_bajar_fotos.py: sin Ñ rota, comillas ni acentos, en mayúsculas."""
    n = re.sub("[ÑñÃ�\"]", "", n)
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", n.replace(",", ", ")).strip().upper()


def lindo(nombre):
    """'PEREZ, JUAN CARLOS' -> 'PEREZ, Juan Carlos' (como el sitio original: apellido en mayúsculas).
    Los apodos quedan entre comillas simples: ALI, Ernesto «Pipi»."""
    nombre = re.sub(r'"+([^"]+)"+', lambda m: '«' + m.group(1) + '»', nombre)
    if "," not in nombre:
        return nombre.title()
    ape, nom = nombre.split(",", 1)
    return f"{ape.strip()}, {nom.strip().title()}"


idps = pd.read_csv(AQUI / "idps.csv")
leg = pd.read_csv(AQUI / "legisladores.csv").rename(columns={"legislador": "nombre", "periodo": "anio"})
d = idps.merge(leg, on=["nombre", "anio"], how="left")
d["nombre"] = d.nombre.replace(ALIAS)
# variantes de comillas en los apodos (ALI, ERNESTO "PIPI"): se unifican por la forma normalizada
d["nombre"] = d.groupby(d.nombre.map(clave)).nombre.transform("first")
# si con el alias quedan dos filas el mismo año, vale la que tiene más votos
d = d.sort_values("votos", ascending=False).drop_duplicates(["nombre", "anio"]).sort_values(["nombre", "anio"])
fotos = pd.read_csv(AQUI / "fotos.csv")
fotos = dict(zip(fotos.nombre.replace(ALIAS).map(clave), "fotos/" + fotos.foto))
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
    foto = fotos.get(clave(n), SILUETA)
    fideos.append({"nombre": lindo(n), "foto": foto, "distrito": str(cod),
                   "provincia": ultimo.provincia, "bloque": ultimo.bloque, "id": ids[n],
                   "points": [{"year": int(a), "idp": round(float(v), 4)} for a, v in zip(g.anio, g.idp)],
                   "col": COLOR[postura], "estados": [round(float(v), 4) for v in g.idp]})
    combo.append({"idip": ids[n], "nombre": lindo(n)})
    for _, r in g.iterrows():
        c, reg = PROV[r.provincia]
        matriz.append({"nombre": lindo(n), "foto": foto, "region": reg, "distrito": str(c), "bloque": r.bloque,
                       "year": str(int(r.anio)), "id": ids[n], "idp": round(float(r.idp), 4)})

(DATA / "fideos_dips2.json").write_text(json.dumps({"diputados": fideos}, ensure_ascii=False), encoding="utf-8")
(DATA / "combo_nombres.json").write_text(json.dumps(combo, ensure_ascii=False), encoding="utf-8")
(DATA / "matrix.json").write_text(json.dumps({"datosMatrix": matriz}, ensure_ascii=False), encoding="utf-8")

print(f"{len(fideos)} diputados, {len(matriz)} filas diputado-año, {sum(f['foto'] != SILUETA for f in fideos)} con foto")
print(pd.Series([f["col"] for f in fideos]).map({v: k for k, v in COLOR.items()}).value_counts().to_string())
print(d.groupby("anio").agg(diputados=("nombre", "size"), lado_LLA=("oficialista", "sum")).to_string())
