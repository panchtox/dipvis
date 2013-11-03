function buildMatrix(year, prov, provName, vwWidth){
	//var prov = document.URL.split('#')[1];
	//var provName = document.URL.split('#')[2];
	//provName = provName.replace(/%20/g,' ');	
	console.log(prov);
	var margin = {top: 150, right: 0, bottom: 10, left: 150}, wmx = vwWidth*0.40, hmx = wmx;
	var x = d3.scale.ordinal().rangeBands([0, wmx]), z = d3.scale.linear().domain([4, 0]).clamp(true), c = d3.scale.category10().domain(d3.range(10));
	var matrix, data, ord;
	var nodes=[], bloques=[], regiones=[];

	traerDatos(year,prov);

	function traerDatos(selYear,selProv){
		d3.json("data/matrix.json", function(json) {
			data=json.datosMatrix;
			drawMatrix(selYear,selProv);
		});
	}

			function drawMatrix(ye,reg){
				d3.select("#order").property("selectedIndex", 0);
			var svg2 = d3.select("#heatmap").append("svg")
				.attr("width", wmx + margin.left + margin.right)
				.attr("height", hmx + margin.top + margin.bottom)
				.attr("id","svgmatrix")
				// .style("margin-left", margin.left + "px")
				.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			bloques=[];
			// provincias=[];
			data.forEach(
					function(d){
						if (d.year==ye && d.distrito==reg) {
							nodes.push(d);
						};
					}
				);
			matrix = [],
			n = nodes.length;

			nodes.forEach(function(node, i) {
				node.index = i;
				node.count = 0;
				matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
			});
			var dists=[];
			nodes.forEach(function(i,k) {
				nodes.forEach(function(j,l){
						var dist=Math.abs(i.idp-j.idp);
						dists.push(dist);
						matrix[k][l].z=dist;
						}
					);
			});
			nodes.forEach(function(b){if(bloques.indexOf(b.bloque)>-1){}else{bloques.push(b.bloque)}});
			// dips.forEach(function(p){if(provincias.indexOf(p.provincia)>-1 || p.provincia==""){}else{provincias.push(p.provincia)}});
			// provincias=provincias.sort();
			
			var orders = {
				nombre: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[a].nombre, nodes[b].nombre); }),
				idp: d3.range(n).sort(function(a, b) { return nodes[b].idp - nodes[a].idp; }),
				bloque: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[b].bloque , nodes[a].bloque); })
				// ,prov: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[b].distrito , nodes[a].distrito); })
			};

			// The default sort order.
			if (ord) {
				// console.log()
				x.domain("orders."+ord);
			} else{
				x.domain(orders.nombre);
			};
			// x.domain(orders.idp);

			svg2.append("rect")
				.attr("class", "background")
				.attr("width", wmx)
				.attr("height", hmx);

			var row = svg2.selectAll(".row")
				.data(matrix)
				.enter().append("g")
				.attr("class", "row")
				.attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
				.each(row);

			row.append("line")
				.attr("x2", wmx);

			row.append("text")
				.attr("x", -6)
				.attr("y", x.rangeBand() / 2)
				.attr("dy", ".32em")
				.attr("text-anchor", "end")
				.attr("id",function(d,i){return ("matrix"+d[i].y)})//nodes[i].id
				.text(function(d, i) { return nodes[i].nombre; })
				.on("mouseover",function() {reversarIDmatrix(d3.select(this).attr("id"));
							d3.select(this).attr("fill","blue")})
				.on("mouseout",function() {
							d3.select(this).attr("fill","black")})
				;

			var column = svg2.selectAll(".column")
				.data(matrix)
				.enter().append("g")
				.attr("class", "column")
				.attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

			column.append("line")
				.attr("x1", -wmx);

			column.append("text")
				.attr("x", 6)
				.attr("y", x.rangeBand() / 2)
				.attr("dy", ".32em")
				.attr("text-anchor", "start")
				.text(function(d, i) { return nodes[i].nombre; });

			$('.bloqueref').remove();
			$('.bloquetext').remove();
			for(b in bloques){
				d3.select("#refBloque")
					.append("div")
					.attr("class","bloqueref")
					.style("background-color",c(bloques[b]));
				d3.select("#refBloque")
					.append("div")
					.attr("class","bloquetext")
					.append("p")
					.text(bloques[b]);
			}

			document.getElementById('nombreProvincia').innerHTML=provName;
/********************************Funciones************************************/
			function row(row) {
				var cell = d3.select(this).selectAll(".cell")
					.data(row.filter(function(d) { return d.z; }))
					.enter().append("rect")
						.attr("class", "cell")
						.attr("x", function(d) { return x(d.x); })
						.attr("width", x.rangeBand())
						.attr("height", x.rangeBand())
						.style("fill-opacity", function(d) { return z(d.z); })
						.style("fill", function(d) {return nodes[d.x].bloque == nodes[d.y].bloque ? c(nodes[d.x].bloque) : null; })
					.on("mouseover", mouseover)
					.on("mouseout", mouseout);
			}

			function mouseover(p) {
				d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
				d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
			}

			function mouseout() {
				d3.selectAll("text").classed("active", false); 
			}

			d3.select("#order").on("change", function() {
				order(this.value);
			});

	function order(value) {
					x.domain(orders[value]);
					var t = svg2.transition().duration(2500);

					t.selectAll(".row")
					.delay(function(d, i) { return x(i) * 4; })
					.attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
					.selectAll(".cell")
					.delay(function(d) { return x(d.x) * 4; })
					.attr("x", function(d) { return x(d.x); });

					t.selectAll(".column")
					.delay(function(d, i) { return x(i) * 4; })
					.attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
				}
			}

function reversarIDmatrix(id){
	var aidi=id.replace("matrix","");
	// console.log(aidi);
	sorte=d3.range(n).sort(function(a, b) { return matrix[aidi][a].z - matrix[aidi][b].z; });
	var perfil={'near':[],'far':[]};
	for (var i = 0; i < 7; i++) {
		perfil.near[i]=sorte[i];
		perfil.far[i]=sorte[sorte.length-i-1];
	}
	for (var i = 0; i < perfil.near.length; i++) {
		// console.log("n:"+nodes[perfil.near[i]].nombre);
		d3.select('#n'+(i)+" img").attr("src","images/"+nodes[perfil.near[i]].foto);
		d3.select("#n"+i+" a").attr("href","http://www.google.com.ar/search?q="+(nodes[perfil.near[i]].nombre).replace(" ","+"))
		.attr("target","_blank").text(nodes[perfil.near[i]].nombre);
		if (i%2==0 && i!=0) {
			d3.select('#n'+(i)).style("border-left","2px solid "+c(nodes[perfil.near[i]].bloque));
		} 
		else{
			if (i==0) {
				d3.select('#n'+(i)).style("border-bottom","2px solid "+c(nodes[perfil.near[i]].bloque));
			}else{
				d3.select('#n'+(i)).style("border-right","2px solid "+c(nodes[perfil.near[i]].bloque));
			};
		};
		d3.select('#near').selectAll("td").attr("align","center");
	};
}						


var C = $("#year option");
C.on('mouseenter', function(){
    var V = $(this).val();
    // console.log(V);
    d3.select("#svgmatrix") .remove();
				nodes=[];
				ye=V;
				drawMatrix(ye,prov);

			var o = document.getElementById("order");
			var ord = o.options[o.selectedIndex].value;
});
}

		




