// creating the view
var view = new ol.View({
  center: ol.proj.transform([73.241, 61.143], 'EPSG:4326', 'EPSG:3857'),
  zoom: 16
});

// creating the map
var map = new ol.Map({
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
// 	      url: 'http://api.tiles.mapbox.com/v4/vanyaklimenko.iajg5k00/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidmFueWFrbGltZW5rbyIsImEiOiJVOTRmSUowIn0.kmHbep2kGteMcaAQAlYllA'
		  url: 'http://tiles.{a-z}.st.vmp.ru/{z}/{x}/{y}.png'
      }),
    })
  ],
  target: 'map',
  view: view
});

ol.interaction.defaults({ 
		keyboard: false,
		dragPan: false,
		dragPan: false,
})

// Geolocation marker
var markerEl = document.getElementById('location-marker');
var marker = new ol.Overlay({
  positioning: 'center-center',
  element: markerEl,
  stopEvent: false
});
map.addOverlay(marker);

// LineString to store the different geolocation positions. This LineString
// is time aware.
// The Z dimension is actually used to store the rotation (heading).
var positions = new ol.geom.LineString([],
    /** @type {ol.geom.GeometryLayout} */ ('XYZM'));

// Geolocation Control
var geolocation = new ol.Geolocation(/** @type {olx.GeolocationOptions} */ ({
  projection: view.getProjection(),
  trackingOptions: {
    maximumAge: 1000,
    enableHighAccuracy: true,
    timeout: 500000
  }
}));

var deltaMean = 50; // the geolocation sampling period mean in ms

// Listen to position changes
geolocation.on('change', function(evt) {
  var position = geolocation.getPosition();
  var accuracy = geolocation.getAccuracy();
  var heading = geolocation.getHeading() || 0;
  var speed = geolocation.getSpeed() || 0;
  var m = Date.now();

  addPosition(position, heading, m, speed);

  var coords = positions.getCoordinates();
  var len = coords.length;
  if (len >= 2) {
    deltaMean = (coords[len - 1][3] - coords[0][3]) / (len - 1);
  }
});

geolocation.on('error', function() {
  alert('geolocation error');
});

// convert radians to degrees
function radToDeg(rad) {
  return rad * 360 / (Math.PI * 2);
}
// convert degrees to radians
function degToRad(deg) {
  return deg * Math.PI * 2 / 360;
}
// modulo for negative values
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

    // force the rotation change to be less than 180°
    if (Math.abs(headingDiff) > Math.PI) {
      var sign = (headingDiff >= 0) ? 1 : -1;
      headingDiff = - sign /* (2 * Math.PI - Math.abs(headingDiff))*/;
    }
    heading = prevHeading + headingDiff;
  }
  positions.appendCoordinate([x, y, heading, m]);

  // only keep the 20 last coordinates
  positions.setCoordinates(positions.getCoordinates().slice(-20));

  // FIXME use speed instead
  if (heading && speed) {
    markerEl.src = 'location-head.png';
  } else {
    markerEl.src = 'location.png';
  }
}

var previousM = 0;
// change center and rotation before render
map.beforeRender(function(map, frameState) {
  if (frameState !== null) {
    // use sampling period to get a smooth transition
    var m = frameState.time - deltaMean * 2;
    m = Math.max(m, previousM);
    previousM = m;
    // interpolate position along positions LineString
    var c = positions.getCoordinateAtM(m, true);
    var view = frameState.viewState;
    if (c) {
      view.center = getCenterWithHeading(c, -c[2], view.resolution);
      view.rotation = -c[2];
      marker.setPosition(c);
    }
  }
  return true; // Force animation to continue
});

function getCenterWithHeading(position, rotation, resolution) {
  var size = map.getSize();
  var height = size[1];

  return [
    position[0] - Math.sin(rotation) * height * resolution * 1 / 4,
    position[1] + Math.cos(rotation) * height * resolution * 1 / 4
  ];
}

// postcompose callback
function render() {
  map.render();
}

// geolocate device
var geolocateBtn = document.getElementById('geolocate');
  geolocation.setTracking(true);
  map.on('postcompose', render);
  map.render();