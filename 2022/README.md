# DipVis 2022–2026

La misma visualización que 2006–2011 (fideos por diputado, mapa y mapa de calor por provincia) con las votaciones nominales de la HCDN de 2022 al 9/9/2026.

- **Puntos ideales:** `armar/01_puntos_ideales.R` (pscl::ideal, normalizado; signo orientado con diputados de referencia: LLA y PRO positivos, peronismo e izquierda negativos). Cada período se estima por separado: la altura compara a los diputados de un mismo año, no a un año con otro.
- **2025 partido en dos:** «2025» llega hasta el 9/12/2025; las votaciones desde que asumió la Cámara nueva (10/12/2025) van a «2026».
- **Color:** según de qué lado del cero queda la línea. El lado oficialista es el de LLA (punto ideal positivo): violeta si la línea está siempre de ese lado, verde azulado si siempre del lado opositor, ámbar si cambió de signo. Como cada año se normaliza con media cero, cerca de la mitad de la Cámara queda del lado de LLA (también el PRO y buena parte de la UCR). La paleta está en `2022/paleta.css`.
- **Fotos:** de las páginas de votación de la HCDN (`armar/03_bajar_fotos.py`), achicadas a 120 px. Tienen foto los 495 diputados.
- **Nombres:** la misma persona escrita de dos maneras en las actas (LOPEZ, Jimena / JIMENA; RODRIGUEZ MACHADO, Laura / Laura Elena; PRADES, C. / Carlos Facundo; las comillas de los apodos) se une en una sola línea (`ALIAS` en `armar/02_armar_json.py`).

Regenerar los datos:

```bash
cd 2022/armar
Rscript 01_puntos_ideales.R <carpeta con sesiones_dt.csv.gz e info_sesiones_dt.csv>   # ~13 minutos
python 03_bajar_fotos.py <misma carpeta>                                              # fotos -> 2022/fotos/ (después se achican a 120 px)
python 02_armar_json.py                                                                # escribe 2022/data/*.json
```
