/* global console, L, $, window, firebase */
$(function() {
  const db = firebase.firestore();
  db.settings({ timestampsInSnapshots: true });
  const stopMarkers = {};
  const lineas = {};

  $('#map').css({
    height: $(window.document).height() + 'px',
  });
  $(window).resize(function() {
    $('#map').css({
      height: $(window.document).height() + 'px',
    });
  });

  // Basic map display
  const map = L.map('map', {
    center: [41.2358883, 1.8063239],
    zoom: 15,
  });

  L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  }).addTo(map);

  const stopIcon = L.icon({
    iconUrl: 'icons/Bus-icon.svg',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: 'fablab-stop-icon',
  });

  // Drawings bus stops
  function drawStop(idNode, node) {
    stopMarkers[idNode] = L.marker([node.lat, node.lng], {
      icon: stopIcon,
      title: idNode || '',
    }).addTo(map);
  }

  // Show bus stops
  function showStops() {
    const stopsVisible = $('#stops').prop('checked') ? 1 : 0;
    Object.values(stopMarkers).forEach(marker => {
      marker.setOpacity(stopsVisible);
    });
  }

  $('#stops').on('click', showStops);

  // Show bus routes
  function showRoutes() {
    const routesVisible = $('#routes').prop('checked');
    Object.values(lineas).forEach(l => {
      if (l.polyline) {
        l.polyline.setStyle({
          opacity: l.visible && routesVisible ? 1 : 0,
        });
      }
    });
  }

  $('#routes').on('click', showRoutes);

  // Depending on which bus lines are visible, show them

  function checkBusVisibility(ev) {
    const input = ev.target;
    lineas[input.value].visible = input.checked;

    showRoutes();
  }

  $('#lineas').on('click', 'input', checkBusVisibility);

  function readNodos(idLinea, l) {
    db.collection('nodos')
      .where(idLinea, '>', 0)
      .orderBy(idLinea)
      .get()
      .then(snapshot => {
        const latLngs = [];
        snapshot.forEach(doc => {
          const n = doc.data();
          const nid = doc.id;

          // console.log(`${nid} => ${JSON.stringify(n, null, 2)}`);
          if (n.stop) {
            drawStop(nid, n);
          }
          latLngs.push([n.lat, n.lng]);
        });
        // console.log(idLinea, latLngs);
        l.polyline = L.polyline(latLngs, {
          color: l.color,
          weight: 3,
          opacity: 1,
        }).addTo(map);
        l.visible = true;
      });
  }

  function readLineas() {
    db.collection('lineas')
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          const idLinea = doc.id;
          const l = doc.data();
          // console.log(`${idLinea} => ${JSON.stringify(l, null, 2)}`);
          lineas[idLinea] = l;
          $('#lineas').append(
            `<p style="color:${
              l.color
            }"><input type="checkbox" value="${idLinea}" checked/> ${
              l.descr
            }</p>`
          );
          readNodos(idLinea, l);
        });
      });
  }
  readLineas();
});
