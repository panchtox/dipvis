<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
	<head>
		<!-- <meta http-equiv="Content-Type" content="text/html; charset=utf-8" /> -->
		<meta http-equiv="Content-Type" content="text/html; charset=ISO8859-1" />
		<link rel="stylesheet" href="styles/idps.css">
		<link rel="stylesheet" href="styles/matrix.css">
		<link rel="stylesheet" href="styles/chosen.css">
		<script src="lib/d3.v2.js"></script>
		<script type="text/JavaScript" src="//ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js"></script>
		<script src="lib/chosen.jquery.js" type="text/javascript"></script>
		<script src="lib/jquery.sparkline.min.js"></script>
		</head>
	<body>
		<div>
			<select data-placeholder="Seleccione diputados de la lista..." class="chzn-select" multiple="multiple" style="width:800px;"  id="diputados" onChange="actualizarFideos();">
				<option value=""></option>
			</select>
		</div>
		<div id="mapa"></div>
		<div id="posturas"></div>
		<div id="tooltip" class="hidden">
			<span id="tristate">Loading..</span>
			<img src=""></img><br>
			<strong>Diputado</strong><br>
			<bloque>bloque</bloque>
		</div>
<?php
	include_once 'lib/sort.php';
	$cxn = new conector();
	$cn=$cxn->getConn();
	$sql="SELECT nombre,year,idip,idp,bloque,idprov,distrito,foto FROM ideal_points ORDER BY idip,year";
	$rs=mysqli_query($cn,$sql) or die ("<br />Couldn't execute query. #".mysqli_error($cn). " #".$sql);
	// $totalidps=mysqli_num_rows($rs);
	$n=1;
	// $ch = curl_init();
	$estructura="{'diputados':[";
	$previoid=0;
	while ($linea=mysqli_fetch_assoc($rs)) {
		if ($linea['idip']==$previoid) {
			$estructura.=",{'year':".$linea['year'].",'idp':".$linea['idp']."}";
		} else {
			$estructura.="]},";
			$estructura.="{'nombre':'".$linea['nombre']."','foto':'".$linea['foto']."','distrito':'".$linea['idprov']."','provincia':'".$linea['distrito']."','bloque':'".$linea['bloque']."','id':".$linea['idip'].",'points':[{'year':".$linea['year'].",'idp':".$linea['idp']."}";
		}
		
		$estructura.="<br>";
		$previoid=$linea['idip'];
	}
	$estructura.="]}]}";
	$estructura=preg_replace('/\[]},/', "[", $estructura);

	$sql="SELECT idip,nombre FROM ideal_points GROUP BY idip,nombre";
	$rsdips=mysqli_query($cn,$sql) or die ("<br />Couldn't execute query. #".mysqli_error($cn). " #".$sql);
	$dips="";
	while ($dip=mysqli_fetch_assoc($rsdips)) {
		$dips.="{'idip':".$dip['idip'].",'nombre':'".$dip['nombre']."'} ";
	}
	$dips=trim($dips);
	$dips="[".preg_replace('/} {/', "},{", $dips)."]";
	// echo $dips;
	// echo $estructura;
