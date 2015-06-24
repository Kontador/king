// document.addEventListener("deviceready", onDeviceReady, false);
//
// function onDeviceReady() {
//---------------------------------------------------------------------------------------------------------

// initialize ol

var view = new ol.View({
	center: ol.proj.transform([73.39646100997925, 61.253983635981406], 'EPSG:4326', 'EPSG:3857'),
	zoom: 16
});

var map = new ol.Map({
	layers: [
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: 'http://tiles.{a-z}.st.vmp.ru/{z}/{x}/{y}.png',
				tilePixelRatio: 1,
				minZoom: 12,
				maxZoom: 18
			}),
		}),
	],
	target: 'map',
	view: view,
	interactions: ol.interaction.defaults({
			keyboard: false,
			dragAndDrop: false,
			dragRotate: false,
			dragPan: false,
			altShiftDragRotate: false,
			pinchRotate: false,
			pinchZoom: true
	})
});

//---------------------------------------------------------------------------------------------------------

// marker

var markerEl = document.getElementById('location-marker');
var marker = new ol.Overlay({
	positioning: 'center-center',
	element: markerEl,
	stopEvent: false
});
map.addOverlay(marker);

var positions = new ol.geom.LineString([],
		/** @type {ol.geom.GeometryLayout} */ ('XYZM'));

// activate fuck
var geolocation = new ol.Geolocation(/** @type {olx.GeolocationOptions} */ ({
	projection: view.getProjection(),
	trackingOptions: {
		maximumAge: 10000,
		enableHighAccuracy: true,
		timeout: 600000
	}
}));

var speed = '';
var position = '';

var deltaMean = 500;

// listener
geolocation.on('change', function(evt) {
	var position = geolocation.getPosition();
	var accuracy = geolocation.getAccuracy();
	var heading  = geolocation.getHeading() || 0;
	var speed    = geolocation.getSpeed() || 0; // global
	var coords = positions.getCoordinates();

	console.log('Your coordinates are: ' + position);

	// -----  Speed.
	speedometer(speed);

	var m = Date.now();
	addPosition(position, heading, m, speed);

	var len = coords.length;
	if (len >= 2) {
		deltaMean = (coords[len - 1][3] - coords[0][3]) / (len - 1);
	}
});

geolocation.on('error', function() {
	console.log('geolocation error');
});

function speedometer(speed){
	var speedHTML = (speed * 3.6).toFixed(1);
	if(speedHTML >= 10){
		speedHTML = speedHTML.toString().substr(0, speedHTML.length - 2);
	}
	var speedHTML = speedHTML.toString().replace(".", ",");
	console.log(speedHTML);
	$('#speed').html(speedHTML);
}

