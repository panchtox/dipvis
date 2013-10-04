library(pscl)
library(RColorBrewer)

years <- 2007:2013
meses <- 1:12
sesiones <- read.csv("C:/Users/Alejandro/Desktop/votacion/output_ale.txt", encoding="latin-1")

for (year in years) {
    #votos <- read.csv(paste('../output', year, '.csv', sep=""))
      votos <- sesiones[sesiones$anio == year,]
      if ( dim(votos)[1] != 0 ) {
          nvotos <- dim(votos)[1]
          legis.names <- as.vector(unique(votos[,'legislador']))
          nlegis <- length(legis.names)
          legis.partidos <- as.vector(votos[rownames(unique(votos['legislador'])),
                                            'bloque'])
          
          actas.names <- as.vector(unique(votos[,'acta']))
          nactas <- length(actas.names)
          
          niveles <- unique(votos[,'voto'])
          
          notInLegis <- match('AUSENTE', niveles)
          yea <- match('AFIRMATIVO', niveles)
          nay <- match('NEGATIVO', niveles)
          abstencion <- match('ABSTENCION', niveles)
          
          data <- matrix(, nlegis, nactas)
          
          desc <- paste('Votos de diputados', year)
          fuente <- paste('http://www1.hcdn.gov.ar/dependencias/dselectronicos/actas/actas_individuales_',
                          year, '.asp', sep='')
          
          for (n in 1:nvotos) {
            nombre <- legis.names == votos[n, 'legislador']
            acta <- actas.names == votos[n, 'acta']
            nivel <- match(votos[n, 'voto'], niveles)
            data[nombre, acta] <- nivel
          }
          
          legis.data <- data.frame(party=legis.partidos)
          row.names(legis.data) <- legis.names
          
          rData <- rollcall(data, yea=yea, nay=nay, missing=abstencion,
                            notInLegis=notInLegis, legis.names=legis.names, vote.names=actas.names,
                            legis.data=legis.data, vote.data=NULL, desc=desc, source=fuente)
          
          # El algoritmo de ideal points en s�???
          fitted <- ideal(rData, normalize=FALSE)
          
          outcome <- fitted$xbar
          if (year==2008) {
            outcome <- -outcome
          }
          
          write.table(outcome, file=paste('ideal_points_', year, '_sin_normalizar.csv', sep=''),
                      col.names=FALSE, sep=',')
         
        }
    }

#     colores<-votos[row.names(unique(votos['legislador'])),'bloque']
# 
#     # Gráfico de ideal points creciente
#     svg(paste('sorted_ideal_points_', year, '.svg', sep=''), width=6, height=5)
#     plot(sort(outcome[,1]), col='#1F78B4', bg='#1F78B4', pch=21,
#         main=paste("Ideal points para diputados del", year),
#         xlab="Indice arbitrario de diputado (por ideal point creciente)",
#         ylab="Ideal point")
#     dev.off()
# 
#     # Dibujo sin partidos minoritarios (mostramos solo partidos con >N diputados)
#     mas_de <- 1
#     freq.partidos <- table(legis.partidos)
#     while(sum(freq.partidos > mas_de) >= 8) {
#         mas_de <- mas_de + 1
#     }
#     show <- freq.partidos[legis.partidos] > mas_de
#     showPartidos <- unique(legis.partidos[show])
# 
#     nshow <- sum(show)
#     paleta <- brewer.pal(length(showPartidos), 'Dark2')
#     legis.color <- paleta[as.factor(legis.partidos[show])]
# 
#     svg(paste('ideal_points_mayoritarios_', year, '.svg', sep=''), width=6, height=5)
#     showorder <- order(outcome[show,1])
#     plot(outcome[show,1],
#         col=legis.color, bg=legis.color, pch=21,
#         main=paste("Partidos con más de", mas_de, "diputados,", year),
#         xlab="Indice arbitrario de diputado (en orden alfabético)",
#         ylab="Ideal point") 
#     legend(0, max(outcome[show,1]), showPartidos, bg='white',
#         col=unique(legis.color), pt.bg=unique(legis.color), cex=0.7, pch=21)
#     dev.off()
# }
