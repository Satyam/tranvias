/* global console, L, $, window */
$(function() {
  var template = L.Util.template,
    SERVER = 'server.php',
    lines = [],
    stops = [],
    routes = [],
    lastId = 0,
    traces = [],
    markers = [];

  $('#map').css({
    height: $(window.document).height() + 'px',
  });
  $(window).resize(function() {
    $('#map').css({
      height: $(window.document).height() + 'px',
    });
  });

  var failFn = function(jqXhr, statusText) {
    window.alert('Retrieval of data failed: ' + statusText);
  };

  // Basic map display
  var map = L.map('map', {
    center: [41.2358883, 1.8063239],
    zoom: 15,
  });

  //http://geoserveis.icc.cat/icc_mapesbase/wms/service?REQUEST=GetMap&VERSION=1.1.0&SERVICE=WMS&SRS=EPSG:25831&BBOX=290368.84,4538236.42,292203.28,4540070.86&WIDTH=520&HEIGHT=520&LAYERS=mtc50m&STYLES=&FORMAT=JPEG&BGCOLOR=0xFFFFFF&TRANSPARENT=TRUE&EXCEPTION=INIMAGE

  //	var nexrad = L.tileLayer.wms("http://geoserveis.icc.cat/icc_mapesbase/wms/service", {
  //		layers: 'mtc5m',
  //		format: 'JPEG',
  //		transparent: true,
  //		attribution: "Weather data © 2012 IEM Nexrad",
  //		version:'1.1'
  //	}).addTo(map)	;

  L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  }).addTo(map);

  var beachLab = L.marker([41.23, 1.815], {
    icon: L.icon({
      iconUrl: 'icons/beachlab.svg',
      iconSize: [200, 200],
      iconAnchor: [100, 100],
      popupAnchor: [0, -50],
    }),
  })
    .bindPopup(
      'Beach Lab Sitges<br/><a href="http://fablabsitges.org/">http://fablabsitges.org/</a>'
    )
    .addTo(map);

  // Utility function to request info from the server
  var fetch = function(args, callback) {
    $.ajax({
      type: 'GET',
      url: SERVER,
      data: args,
      dataType: 'json',
    })
      .done(function(data) {
        data.forEach(callback);
      })
      .fail(function(jqXhr, statusText) {
        window.alert('Retrieval of data failed: ' + statusText);
      });
  };

  var stopIcon = L.icon({
    iconUrl: 'icons/Busstation20.png',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: 'fablab-stop-icon',
  });
  // Drawings bus stops
  var drawStop = function(id, stop) {
    if (!stop) return;
    if (parseInt(stop.type, 10) === 0) {
      stop.marker = L.marker([stop.lat, stop.lng], {
        icon: stopIcon,
        title: stop.addr || '',
        // opacity: (stop.type ? 0 : 1),
        draggable: true,
        fl_id: id,
      })
        .bindPopup()
        .on('popupopen', function(ev) {
          var m = ev.target,
            propagate = false;
          switch (ev.type) {
            case 'popupopen':
              onOpenMarkerPopup(m, id, stop);
              break;
            default:
              propagate = true;
          }
          if (propagate) L.DomEvent.stopPropagation(ev);
        })
        .addTo(map);
    }
  };

  var onOpenMarkerPopup = function(m, id, stop) {
    m.setPopupContent(
      '<ul class="stopInfo"><li>id: ' +
        id +
        '</li><li>Dirección:<br/>' +
        (stop.addr || '') +
        '</li><li>Líneas</li><ul>' +
        $
          .map(routes, function(route, idr) {
            if (id == route.idStopEnd) {
              return '<li>Línea ' + route.idLine + ' ' + idr + '</li>';
            }
          })
          .join('') +
        '</ul></ul>'
    );
  };
  // drawing routes
  var drawRoute = function(id, route) {
    if (!route) return;
    route.marker = L.polyline(JSON.parse(route.route), {
      color: lines[route.idLine].color,
      weight: 3,
      opacity: 1,
      fl_id: id,
    }).addTo(map);
  };

  // Refreshes the location or trace of the buses
  var refreshBuses = function() {
    if ($('#traces').prop('checked')) {
      fetch(
        {
          id: lastId || 0,
          cmd: 'traces',
        },
        function(entry) {
          var ll = L.latLng(parseFloat(entry.lat), parseFloat(entry.lng)),
            bus = parseInt(entry.bus, 10),
            d = new Date(entry.t);
          if (!traces[bus]) {
            traces[bus] = L.polyline([], {
              color: lines[bus].color,
              weight: 3,
              opacity: 0.8,
            }).addTo(map);
          }

          traces[bus].addLatLng(ll);
          lastId = Math.max(lastId, entry.idGps);
          markers[bus]
            .setLatLng(ll)
            .setPopupContent(
              d.toLocaleDateString() +
                ' ' +
                d.toLocaleTimeString() +
                '<br/>' +
                'Vel: ' +
                entry.speed +
                'kph<br/>' +
                'Rumbo: ' +
                entry.hdg +
                'º'
            );
        }
      );
    } else {
      fetch(
        {
          cmd: 'last',
        },
        function(entry) {
          var ll = L.latLng(parseFloat(entry.lat), parseFloat(entry.lng)),
            bus = parseInt(entry.bus, 10),
            d = new Date(entry.t);

          markers[bus]
            .setLatLng(ll)
            .setPopupContent(
              d.toLocaleDateString() +
                ' ' +
                d.toLocaleTimeString() +
                '<br/>' +
                'Vel: ' +
                entry.speed +
                'kph<br/>' +
                'Rumbo: ' +
                entry.hdg +
                'º'
            );
        }
      );
    }
  };

  var refreshBusVisibility = function() {
    var showTraces = $('#traces').prop('checked') ? 1 : 0;
    traces.forEach(function(trace, bus) {
      trace.setStyle({
        opacity: lines[bus].visible ? showTraces : 0,
      });
    });
    markers.forEach(function(marker, bus) {
      marker.setOpacity(lines[bus].visible ? 1 : 0);
    });
  };

  // Changes the visibility to show either traces or buses
  $('#traces').on('click', refreshBusVisibility);

  // Show bus routes
  var showRoutes = function() {
    var routesVisible = $('#routes').prop('checked');
    $.each(routes, function(id, route) {
      if (!route) return;
      route.marker.setStyle({
        opacity: lines[route.idLine].visible && routesVisible ? 1 : 0,
      });
    });
  };

  $('#routes').on('click', showRoutes);

  // Show bus stops
  var showStops = function() {
    var stopsVisible = $('#stops').prop('checked') ? 1 : 0;
    $.each(stops, function(id, stop) {
      if (stop && stop.marker) {
        stop.marker.setOpacity(stopsVisible);
      }
    });
  };
  $('#stops').on('click', showStops);

  // Depending on which bus lines are visible, show them

  var checkBusVisibility = function() {
    $('#lineas input').each(function() {
      var el = $(this);
      lines[el.val()].visible = el.prop('checked');
    });
    showRoutes();
    refreshBusVisibility();
  };
  $('#lineas').on('click', 'input', checkBusVisibility);

  $.when(
    $.getJSON(SERVER, {
      cmd: 'lines',
    }),
    $.getJSON(SERVER, {
      cmd: 'stops',
    }),
    $.getJSON(SERVER, {
      cmd: 'routes',
    })
  )
    .done(function(rLines, rStops, rRoutes) {
      // Showing the color legends and saving the lines info
      $('#lineas').append(
        $
          .map(rLines[0], function(l) {
            if (!l) return;
            lines[parseInt(l.idLine, 10)] = {
              color: l.color,
              descr: l.descr,
              visible: true,
            };
            markers[l.idLine] = L.marker([41.2358883, 1.8063239], {
              icon: L.icon({
                iconUrl: 'icons/Bus_icon_' + l.color + '.jpg',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10],
                className: 'fablab-stop-icon',
              }),
            }).addTo(map);
            return template(
              '<p style="color:{color}"><input type="checkbox" value="{idLine}" checked/> {descr}</p>',
              l
            );
          })
          .join('')
      );

      stops = rStops[0];
      $.each(stops, drawStop);

      routes = rRoutes[0];
      $.each(routes, drawRoute);

      checkBusVisibility();
      // show buses
      refreshBuses();
      // Timer to refresh values
      window.setInterval(refreshBuses, 5000);
    })
    .fail(failFn);
});