function radToDeg(rad) {
	return rad * 360 / (Math.PI * 2);
}
function degToRad(deg) {
	return deg * Math.PI * 2 / 360;
}
// invert negative
function mod(n) {
	return ((n % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
}

function addPosition(position, heading, m, speed) {
	var x = position[0];
	var y = position[1];
	var fCoords = positions.getCoordinates();
	var previous = fCoords[fCoords.length - 1];
	var prevHeading = previous && previous[2];
	if (prevHeading) {
		var headingDiff = heading - mod(prevHeading);


		if (Math.abs(headingDiff) > Math.PI) {      // < 180 ok da
			var sign = (headingDiff >= 0) ? 1 : -1;
			headingDiff = - sign * (2 * Math.PI - Math.abs(headingDiff));
		}
		heading = prevHeading + headingDiff;
	}
	positions.appendCoordinate([x, y, heading, m]);

	positions.setCoordinates(positions.getCoordinates().slice(-20));

	if (heading && speed) {
		markerEl.src = 'img/location.png';
	} else {
		markerEl.src = 'img/location-static.png';
	}
}

var previousM = 0;

// set center
map.beforeRender(function(map, frameState) {
	if (frameState !== null) {
		var m = frameState.time - deltaMean * 1.5;      // get out smoother than ever!
		m = Math.max(m, previousM);
		previousM = m;
		var c = positions.getCoordinateAtM(m, true);    // stackoverflow magic!
		var view = frameState.viewState;
		if (c) {
			view.center = getCenterWithHeading(c, -c[2], view.resolution);
			view.rotation = -c[2];
			marker.setPosition(c);
		}
	}
	return true;
});

function getCenterWithHeading(position, rotation, resolution) {
	var size = map.getSize();
	var height = size[1];

	return [
		position[0] - Math.sin(rotation) * height * resolution * 1 / 4,
		position[1] + Math.cos(rotation) * height * resolution * 1 / 4
	];
}

// callback
function render() {
	map.render();
}

// TADA
function geolocate() {
	map.on('postcompose', render);
	map.render();
	geolocation.setTracking(true); // Start position tracking
}
geolocate();

//---------------------------------------------------------------------------------------------------------

// timer

var hours = 0, mins = 0, secs = 0;
function resetTimer(){
	secs = 0, mins = 0, hours = 0;
}

startTimer = function(){
	tick = setInterval(function(){
		secs += 1;

		if(secs < 10){
			hsecs = ':0' + secs;
		}

		else if(secs == 60){
			mins += 1;
			secs = 0;
			hsecs = ':0' + secs;
		}

		else
			hsecs = ':' + secs;

		if(mins < 10)
			hmins = '0' + mins;

		else if(mins == 60){
			hours += 1;
			mins = 0;
			hmins = '0' + mins;
		}

		else
			hmins = mins

		if(hours == 0)
			hhours = '';

		else {
			hhours = hours + ':';
			hsecs = "<sup>" + hsecs + "</sup>";

		}
		$("#timer").html(hhours + hmins + hsecs);

	}, 1000);

		$('h1, h4, h2').removeClass('sick');
		$('#stopTimer').show();
		$('#startTimer').hide();
		$('#fail-finish').hide();
}

var stopTimer = function(){

	$('h1, h4, h2').addClass('sick');
	$('#stopTimer').hide();
	$('#startTimer').show();
	$('#fail-finish').show();
	clearInterval(tick);
}

$("#stopTimer").click(stopTimer);
$("#startTimer").click(startTimer);

//---------------------------------------------------------------------------------------------------------

// parse json and show one of the routes on the map.
function getRoutes(data, id){
	if(!id) id = 0; // route number.
	var item = data.routes[id][id+1][0];

	// parsing one route
	var routesArr = new Array();
	for(var e=0; e < item.latlngs.length; e++){
		// from user to start position
		// if(e == 0){
		// 	var firstCoordinate = [item.latlngs[e].lat, item.latlngs[e].lng];
		// 	setTimeout(function(){
		// 		distanceBeetween(firstCoordinate);
		// 	}, 2000);
		// }
		// // from user to finish position
		// else if(e == item.latlngs.length - 1){
		// 	var lastCoordinate = [item.latlngs[e].lat, item.latlngs[e].lng];
		// 	setTimeout(function(){
		// 		distanceBeetween(lastCoordinate, 'finish');
		// 	}, 3000);
		// }

		routesArr.push(item.latlngs[e]);
	}
	var rend = {}
	rend.latlngs = routesArr;

	var round = item.round;
	
	addRoutes(rend, round);
	setTimeout(function(){
		beforeFinish(routesArr, item.length);
	}, 2000);
}
$.getJSON( "json/routes.json", function( data ) {
	showRoutes(data);
	getRoutes(data);
});

function analyzingRoute(){
	setInterval(function(){
		$.getJSON( "json/routes.json", function( data ) {
			getRoutes(data);
		});
	}, 7000);
}
function beforeFinish(routesArr, routeLength){

	for(var i=0; i<routesArr.length; i=i+50){
		var first = ol.proj.transform([routesArr[i].lng, routesArr[i].lat], 'EPSG:3857', 'EPSG:4326');
		try {
			var second = ol.proj.transform([geolocation.getPosition()[0], geolocation.getPosition()[1]], 'EPSG:3857', 'EPSG:4326');
		} catch(e){
			console.log("Пожалуйста, включите геолокацию.");
		}

		var sphereA = new ol.Sphere(6378137);
		var distance = sphereA.haversineDistance(second,first);

		// if(distance < 100){ // И если Вам дико повезло, что вы оказались в ста метрах от данной точки
			var result = i / routesArr.length; // Узнаем же теперь, какую чать маршрута вы прошли
			var result2 = result * routeLength; // Находим эту часть от всего маршрута
			var finalResult = routeLength - result2;  // Находим часть которую Вам осталось пройти.
			var finalResult = finalResult.toString().replace('.', ',');
			
			$("#finish").html(finalResult);
		// }
	}
}

// function distanceBeetween(first, type) {
// 	if(!first) var first = [73.434314, 61.248798]; // начало
// 	try {
// 		var second = ol.proj.transform([geolocation.getPosition()[0], geolocation.getPosition()[1]], 'EPSG:3857', 'EPSG:4326');
// 	} catch(e){
// 		console.log("Пожалуйста, включите геолокацию.");
// 	}

// 	var sphereA = new ol.Sphere(6378137);
// 	var distance = sphereA.haversineDistance(second,first);
// 	var normalDis = (distance/1000);
// 	// var normalDis = normalDis.replace('.', ',');

// 	if(!type) type = 'start';
// 	switch(type){
// 		case 'start':
// 			distanceLeft(normalDis);
// 		break;
// 		case 'finish':
// 			distanceToFinish(normalDis);
// 		break;
// 	}
// }

// TO HTML
// function distanceLeft(distance){
// 	if(distance > 1000){
// 		distance = (distance / 1000).toFixed(1).replace('.', ',').toString();
// 	} else if(distance < 1000){
// 		distance += ' м';
// 	}
// 	$("#left").html(distance);

// 	if(distance < 50){
// 		route();
// 	}
// }
// function distanceToFinish(distance){
// 	if(distance > 1000){
// 		hdistance = (distance / 1000).toFixed(1).replace('.', ',').toString();
// 		if(distance > 1000000){
// 			hdistance = '<div style="font-size: 25px">'+ hdistance + '</div>';
// 		}
// 	} else if(distance < 1000){
// 		hdistance = distance + ' м';
// 	}
// 	$("#finish").html(hdistance);
// 	if(distance < 50){
// 		finish();
// 	}
// }

var countLineRoutes = 0;
var vectorLayerLineFirst = new ol.layer.Vector({});

function addRoutes(coord, round) {
	if (countLineRoutes == 0) {
		var comp = new Array();

		for (var i = 0; i < coord.latlngs.length; i++) {
			var xandy = ol.proj.transform([coord.latlngs[i].lng, coord.latlngs[i].lat], 'EPSG:4326', 'EPSG:3857');
			comp.push(xandy);
		}

		var firstroutesF = new ol.Feature({
			geometry: new ol.geom.LineString(comp)
		});

		var vectorLineFirst = new ol.source.Vector({});
		vectorLineFirst.addFeature(firstroutesF);


		var style = new ol.style.Style({
			stroke: new ol.style.Stroke({
				width: 5,
				color: 'rgba(0, 165, 255, 1.0)',

			}),
		});
		vectorLayerLineFirst = new ol.layer.Vector({
			source: vectorLineFirst,
			style: style
		});

		map.addLayer(vectorLayerLineFirst);
		countLineRoutes++;

		// Add start/finish markers.

		var aSource = new ol.source.Vector({});//create empty vector
		var bSource = new ol.source.Vector({});

		var aPoint = new ol.Feature({geometry: new  
			ol.geom.Point(ol.proj.transform([coord.latlngs[1].lng, coord.latlngs[1].lat], 'EPSG:4326', 'EPSG:3857'))
		});

		var bPoint = new ol.Feature({geometry: new
			ol.geom.Point(ol.proj.transform([coord.latlngs[coord.latlngs.length - 1].lng, coord.latlngs[coord.latlngs.length - 1].lat], 'EPSG:4326', 'EPSG:3857')),
		});
		aSource.addFeature(aPoint);
		bSource.addFeature(bPoint);

		//create the style


		// Start marker
		var abStyle = new ol.style.Style({
			image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
				anchor: [0.5, 46],
				anchorXUnits: 'fraction',
				anchorYUnits: 'pixels',
				opacity: 1,
				scale: 0.9,
				src: 'img/AB.png'
			}))
		});

		var aStyle = new ol.style.Style({
			image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
				anchor: [0.5, 46],
				anchorXUnits: 'fraction',
				anchorYUnits: 'pixels',
				opacity: 1,
				scale: 0.9,
				src: 'img/A.png'
			}))
		});

		// Finish marker
		var bStyle = new ol.style.Style({
			image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
				anchor: [0.5, 46],
				anchorXUnits: 'fraction',
				anchorYUnits: 'pixels',
				opacity: 1,
				scale: 0.9,
				src: 'img/B.png'
			}))
		});



		//add the feature vector to the layer vector, and apply a style to whole layer
		aLayer = new ol.layer.Vector({
			source: aSource,
			style: aStyle
		});
		bLayer = new ol.layer.Vector({
			source: bSource,
			style: bStyle
		});
		abLayer = new ol.layer.Vector({
			source: aSource,
			style: abStyle
		});
		if(round == 1){
			map.addLayer(abLayer);
		} else {
			map.addLayer(bLayer);
			map.addLayer(aLayer);
		}
		
	}
}
function delRoutes() {
	map.removeLayer(vectorLayerLineFirst);
	map.removeLayer(aLayer);
	map.removeLayer(bLayer);
	map.removeLayer(abLayer);
	countLineRoutes = 0;
}

