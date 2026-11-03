"""Los asuntos de 2026 en un espacio semántico, para comunidades.html: escribe 2022/data/asuntos_2026.json.

    python 05_asuntos.py [<clase_03/semantico/resultados>]

Sale de la clase 3 de Aplicaciones de Ciencia de Datos (semantico/02_espacio_semantico.py): un punto por orden del
día votado en 2026, ubicado con los embeddings de su sumario proyectados a 2 dimensiones, con el tema puesto a mano
y la proporción de votos a favor de cada comunidad. Allá C4 y C5 van juntas, y C8 a C10 también (acá ya son C8).
"""
import json
import sys
from pathlib import Path

import pandas as pd

AQUI = Path(__file__).resolve().parent
DATA = AQUI.parent / "data"
SEMANTICO = Path("C:/Users/frana/00_DEV/00_TEACH/UNO/2026/clase_03/semantico/resultados")
TEMAS = ["Tratados de cooperación judicial", "Tratados económicos", "Economía, impuestos y finanzas",
         "Justicia y reformas del Estado", "Ambiente y recursos naturales", "Declaraciones, cultura y deporte"]
CORTO = {5: "Mercosur–UE", 6: "Reforma laboral", 4: "Penal juvenil", 7: "Glaciares", 149: "Súper RIGI", 211: "Banco Central",
         25: "Hojarasca", 21: "Extradición Chile", 148: "Acuerdo con acreedores", 84: "Zona fría", 209: "Ganancias",
         208: "Mercosur–Singapur", 85: "Patentes", 210: "IVA mandioca", 207: "Ley Joaquín", 20: "Asistencia penal Cuba"}
# nombre en la clase -> cómo se llama acá (el sitio ya tiene C8 a C10 unidas en C8)
GRUPO = {"C1 · Izquierda": "C1", "C2 · UxP": "C2", "C3 · UxP": "C3", "C4–C5 · UxP": "C4 y C5", "C6 · Medio": "C6",
         "C7 · PRO": "C7", "C8–C10 · LLA": "C8"}


def main():
    origen = Path(sys.argv[1]) if len(sys.argv) > 1 else SEMANTICO
    m = pd.read_csv(origen / "mapa.csv")
    grupos = [c for c in m.columns if " · " in c]
    assert grupos == list(GRUPO), f"cambiaron las comunidades de la clase: {grupos}"
    assert set(m.tema) <= set(TEMAS), set(m.tema) - set(TEMAS)
    asuntos = []
    for r in m.itertuples(index=False):
        votos = [getattr(r, f"_{m.columns.get_loc(g)}") for g in grupos]
        asuntos.append({
            "od": int(r.od), "fecha": r.fecha, "corto": CORTO.get(int(r.od)), "s": r.sumario, "tema": TEMAS.index(r.tema),
            "x": round(float(r.x), 4), "y": round(float(r.y), 4), "si": int(r.si), "no": int(r.no),
            "v": [None if pd.isna(p) else round(float(p), 3) for p in votos],
        })
    grupos_out = [{"c": GRUPO[g], "rot": g.split(" · ")[1]} for g in grupos]
    out = {"temas": TEMAS, "grupos": grupos_out, "asuntos": asuntos}
    (DATA / "asuntos_2026.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("asuntos_2026.json:", len(asuntos), "asuntos,", len(grupos_out), "grupos")


if __name__ == "__main__":
    main()
