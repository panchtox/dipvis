# DipVis 2022–2026

La misma visualización que 2006–2011 (fideos por diputado, mapa y mapa de calor por provincia) con las votaciones nominales de la HCDN de 2022 al 9/9/2026.

- **Puntos ideales:** `armar/01_puntos_ideales.R` (pscl::ideal, normalizado; signo orientado con diputados de referencia: LLA y PRO positivos, peronismo e izquierda negativos). Cada período se estima por separado: la altura compara a los diputados de un mismo año, no a un año con otro.
- **2025 partido en dos:** «2025» llega hasta el 9/12/2025; las votaciones desde que asumió la Cámara nueva (10/12/2025) van a «2026».
- **Color:** según de qué lado del cero queda la línea. El lado oficialista es el de LLA (punto ideal positivo): violeta si la línea está siempre de ese lado, verde azulado si siempre del lado opositor, ámbar si cambió de lado. Un año cuenta para el lado sólo si su intervalo del 95% no toca el cero (`idp_lo`/`idp_hi` en `armar/idps.csv`); si ningún año tiene lado claro, decide el signo del promedio.
- **Pocos votos:** los diputado-período con menos de 20 votos emitidos no se dibujan (por ejemplo quien presidió la Cámara: Massa en 2022, Moreau en 2023). Son 25 casos; 5 diputados quedan afuera del todo. Como cada año se normaliza con media cero, cerca de la mitad de la Cámara queda del lado de LLA (también el PRO y buena parte de la UCR). La paleta está en `2022/paleta.css`.
- **Fotos:** de las páginas de votación de la HCDN (`armar/03_bajar_fotos.py`), achicadas a 120 px. Tienen foto los 495 diputados.
- **Nombres:** la misma persona escrita de dos maneras en las actas (LOPEZ, Jimena / JIMENA; RODRIGUEZ MACHADO, Laura / Laura Elena; PRADES, C. / Carlos Facundo; las comillas de los apodos) se une en una sola línea (`ALIAS` en `armar/02_armar_json.py`).

Regenerar los datos:

```bash
cd 2022/armar
Rscript 01_puntos_ideales.R <carpeta con sesiones_dt.csv.gz e info_sesiones_dt.csv>   # ~13 minutos
python 03_bajar_fotos.py <misma carpeta>                                              # fotos -> 2022/fotos/ (después se achican a 120 px)
python 02_armar_json.py                                                                # escribe 2022/data/*.json
```

**Barras de la tarjeta.** Una barra por año: arriba y en violeta si ese año quedó claramente del lado de LLA, abajo y en verde azulado si quedó del lado opositor, y una raya gris chica si el intervalo tocó el cero. Es la misma regla que define el color de la línea.

**Diapositivas.** El home de 2022 tiene `diapositivas: true` en `window.DIPVIS`. El texto ocupa la primera pantalla y el gráfico entra entero en la segunda: su alto se ajusta a la ventana. Desde el texto, la rueda, las flechas, AvPág, la barra espaciadora o el botón «Ver el gráfico» llevan al gráfico, y desde el tope del gráfico, hacia arriba, se vuelve al texto. El salto lo hace `theme-init.js` (`armarDiapositivas`). Las páginas sin esa opción, como 2006–2011, no cambian.

**Organización del sitio (nov-2026).** La portada (`index.html` en la raíz) pregunta qué se quiere explorar y ofrece cuatro entradas: trayectorias (`2022/index.html`), comunidades (`2022/comunidades.html`), provincias (`2022/matrix2.html#<id>#<nombre>`) y un diputado (buscador con ficha y enlaces a las otras tres vistas). Arriba muestra a los 258 diputados de 2026 sobre el eje. La versión 2006–2011 pasó a `2006-2011.html`. Las páginas de 2022–2026 comparten el menú, que arma `theme-init.js` cuando `window.DIPVIS.seccion` está definido. Estilos en `styles/explorar.css`; el eje de puntos y los colores por familia de bloque, en `explorar.js`.

**Enlaces entre vistas.** `2022/index.html#dips=12,40&t=texto` llega con esos diputados destacados (hasta 6 entran al buscador; más, con un aviso para quitarlos). `2022/comunidades.html#c=3` abre una comunidad y `#dip=123` marca a un diputado.

**Comunidades.** `python armar/04_comunidades.py [<clase_03/redes/resultados> [<clase_02/datos/base_2022_hoy>]]` escribe `data/comunidades.json` (2026) y `data/comunidades_2025.json` (necesita `pip install igraph`). 2026 sale tal cual de la clase 3 de Aplicaciones de Ciencia de Datos (fast greedy sobre la red de 2026, corte 0,4). C8, C9 y C10 se unen en una sola C8 (102 diputados): entre las tres no hay ninguna votación distinta (79 diputados votan idéntico en las 107 votaciones), así que la división era ruido de la estimación. El script verifica eso antes de unirlas.

2025 se recalcula en el script con el mismo método, pero sobre el 2025 del sitio (hasta el 9/12/2025, sin los diputados con menos de 20 votos emitidos): en la clase, 2025 es el año calendario y mezcla la Cámara vieja con la nueva. El algoritmo encuentra 13 comunidades; se unen las vecinas sin ninguna votación distinta (la proporción de Sí difiere en más de 0,5), hasta que no queda ningún par así, y quedan 9. El peronismo, partido en cinco, queda en una (C1). Quedan grupos chicos que separan una sola votación (las PASO) o las ausencias (C6). Probado: con los puntos ideales de la clase, el método da exactamente las comunidades de 2026 de la clase.

Los textos del reverso de las tarjetas (qué separa a cada comunidad y una hipótesis) están en el mismo script; si cambian los datos, unos asserts avisan. **2025 está oculto por ahora** (3-nov-2026): el script sigue escribiendo `data/comunidades_2025.json`, pero ni `comunidades.html` ni la portada lo usan. La versión con selector de año está en el commit be20f97.

**Qué se votó, según de qué trata.** Al final de `comunidades.html`: los 40 órdenes del día de 2026 en un mapa semántico (color por tema, tamaño según cuánto dividió) y el mismo mapa una vez por comunidad, pintado según cómo votó. Sale de la clase 3 (`clase_03/semantico`): `python armar/05_asuntos.py [<clase_03/semantico/resultados>]` escribe `data/asuntos_2026.json`. Allá C4 y C5 van juntas (no votan distinto en esos asuntos); C8 a C10 ya son C8.
