# DipVis 2022–2026

La misma visualización que 2006–2011 (fideos por diputado, mapa y mapa de calor por provincia) con las votaciones nominales de la HCDN de 2022 al 9/9/2026.

- **Puntos ideales:** `armar/01_puntos_ideales.R` (pscl::ideal, normalizado; signo orientado con diputados de referencia: LLA y PRO positivos, peronismo e izquierda negativos). Cada período se estima por separado: la altura compara a los diputados de un mismo año, no a un año con otro.
- **2025 partido en dos:** «2025» llega hasta el 9/12/2025; las votaciones desde que asumió la Cámara nueva (10/12/2025) van a «2026».
- **Color:** respecto del gobierno de cada año (Frente de Todos en 2022–2023, La Libertad Avanza desde 2024). Oficialista si siempre estuvo en ese bloque, opositora si nunca, variable si cambió.
- **Fotos:** todavía no hay; se usa la silueta.

Regenerar los datos:

```bash
cd 2022/armar
Rscript 01_puntos_ideales.R <carpeta con sesiones_dt.csv.gz e info_sesiones_dt.csv>   # ~13 minutos
python 02_armar_json.py                                                                # escribe 2022/data/*.json
```
