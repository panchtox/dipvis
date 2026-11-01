"""Baja las fotos de los diputados de 2022-2026 desde votaciones.hcdn.gob.ar.

Cada página de votación (votacion/<id>.html) trae la foto de los 257 diputados que votaron:
assets/diputados/<código>.jpg. Para no bajar todas, se eligen las pocas votaciones que entre todas
cubren a todos los diputados de idps.csv (cobertura voraz) y de ahí sale el nombre -> código.
Las fotos quedan en 2022/fotos/<código>.jpg y la tabla en armar/fotos.csv.
Uso: python 03_bajar_fotos.py <carpeta con sesiones_dt.csv.gz>
"""
import re, sys, time, unicodedata
from pathlib import Path
import pandas as pd, requests
from bs4 import BeautifulSoup

AQUI = Path(__file__).parent
FOTOS = AQUI.parent / "fotos"; FOTOS.mkdir(exist_ok=True)
BASE = "https://votaciones.hcdn.gob.ar/"
H = {"User-Agent": "dipvis (github.com/panchtox/dipvis) - fotos de diputados"}

def clave(n):
    """Para comparar nombres: sin acentos, mayúsculas y un solo espacio."""
    # la página trae la Ñ rota (U+FFFD): se saca en los dos lados, igual que las comillas
    n = re.sub("[ÑñÃ�\"]", "", n)
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", n.replace(",", ", ")).strip().upper()


faltan = set(pd.read_csv(AQUI / "idps.csv").nombre)
votos = pd.read_csv(Path(sys.argv[1]) / "sesiones_dt.csv.gz", usecols=["legislador", "id_votacion"])
votos = votos[votos.legislador.isin(faltan)]
quien = votos.groupby("id_votacion").legislador.apply(set)

codigo, por_clave, no_aparecen = {}, {}, set()
while faltan:
    vid = max(quien.index, key=lambda i: len(quien[i] & faltan))      # la votación que más nombres nuevos cubre
    if not quien[vid] & faltan:
        break
    html = requests.get(f"{BASE}votacion/{vid}.html", headers=H, timeout=60).text
    for a in BeautifulSoup(html, "html.parser").select("#myTable tbody tr a.example-image-link"):
        nombre, foto = a.get("data-title", "").strip(), a.get("href", "")
        if nombre and foto:
            por_clave.setdefault(clave(nombre), foto.split("/")[-1])
    esperados = quien[vid] & faltan
    for n in esperados:
        k = clave(n)
        parecidos = [c for c in por_clave if c.startswith(k) or k.startswith(c)]
        if k in por_clave:
            codigo[n] = por_clave[k]
        elif len(parecidos) == 1:                 # p. ej. el nombre completo en un lado y abreviado en el otro
            codigo[n] = por_clave[parecidos[0]]
        else:
            no_aparecen.add(n)
    faltan -= esperados                       # leída esta página, no se los busca más
    print(f"votación {vid}: {len(esperados)} esperados, faltan {len(faltan)}", flush=True)
    quien = quien.drop(vid)
    time.sleep(1)

tabla = pd.DataFrame(sorted(codigo.items()), columns=["nombre", "foto"])
tabla = tabla[tabla.nombre.isin(set(pd.read_csv(AQUI / "idps.csv").nombre))]
bajadas = 0
for f in tabla.foto.unique():
    destino = FOTOS / f
    if destino.exists():
        continue
    r = requests.get(f"{BASE}assets/diputados/{f}", headers=H, timeout=60)
    if r.ok and r.headers.get("content-type", "").startswith("image"):
        destino.write_bytes(r.content); bajadas += 1
    time.sleep(0.3)
tabla["hay_foto"] = tabla.foto.map(lambda f: (FOTOS / f).exists())
tabla.to_csv(AQUI / "fotos.csv", index=False)
print(f"{len(tabla)} diputados con código de foto, {tabla.hay_foto.sum()} con archivo · bajadas ahora: {bajadas}")
print("no aparecen en la página donde votaron:", sorted(no_aparecen))
