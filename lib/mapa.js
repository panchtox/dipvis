function buildMapa(placeholder, mapw, maph){
		/*
		*La parte del mapa
		*/
			//var mapw=viewportWidth*0.3,maph=h;
			var mapsvg=d3.select(placeholder)//agregamos un svg para contener el mapa
					.style("width",mapw + "px")
					.style("height",maph + "px")
					.style("margin-left","20px")
		 			.append("svg")
		 			.attr("width",mapw)
		 			.attr("height",maph);

		 	var maplayer1=mapsvg.append("g").attr("class","maplayer1");
		 	var maplayer2=mapsvg.append("g").attr("class","maplayer1");
		 	var projection = d3.geo.transverseMercator().center([3, -38]).rotate([66, 0])
		 	.translate([(mapw / 2), (maph / 2)]).scale((maph * 56.5) / 35);
		 	var mappath = d3.geo.path().projection(projection);
		 	var aviso=maplayer1.append('text').text('Cargando mapa...').attr('x',(mapw/2)-80).attr('y',maph/2);
			d3.json("maps/provincias.json", function(json) {//Provincias excepto T. del Fuego

				maplayer1.selectAll("path")
					.data(json.features)
					.enter()
					.append("path")
					.attr("d", mappath)
					.attr("id",function(d){return "p"+(d.properties.prov);})
					.attr("provname",function(d){return (d.properties.provincia);})
					.attr("class","provincia")
					.on("mouseover", onMouseOver)
					.on("mouseout", onMouseOut)
					.on("click", onClick);
					aviso.text('');
			});

			d3.json("maps/TIERRA DEL FUEGO.json", function(json) {//Aqui incorporamos T. del Fuego
				maplayer2.selectAll("path")
					.data(json.features)
					.enter()
					.append("path")
					.attr("d", mappath)
					.attr("id",function(d){return "p"+(d.properties.prov);})
					.attr("provname",function(d){return (d.properties.PROVINCIA);})
					.attr("class","provincia")
					.on("mouseover", onMouseOver)
					.on("mouseout", onMouseOut)
					.on("click", onClick);
			});

			function onClick() {
				var prov = d3.select(this).attr("id");
				var provname = d3.select(this).attr("provname");
				// console.log("onclick!!!", prov);
				//window.location = '/matrix2.html#' + prov.substring(1) + "#" + provname;

				d3.selectAll('#heatmap').select('svg').remove();
				buildMatrix("2006", prov.substring(1), provname, viewportWidth * 0.7);
			}

			function onMouseOver() {
				//Pintar provincia de rojo
				var prov = d3.selectAll("#" + d3.select(this).attr("id"));
				selectCurrent(prov);

				//Agregar clase 'current'
				var lines = d3.selectAll("." + d3.select(this).attr("id"));
				selectCurrent(lines);

								
			}

			function onMouseOut() {
				//Volver al color original
				var prov = d3.selectAll("#" + d3.select(this).attr("id"));
				unselectCurrent(prov);

				//Remover classe 'current'
				var lines = d3.selectAll("." + d3.select(this).attr("id"));
				unselectCurrent(lines);				
			}

}			