?>
		<script type="text/javascript">
			var estructura=<?php $estructura=preg_replace('/<br>/', '', $estructura); echo $estructura;?>;
			var nombres=<?php echo $dips;?>;
			var ar=Array(),idps=Array(),dips=estructura.diputados;
			dips.forEach(function(d){(d.points.forEach(function(y){ar.push(y.year)}))});
			dips.forEach(function(d){(d.points.forEach(function(y){idps.push(y.idp)}))});

			d3.selection.prototype.moveToFront = function() {//defino un nuevo metodo que hace que un objeto pase al frente de la imagen
				return this.each(function() { 
					this.parentNode.appendChild(this); 
				}); 
			};

			var h=600, w=800, margin1=30,pomo,cuadro=w/4,duration=1500,delay=1000;
			
			$(document).ready(function(){
				$('#posturas').mousemove(function(e){
					if (e.pageY<h-margin1+10 && e.pageX<w-margin1+10) {
						// $("#tooltip").attr("class","");
						$("#tooltip").css({top: e.pageY, left: e.pageX+30, position:'absolute'});
					} else{
						// $("#tooltip").attr("class","hidden");
					};
					
				});
			});

		 	var svg=d3.select("#posturas")
		 			.append("svg")
		 			.attr("width",w)
		 			.attr("height",h);

		 	var capa2=svg.append("g").attr("class","fondo2");
		 	var capa1=svg.append("g").attr("class","fondo1");

		 	var formatYear=d3.time.format("%Y").parse;
			var idpsXscale=d3.time.scale().domain([2006,2011]).range([0+margin1,w-margin1]);//d3.min(ar),d3.max(ar)
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
				function(d){
					var estado=0;
					d.points.forEach(
							function(i){
								if (estado==0) {
									estado=i.idp;
								};
								if ((estado*i.idp)<0) {
									d.col='#f0a198';
									return;
								} else{
									d.col='x';
								};
								if(d.col=='x'){
									if (i.idp<0) {
										d.col='#6b9eea';
									} else{
										d.col='#bbf098';
									};
								}
							}
						);
				}
			);

			dips.forEach(
				function(t){
					t.estados=Array();
					t.points.forEach(
							function(i){
								t.estados.push(i.idp);
							}
						);
				}
			);

			// capa2.append("rect")
			// 	.attr("x",idpsXscale(2009))
			// 	.attr("y",0+margin)
			// 	.attr("width",150)
			// 	.attr("height",10)
			// 	.attr("fill","#e7f098");

			// capa2.append("rect")
			// 	.attr("x",idpsXscale(2009))
			// 	.attr("y",h-margin*2)
			// 	.attr("width",150)
			// 	.attr("height",10)
			// 	.attr("fill","#98bbf0");

			dips.forEach(
				function(d){
					var lineGraph = capa1.append("path")
						.attr("d", linefunction(d.points))
						.attr("class","posturadip")
						.attr("stroke", d.col)
						.attr("stroke-width", 2)
						.attr("shape-rendering","crispEdges")
						.attr("fill", "none")
						.attr("id",("dip"+d.id))
						.attr("nombre",d.nombre)
						.attr("bloque",d.bloque)
						.attr("foto",d.foto)
						.attr("provincia",d.distrito)
						.on("mouseover", function() {
							d3.select(this).attr("stroke","red").attr("stroke-width",2);
							d3.select("#tooltip")
								.attr("class","")
								.select("strong")
								.text(d3.select(this).attr("nombre"));
							d3.select("#tooltip")
								.select("bloque")
								.text(d3.select(this).attr("bloque"));
							d3.select("#tooltip")
								.select("img")
								.attr("src",("images/diputados/"+d3.select(this).attr("foto")));
							d3.selectAll("#p"+d3.select(this).attr("provincia"))
								.style("fill","red");
							$('#tristate').sparkline(d.estados, {type:'tristate', posBarColor:'#9cab19',negBarColor:'#1e64cd'});
							var sel = d3.select(this);
							sel.moveToFront();
						})
						.on("mouseout", function() {
							d3.select(this).attr("stroke",d.col).attr("stroke-width",2);
							d3.select("#tooltip").attr("class","hidden");
							d3.selectAll("#p"+d3.select(this).attr("provincia"))
								.style("fill","#405ac2");
						});
				}
			)

			var xAxis=d3.svg.axis().scale(idpsXscale).orient("bottom").tickFormat(d3.format("d"));
		 	svg.append("g").attr("class","xaxis").attr("transform","translate(0,"+(h-margin1)+")").call(xAxis);
		 	// d3.select("xAxis").on("mouseover", function() {d3.select(this).attr("stroke","red").attr("stroke-width",2)});
