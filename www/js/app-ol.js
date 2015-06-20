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
        //        url: 'http://api.tiles.mapbox.com/v4/vanyaklimenko.iajg5k00/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidmFueWFrbGltZW5rbyIsImEiOiJVOTRmSUowIn0.kmHbep2kGteMcaAQAlYllA'
        url: 'http://tiles.{a-z}.st.vmp.ru/{z}/{x}/{y}.png'
      }),
    })
  ],
  target: 'map',
  view: view,
  interactions: ol.interaction.defaults({
      keyboard: false,
      DragAndDrop: false,
      altShiftDragRotate:false,
      pinchRotate:false
  })
});

// Geolocation marker

var iconFeature = new ol.Feature({});
var iconStyle = new ol.style.Style({});
 var vectorLayer = new ol.layer.Vector({});
 var a = true;

var viewOption = true; // True - показывает местоположение False - ничего

// LineString to store the different geolocation positions. This LineString
// is time aware.
// The Z dimension is actually used to store the rotation (heading).
var positions = new ol.geom.LineString([],
  /** @type {ol.geom.GeometryLayout} */
  ('XYZM'));

// Geolocation Control
var geolocation = new ol.Geolocation( /** @type {olx.GeolocationOptions} */ ({
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
  var heading = geolocation.getHeading() || 0;
  var speed = geolocation.getSpeed() || 0;
  var m = Date.now();

  if (viewOption) {
    map.getView().setCenter(position);
    viewOption = false;
  }

   iconFeature = new ol.Feature({
    geometry: new ol.geom.Point(position),
  });


   iconStyle = new ol.style.Style({
    image: new ol.style.Icon(({
      rotation: 0,
      src: 'img/location.png',
      scale: 0.13
    }))
  });

  iconFeature.setStyle(iconStyle);

  var vectorSource = new ol.source.Vector({
    features: [iconFeature]
  });

  vectorLayer = new ol.layer.Vector({
    source: vectorSource
  });
  if (a){
    map.addLayer(vectorLayer);
    a = false;
}
  var abcd = iconFeature.getStyle().getImage().setRotation();

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
      headingDiff = -sign /* (2 * Math.PI - Math.abs(headingDiff))*/ ;
    }
    heading = prevHeading + headingDiff;
  }
  positions.appendCoordinate([x, y, heading, m]);

  // only keep the 20 last coordinates
  positions.setCoordinates(positions.getCoordinates().slice(-20));


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
    if (c) {
        iconFeature.getStyle().getImage().setRotation(-c[2]);
    }
  }
  return true; // Force animation to continue
});

function render() {
  map.render();
}

// geolocate device
geolocation.setTracking(true);
map.on('postcompose', render);
map.render();



//---------------------------------------------------------------------------------------------------------
