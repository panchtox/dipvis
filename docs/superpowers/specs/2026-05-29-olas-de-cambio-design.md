# Spec: capa "Olas de cambio" en los fideos de `index.html`

_Fecha: 2026-05-29_

## Contexto

`index.html` muestra los fideos (curvas de Andrews) de 578 diputados: cada línea
es la trayectoria del *ideal point* (`idp`) de un diputado entre 2006 y 2011.
En el eje Y, **`idp > 0` = opositor** y **`idp < 0` = oficialista**; cruzar el 0
es cambiar de bando.

El usuario quiere detectar "haces" de líneas que se mueven juntas como un
paquete, **especialmente diputados que cambian de bando** (oficialista↔opositor)
en la misma época.

## Hallazgo en los datos

Los cruces de bando **no están repartidos al azar: se amontonan en el tiempo**,
formando olas reales:

| Año (llegada) | ofi→opo | opo→ofi |
|---|---|---|
| 2007 | 5 | 3 |
| **2008** | **24** | 5 |
| 2009 | 12 | 5 |
| 2010 | 5 | 14 |
| **2011** | 2 | **23** |

85 diputados cruzan el 0 al menos una vez. La ola de 24 que pasan de oficialista
a opositor en 2008 (huele a Resolución 125 / "voto no positivo") es el caso
emblemático.

**Restricción de los datos:** la cobertura temporal es despareja — 100 diputados
tienen 1 solo punto, 209 tienen 2, y solo 52 tienen los 6 años. Por eso el método
elegido sólo mira **tramos entre años consecutivos** (no necesita trayectorias
largas).

## Objetivo

Una **capa conmutable ("toggle")** sobre el gráfico de fideos que destaca y
agrupa los cruces de bando por `(año, dirección)`, con conteos, para contar la
historia de las olas. No se toca la lógica de D3 existente.

## No-objetivos (YAGNI)

- No es clustering general de trayectorias por forma (approach B), ni codificación
  simbólica (approach C). Solo olas de cruce (approach A).
- No backend / no recomputar nada offline: todo en el cliente.
- No se modifica `matrix2.html` ni el resto del sitio.
- No se persiste estado (la capa arranca apagada en cada carga).

## Detección

Script nuevo **`olas.js`**, cargado al estilo de `theme-init.js` (no toca el
código D3 inline). Lógica:

1. Espera a que el global `dips` esté poblado (lo asigna el callback de
   `d3.json("data/fideos_dips2.json")`). Si todavía no está, reintenta.
2. Para cada diputado: ordena `points` por año y recorre pares consecutivos
   `(p_i, p_{i+1})`. Hay **cruce** si `sign(p_i.idp) !== sign(p_{i+1}.idp)`.
3. Cada cruce genera un evento:
   - `dir`: `"ofi-opo"` si llega a `idp > 0`, `"opo-ofi"` si llega a `idp < 0`.
   - `year`: `p_{i+1}.year` (año de llegada).
   - punto de cruce con el 0, por interpolación lineal:
     `t = p_i.year + (0 - p_i.idp) / (p_{i+1}.idp - p_i.idp) * (p_{i+1}.year - p_i.year)`.
4. **Umbral anti-ruido (configurable, default `0.1`):** se descarta el cruce si
   `max(|p_i.idp|, |p_{i+1}.idp|) < THRESHOLD` (evita contar oscilaciones
   triviales alrededor del 0).
5. Las olas son los grupos de eventos con la misma clave `año|dir`.

**Escalas:** las escalas originales (`idpsXscale`, `idpsYscale`) son locales al
callback y no se exponen. `olas.js` las **re-deriva** usando los globals `w`, `h`,
`margin1` y el extent de `idp` calculado desde `dips`:
- X: `d3.time.scale().domain([2006, 2011]).range([margin1, w - margin1])`
- Y: `d3.scale.linear().domain([min(idp), max(idp)]).range([h - margin1, margin1])`

Estas réplicas sólo se usan para ubicar las marcas ✕; no reemplazan a las del
gráfico.

## UI e interacción

- **Toggle "Olas de cambio"** en la barra de caption del gráfico (`.panel-cap`
  dentro de `#posturas`, inyectada por `theme-init.js`).
- **Panorama (al prender):**
  - Las líneas que cruzan se colorean **por dirección** (2 colores acordes a la
    paleta editorial: uno para `ofi→opo`, otro para `opo→ofi`).
  - El resto de las líneas queda en **gris tenue** (clase `.dim`).
  - En cada cruce se dibuja una **marca ✕** sobre la línea del 0, en el `x` del
    cruce interpolado, dentro del SVG del gráfico.
- **Panel "OLAS"** anclado arriba a la derecha del panel del gráfico: lista cada
  ola como `año · dirección · conteo` (ej. *2008 ofi→opo · 24*), ordenada por
  conteo descendente. Cada fila lleva el color de su dirección.
- **Aislar:** clic en una fila del panel → solo ese paquete queda coloreado +
  sus marcas; el resto gris. Clic afuera o en "ver todas" → vuelve al panorama.
- El **tooltip** de diputado (hover) sigue funcionando en todos los modos.

### Decisiones de diseño (cerradas)

- **Coloreo por dirección** (2 colores), no un color por ola: ~10 buckets en
  arcoíris chocan con la paleta y se leen mal; el año lo dan el ✕ y el panel.
- **Marca de cruce = ✕ en la intersección con el 0** (interpolada), no un punto
  en el año de llegada.
- **Umbral 0.1 por defecto, ajustable** por constante en `olas.js`.

## Convivencia con lo existente

Modo visual conmutable, sin tocar D3:
- Prender: agrega clases a los `path.posturadip` por id (`.wave-up`,
  `.wave-down`, `.dim`) y una clase al contenedor (`body.olas-mode` o similar),
  más el grupo SVG de marcas.
- Apagar: quita esas clases y el grupo de marcas → vuelve el coloreo por partido.
- No interfiere con el combo "Resaltar diputados" ni con el hover/tooltip
  (son rutas de clase/DOM independientes).

El coloreo por dirección y el gris se hacen vía CSS en `styles/theme.css` (o un
bloque propio) para respetar los temas (editorial/minimal/ink).

## Wiring

- Nuevo archivo `olas.js` en la raíz.
- En `index.html`: una línea `<script src="olas.js"></script>` después de
  `theme-init.js` (misma capa de tema). Es la única edición al HTML.
- Reglas CSS de la capa: en `styles/theme.css`.

## Verificación

Test de navegador (Playwright + Chromium ya instalado), contra el server local:
1. Cargar `index.html`, esperar render.
2. Conteo: las olas detectadas por `olas.js` deben coincidir con la tabla de
   arriba (2008 ofi→opo = 24, 2011 opo→ofi = 23, etc.) con umbral 0.
3. Prender el toggle → verificar que hay líneas `.wave-up`/`.wave-down`, que el
   resto tiene `.dim`, y que aparecen las marcas ✕.
4. Clic en una ola del panel → solo ese subconjunto queda resaltado.
5. Apagar → se restaura el coloreo por partido (sin `.dim`, sin marcas).
6. Sin errores de consola.

## Parámetros ajustables

- `THRESHOLD` (default `0.1`): mínimo de magnitud para contar un cruce.
- Colores de dirección: 2 variables CSS.