/******************************** Acá viene la parte de los mapas ********************************/
			var mapw=400,maph=h+30;
			var mapsvg=d3.select("#mapa")
		 			.append("svg")
		 			.attr("width",mapw)
		 			.attr("height",maph);

		 	var maplayer1=mapsvg.append("g").attr("class","maplayer1");
		 	var maplayer2=mapsvg.append("g").attr("class","maplayer1");
		 	var projection = d3.geo.mercator().translate([1100, -300]).scale([5000]);
		 	var mappath = d3.geo.path().projection(projection);

			d3.json("maps/provincias.json", function(json) {
				maplayer1.selectAll("path")
					.data(json.features)
					.enter()
					.append("path")
					.attr("d", mappath)
					.attr("id",function(d){return "p"+(d.properties.prov);})
					.style("fill","#405ac2");
			});

			d3.json("maps/TIERRA DEL FUEGO.json", function(json) {
				maplayer2.selectAll("path")
					.data(json.features)
					.enter()
					.append("path")
					.attr("d", mappath)
					.attr("id",function(d){return "p"+(d.properties.prov);})
					.style("fill","#405ac2");
			});

		// var numbers = [1, 2, 3, 4, 5];
		for (i=0;i<nombres.length;i++){
			$('<option/>').val(nombres[i].idip).html(nombres[i].nombre).appendTo('#diputados');
		}
		$(".chzn-select").chosen({no_results_text: "No hay: "});$(".chzn-select-deselect").chosen({allow_single_deselect:true});
	function recuperar_seleccion(id) {
		var valores = [];
		var obj = document.getElementById(id);
		for(var i=0; i<obj.length; i++) {
			if (obj[i].selected) {
				valores.push("dip" + obj[i].value);
			}
		}
		var sIN = '';
        if (valores.length) {
			sIN = " IN (" + valores.join(',') + ")";
		}
		return(valores);
	  }

      function actualizarFideos() {
        var Dips = recuperar_seleccion('diputados');
        // console.log(Dips);
        d3.selectAll('.posturadip').attr("stroke","#d9d8d8").attr("pointer-events","none");
        if (Dips.length) {
        for (var i = 0; i < Dips.length; i++) {
        	dip=d3.select("#"+Dips[i]).attr("stroke",color10(Dips[i])).attr("pointer-events","auto").moveToFront();
        	// button=d3.selectAll(".search-choice:nth-child("+Dips.length+")")
        	// .attr("id","b_"+Dips[0])
        	// .style("background-color",color10(Dips[0]))
        	// .style("background-image","none");
        };
        } else{
        	dips.forEach(
				function(d){
					d3.select("#dip"+d.id)
					.attr("stroke", d.col)
					.attr("pointer-events","auto");
				}
			);
        };
      }
		</script>
		<div id="filtro">
		<aside id="periodo" style="margin-top:80px">
			<p>Periodo:
			<select id="year">
			<option value="2006">2006</option>
			<option value="2007">2007</option>
			<option value="2008">2008</option>
			<option value="2009">2009</option>
			<option value="2010">2010</option>
			<option value="2011">2011</option>
		</select>
		</aside>
		<aside id="zona" style="margin-top:80px">
			<p>Regi&oacute;n:
			<select id="region">
			</select>
		</aside>
		</div>
		<aside style="margin-top:120px">
			<p>Orden:
			<select id="order">
			<option value="nombre">por Nombre</option>
			<option value="idp">por punto ideal</option>
			<option value="bloque">por Bloque</option>
		</select>
		</aside>
		<aside id="near" style="margin-top:190px;">
			<table>
				<tr><td id="n0" colspan="2" ><img src=""><br /><a href="" class="nombre"></a></td></tr>
				<tr><td id="n1"><img src=""><br /><a href="" class="nombre"></a></td><td id="n2"><img src=""><br /><a href="" class="nombre"></a></td></tr>
				<tr><td id="n3"><img src=""><br /><a href="" class="nombre"></a></td><td id="n4"><img src=""><br /><a href="" class="nombre"></a></td></tr>
				<tr><td id="n5"><img src=""><br /><a href="" class="nombre"></a></td><td id="n6"><img src=""><br /><a href="" class="nombre"></a></td></tr>
			</table>
		</aside>
		<div id="ref"></div>
<?php
	include_once 'lib/sort.php';
	$cxn = new conector();
	$cn=$cxn->getConn();
	$sql="SELECT nombre,year,idip,idp,bloque,idprov,foto,region FROM ideal_points ORDER BY idip,year";
	$rs=mysqli_query($cn,$sql) or die ("<br />Couldn't execute query. #".mysqli_error($cn). " #".$sql);
	$totalidps=mysqli_num_rows($rs);
	$n=1;
	$ch = curl_init();
	$estructura="{'diputados':[";
	$previoid=0;
	while ($linea=mysqli_fetch_assoc($rs)) {
		$estructura.="{'nombre':'".$linea['nombre']."','foto':'".$linea['foto']."','region':'".$linea['region']."','distrito':'".$linea['idprov']."','bloque':'".$linea['bloque']."','year':'".$linea['year']."','id':".$linea['idip'].",'idp':".$linea['idp']."},";
		$estructura.="<br>";
		$previoid=$linea['idip'];
	}
	$estructura.="]}";
	$estructura=preg_replace('/\[]},/', "[", $estructura);
	// echo $estructura;
