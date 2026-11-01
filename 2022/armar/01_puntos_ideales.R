# ============================================================================
# Puntos ideales 2022-2026 para dipvis
# Mismo método que la clase 2 de UNO 2026 (pscl::ideal, normalizado, signo
# corregido con diputados de referencia), con una diferencia: la Cámara que
# asumió el 10/12/2025 no se mezcla con la anterior. Las votaciones desde esa
# fecha van al período 2026; «2025» llega hasta el 9/12/2025.
#
# Uso: Rscript 01_puntos_ideales.R <carpeta con sesiones_dt.csv.gz e info_sesiones_dt.csv>
# Sale: idps.csv y legisladores.csv en esta carpeta (~10-20 minutos)
# ============================================================================
library(data.table)
library(pscl)

args <- commandArgs(trailingOnly = TRUE)
base <- if (length(args)) args[1] else "."
sesiones <- fread(file.path(base, "sesiones_dt.csv.gz"))
info <- fread(file.path(base, "info_sesiones_dt.csv"))
info[, fecha := as.POSIXct(fecha_hora, format = "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")]
sesiones <- merge(sesiones, info[, .(id_votacion, fecha)], by = "id_votacion")
sesiones[, periodo := ifelse(fecha >= as.POSIXct("2025-12-10", tz = "UTC"), 2026L, yr)]
sesiones <- sesiones[voto %in% c("AUSENTE", "AFIRMATIVO", "NEGATIVO", "ABSTENCION")]
setorder(sesiones, periodo, fecha, id_votacion)

# Diputados de referencia para orientar el eje (derecha positiva, izquierda negativa)
derecha <- c("MILEI, JAVIER GERARDO", "ESPERT, JOSE LUIS", "PIPARO, CAROLINA", "IGLESIAS, FERNANDO ADOLFO",
             "BORNORONI, GABRIEL", "LEMOINE, LILIA", "ALMIRON, LISANDRO", "MAYORAZ, NICOLAS")
izquierda <- c("KIRCHNER, MAXIMO CARLOS", "MOREAU, LEOPOLDO", "TAILHADE, RODOLFO", "YASKY, HUGO",
               "PALAZZO, SERGIO OMAR", "GROSSO, LEONARDO", "SANTORO, LEANDRO", "HELLER, CARLOS")

estimar <- function(p) {
  v <- sesiones[periodo == p]
  legis <- unique(v$legislador); actas <- unique(v$id_votacion)
  niveles <- sort(unique(v$voto))
  m <- matrix(NA_integer_, length(legis), length(actas), dimnames = list(legis, actas))
  m[cbind(match(v$legislador, legis), match(v$id_votacion, actas))] <- match(v$voto, niveles)
  bloques <- v[, .(bloque = last(bloque)), legislador][match(legis, legislador), bloque]
  rc <- rollcall(m, yea = match("AFIRMATIVO", niveles), nay = match("NEGATIVO", niveles),
                 missing = match("ABSTENCION", niveles), notInLegis = match("AUSENTE", niveles),
                 legis.names = legis, vote.names = actas, legis.data = data.frame(party = bloques, row.names = legis))
  set.seed(1)
  # como en la clase 2: impute = F y 100.000 vueltas (con menos, dos semillas no dan lo mismo)
  fit <- ideal(rc, normalize = TRUE, impute = FALSE, maxiter = 100000, burnin = 50000)
  # intervalo del 95% de cada punto ideal, a partir de las muestras de la cadena (fit$x: muestra x diputado x dim)
  muestras <- fit$x[, , 1, drop = TRUE]
  out <- data.table(nombre = rownames(fit$xbar), idp = as.numeric(fit$xbar[, 1]), anio = p,
                    idp_lo = apply(muestras, 2, quantile, 0.025), idp_hi = apply(muestras, 2, quantile, 0.975))
  d <- mean(out[nombre %in% derecha, idp]); i <- mean(out[nombre %in% izquierda, idp])
  if ((!is.nan(d) && d < 0) || (is.nan(d) && !is.nan(i) && i > 0))
    out[, `:=`(idp = -idp, idp_lo = -idp_hi, idp_hi = -idp_lo)]
  cat(sprintf("%d: %d diputados, %d votaciones · derecha %+.2f, izquierda %+.2f\n", p, length(legis), length(actas),
              mean(out[nombre %in% derecha, idp]), mean(out[nombre %in% izquierda, idp])))
  out
}

idps <- rbindlist(lapply(sort(unique(sesiones$periodo)), estimar))
fwrite(idps, "idps.csv")
# votos = votaciones en las que figura; emitidos = las que votó (afirmativo, negativo o abstención)
fwrite(sesiones[, .(bloque = last(bloque), provincia = last(provincia), votos = .N,
                    emitidos = sum(voto %in% c("AFIRMATIVO", "NEGATIVO", "ABSTENCION"))), .(legislador, periodo)],
       "legisladores.csv")
cat("listo: idps.csv y legisladores.csv\n")
