function buildFideos(placeholder, w, h){
		var ar=Array(),idps=Array();
		var margin1=30,pomo,cuadro=w/4,duration=1500,delay=1000;
		var color10=d3.scale.category10();//Paleta categorica de 10 colores
/*
*COMBO BOX
*/
		d3.json("data/combo_nombres.json", function(json) {//trae el json con el listado de nombres con los id correspondientes
				nombres=json;	
				for (i=0;i<nombres.length;i++){
					$('<option/>').val(nombres[i].idip).html(nombres[i].nombre).appendTo('#diputados');
				}
				$(".chzn-select").chosen({no_results_text: "No hay: "});$(".chzn-select-deselect").chosen({allow_single_deselect:true});
		});


/***/

/*
*Curvas de Andrews de las posturas de los diputados
*/
		d3.json("data/fideos_dips2.json", function(json) {//Trae los datos principales
			dips=json.diputados;
			dips.forEach(function(d){(d.points.forEach(function(y){ar.push(y.year)}))});//rango de anios
			dips.forEach(function(d){(d.points.forEach(function(y){idps.push(y.idp)}))});//rango de puntos ideales
			d3.select("#diputados").style("width",(viewportWidth*0.60)+"px");

			var svg=d3.select("#posturas")
 			.style("width",w+"px")
 			.append("svg")
 			.attr("width",w)
 			.attr("height",h);

 			d3.select("#diputados_chzn").style("width",(w)+"px");//igualo ancho del combobox al del panel del grafico

 			var capaRef=svg.append("g").attr("class","ref");
		 	var capa1=svg.append("g").attr("class","fondo1");

		 	var formatYear=d3.time.format("%Y").parse;
			var idpsXscale=d3.time.scale().domain([2006,2011]).range([0+margin1,w-margin1]);
			var idpsYscale=d3.scale.linear().domain([d3.min(idps),d3.max(idps)]).range([h-margin1,0+margin1]);
			var color10=d3.scale.category10();
			idps=0;
			ar=0;
			estructura=0;
			var linefunction = d3.svg.line()
				.interpolate("basis")
				.x(function(d) { return idpsXscale(d.year);})
				.y(function(d) { return idpsYscale(d.idp);});

			dips.forEach(
				function(d){//fabricamos una linea por cada diputado, reflejando sus posturas en el tiempo
					var posicion = 'variable';
					if(d.col == '#bbf098'){
						posicion = 'opositora';
					}
					if(d.col == '#6b9eea'){
						posicion = 'oficialista';
					}

					var lineGraph = capa1.append("path")
						.attr("d", linefunction(d.points))
						.attr("class","posturadip " + posicion + " p" + d.distrito)
						.attr("shape-rendering","crispEdges")
						.attr("id",("dip"+d.id))
						.attr("nombre",d.nombre)
						.attr("bloque",d.bloque)
						.attr("foto",d.foto)
						.attr("provincia",d.distrito)
						.on("mouseover", function() {
							selectCurrent(d3.select(this));
							selectCurrent(d3.selectAll("#p"+d3.select(this).attr("provincia")));
							d3.select("#tooltip").select("img").attr("src","");
							d3.select("#tooltip")
								.attr("class","")
								.select("strong")
								.text(d3.select(this).attr("nombre"));
							d3.select("#tooltip")
								.select("bloque")
								.text(d3.select(this).attr("bloque"));
							d3.select("#tooltip")
								.select("img")
								.attr("src",(d3.select(this).attr("foto")));
							
							$('#tristate').sparkline(d.estados, {type:'tristate', posBarColor:'#9cab19',negBarColor:'#1e64cd'});
						})
						.on("mouseout", function() {
							
							unselectCurrent(d3.select(this));
							unselectCurrent(d3.selectAll("#p"+d3.select(this).attr("provincia")));
							
							d3.select("#tooltip").attr("class","hidden");

						});
				}
			);
			var xAxis=d3.svg.axis().scale(idpsXscale).orient("bottom").tickFormat(d3.format("d"));
			svg.append("g").attr("class","xaxis").attr("transform","translate(0,"+(h-margin1)+")").call(xAxis);

			capa1.append("text")
				.attr("x", (w / 2))
				.attr("y", 20)
				.attr("text-anchor", "middle")
				.style("font-size", "16px")
				.text("Postura de los diputados al votar los proyectos de ley durante el periodo 2006 - 2011");
			/*
			* Dibuja flechas del eje y
			*/
				var capaFlechas=svg.append("g").attr("class","flechas");

				capaFlechas.append("marker")
					.attr("id", "triangle-start")
					.attr("viewBox", "0 0 10 10")
					.attr("refX", 10)
					.attr("refY", 5)
					.attr("markerWidth", -6)
					.attr("markerHeight", 6)
					.attr("orient", "auto")
					.append("path")
					.attr("d", "M 0 0 L 10 5 L 0 10 z");

				capaFlechas.append("marker")
					.attr("id", "triangle-end")
					.attr("viewBox", "0 0 10 10")
					.attr("refX", 10)
					.attr("refY", 5)
					.attr("markerWidth", 6)
					.attr("markerHeight", 6)
					.attr("orient", "auto")
					.append("path")
					.attr("d", "M 0 0 L 10 5 L 0 10 z");

				capaFlechas.append("line")
					.attr("class", "arrow")
					.attr("x1", 20)
					.attr("x2", 20)
					.attr("y1", idpsYscale(2.2))
					.attr("y2", idpsYscale(0.02))
					.attr("marker-start", "url(#triangle-start)")
					.style("stroke","black");
				capaFlechas.append("line")
					.attr("class", "arrow")
					.attr("x1", 20)
					.attr("x2", 20)
					.attr("y1", idpsYscale(-2.2))
					.attr("y2", idpsYscale(-0.02))
					.attr("marker-start", "url(#triangle-start)")
					.style("stroke","black");
				capaFlechas.append('text')
					.text('oposicion')
					.attr('y',idpsYscale(2.3))
					.attr('x',20);
				capaFlechas.append('text')
					.text('oficialismo')
					.attr('y',idpsYscale(-2.3))
					.attr('x',20);
			/**/
			/*
			* Referencia
			*/
				var ref={"posturas":[{"postura":"opositora constante","color":"#bbf098","yrel":1},{"postura":"variable","color":"#f0a198","yrel":2},{"postura":"oficialista constante","color":"#6b9eea","yrel":3}]},sbul=11;
				capaRef.selectAll('rect')
					.data(ref.posturas)
					.enter()
					.append('rect')
					.attr('x',w-(w/5))
					.attr('y',function(d){return h-90+(sbul*d.yrel);})
					.attr('width',sbul-1)
					.attr('height',sbul-1)
					.attr('fill',function(d){return d.color;});
				capaRef.selectAll('text')
					.data(ref.posturas)
					.enter()
					.append('text')
					.text(function(d){return d.postura})
					.attr('x',w-(w/5)+12)
					.attr('y',function(d){return h-82+(sbul*d.yrel);});
			/***/
		});

/* Funcion que permite que un objeto pase al frente de la imagen */
		d3.selection.prototype.moveToFront = function() {//metodo que hace que un objeto pase al frente de la imagen -CREDITO
				return this.each(function() { 
					this.parentNode.appendChild(this); 
				}); 
		};
/***/

		$(document).ready(function(){//Lleva el tooltip a la posicion cercana al mouse
			$('#posturas').mousemove(function(e){
				if (e.pageY<h-margin1+10 && e.pageX<w-margin1+10) {
					$("#tooltip").css({top: e.pageY, left: e.pageX+30, position:'absolute'});
				} else{
				};
				
			});
		});
		d3.select('#combo').style("width", w+"px");
}

		function actualizarFideos() {//Destaca la linea de los diputados seleccionados en el combobox
			var Dips = recuperar_seleccion('diputados');
			d3.selectAll('.posturadip').classed('disabled', true);
			d3.selectAll('.provincia').classed('disabled', true);
			
			if (Dips.length) {
				for (var i = 0; i < Dips.length; i++) {
					d3.select("#" + Dips[i]).classed('disabled', false);
					d3.select("#" + Dips[i]).classed('enabled', true);
					d3.select("#" + Dips[i]).moveToFront();

				};
			} else{
				dips.forEach(
					function(d){
						d3.select("#dip"+d.id).classed('disabled', false);
						d3.selectAll('.provincia').classed('disabled', false);
						d3.select("#dip"+d.id).classed('enabled', false);
					}
				);
			};
		}
		function recuperar_seleccion(id) {//Devuelve array con la seleccion del combobox
			var valores = [];
			var obj = document.getElementById(id);
			for(var i=0; i<obj.length; i++) {
				if (obj[i].selected) {
					valores.push("dip" + obj[i].value);
				}
			}
			return(valores);
		}