?>
		<script type="text/javascript">
			var estructura=<?php $estructura=preg_replace('/<br>/', '', $estructura); echo $estructura;?>;
			gradient1=["#b9f7f5","#bce9f4","#bfdbf3","#c1cdf3","#c4bff2","#c7b1f1","#caa3f0","#cc94f0","#cf86ef","#d278ee","#d56aed","#d75ced","#da4eec","#dd40eb"];
			var margin = {top: 150, right: 0, bottom: 10, left: 150},
				width = 550,
				height = 550,matrix;//sacar matrix de aca y definir dentro de la funcion drawMatrix
			var x = d3.scale.ordinal().rangeBands([0, width]),
			z = d3.scale.linear().domain([4, 0]).clamp(true),
			c = d3.scale.category10().domain(d3.range(10));
			var nodes=[],ord;
			var bloques=[];
			var regiones=[];

			d3.select("#order").property("selectedIndex", 1);

			var e = document.getElementById("year");
			var ye = e.options[e.selectedIndex].value;

			
			// console.log(pr);

			estructura.diputados.forEach(function(p){if(regiones.indexOf(p.region)>-1 || p.region==""){}else{regiones.push(p.region)}});
			regiones=regiones.sort();
			for (i=0;i<regiones.length;i++){
				$('<option/>').val(regiones[i]).html(regiones[i]).appendTo('#region');
			}
			d3.select("#region").property("selectedIndex", 0);

			var p = document.getElementById("region");
			var reg = p.options[p.selectedIndex].value;

			drawMatrix(ye,reg);

			// d3.select("#year").on("change", function() {
			// 	d3.select("svg") .remove();
			// 	nodes=[];
			// 	drawMatrix();
			// });

			function drawMatrix(ye,reg){

			var svg2 = d3.select("body").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.attr("id","svgmatrix")
				// .style("margin-left", margin.left + "px")
				.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			bloques=[];
			// provincias=[];
			estructura.diputados.forEach(
					function(d){
						if (d.year==ye && d.region==reg) {
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
				x.domain(orders.idp);
			};
			// x.domain(orders.idp);

			svg2.append("rect")
				.attr("class", "background")
				.attr("width", width)
				.attr("height", height);

			var row = svg2.selectAll(".row")
				.data(matrix)
				.enter().append("g")
				.attr("class", "row")
				.attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
				.each(row);

			row.append("line")
				.attr("x2", width);

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
				.attr("x1", -width);

			column.append("text")
				.attr("x", 6)
				.attr("y", x.rangeBand() / 2)
				.attr("dy", ".32em")
				.attr("text-anchor", "start")
				.text(function(d, i) { return nodes[i].nombre; });

			$('.bloqueref').remove();
			$('.bloquetext').remove();
			for(b in bloques){
				d3.select("#ref")
					.append("div")
					.attr("class","bloqueref")
					.style("background-color",c(bloques[b]));
				d3.select("#ref")
					.append("div")
					.attr("class","bloquetext")
					.append("p")
					.text(bloques[b]);
			}
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

			var C = $("#year option");
C.on('mouseenter', function(){
    var V = $(this).val();
    // console.log(V);
    d3.select("#svgmatrix") .remove();
				nodes=[];
				ye=V;
				drawMatrix(ye,reg);

			var o = document.getElementById("order");
			var ord = o.options[o.selectedIndex].value;
});

			var D = $("#region option");
D.on('mouseenter', function(){
    var W = $(this).val();
    // console.log(V);
    d3.select("#svgmatrix") .remove();
				nodes=[];
				reg=W;
				drawMatrix(ye,reg);

			var o = document.getElementById("order");
			var ord = o.options[o.selectedIndex].value;
});

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
		d3.select('#n'+(i)+" img").attr("src","images/diputados/"+nodes[perfil.near[i]].foto);
		d3.select("#n"+i+" a").attr("href","http://www.google.com/search?q="+(nodes[perfil.near[i]].nombre).replace(" ","+"))
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
		d3.selectAll("td").attr("align","center");
	};
}
		</script>
	</body>
</html>