setTimeout(function(){
	frameNumb = 0;
	$(function () {
		$('.fotorama').on('fotorama:showend ',function (e, fotorama) {
			var frameNumb = fotorama.activeIndex;
			console.log(frameNumb);
			$.getJSON('json/routes.json', function(data){
				delRoutes();
				getRoutes(data, frameNumb);
			});
		}).fotorama();
	});
}, 800);

var routeKind = '';

function heat() {
	$('.start').hide();
	$('.route').hide();
	$('.finish').hide();
	$('.list').show();
	$('#kntdr').attr('class', 'short');
};


// parse json and show ALL routes
function showRoutes(data){
	for(var i=0; i < data.routes.length; i++){
		var item = data.routes[i][i+1][0];

		var kind = {
			'dist': {
				css: "dist",
				header: "На дистанцию"
			},
			'time': {
				css: "time",
				header: "На время"
			}
		}
		var lengthNumber = item.length;

		item.length = item.length.toString().slice(0, -1);
		item.length = item.length.replace(".", ",");
		item.css    = kind[item.kind].css;
		item.header = kind[item.kind].header;

		$("#routes").append("\
			<div class=\"item "+ item.css +"\">\
				<h4>"+ item.header +"</h4>\
				<h3 id=\"item1\">"+ item.name +"</h3>\
				<h1>" + item.length +" км</h1>\
			<button><a onclick=\"start('"+item.css+", "+lengthNumber+", " +item.name+ "')\">Начать</a></button>\
			</div>\
		");
	}
}
// по клику на кнопку «Начать» вызывается функция start(), в которую передаётся в качестве первого аргумента тип маршрута и длина маршрута в качестве второго.

function start(params) {
	var params = params.split(",");
	var css = params[0], length = params[1], name = params[2];

	length = length.toString().slice(0, -1).replace(".", ",") + ' км';
	$("#global_left").html(length);
	$("#global_name").html(name);
	$('.route').show().addClass(css);

	$('.start, .list').hide();
	$('#kntdr').attr('class', 'long');
	startTimer();
	analyzingRoute();
};

function finish(type) {
	console.log("Type "+ type);
	// type = { 1: 'success', 0: 'fail'}
	if(type == 0){
		$("#finish-message").html("Увы");

		

	}
	var finishTime = $("#timer").html();
	$("#finish-time").html(finishTime);

	$('.route').hide();
	$('.finish').show().addClass(routeKind);

	$('h1, h2, h4').removeClass('sick');
};

heat();

// $('.start').click(route());
$('#fail-finish').click(function(){
	finish(0);
});

$('.notice button').click(function() {
	$('.notice').fadeOut(200);
	$('#blur').removeClass('notice-shown');
});

$('.share').click(function() {
    window.plugins.socialsharing.share('Проехал 0 км за 1:03 не без помощи Контадора!', null, null, 'http://kntdr.ru')
});
// }
