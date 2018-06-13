const lineas = require('./lineas.json');
const routes = require('./routes.json');
const stops = require('./stops.json');
const fs = require('fs');
const path = require('path');
const convert = require('xml-js');

// const result = convert.xml2js(
//   fs.readFileSync(path.join(__dirname, 'sitges.osm')),
//   {
//     compact: true,
//     nativeType: true,
//   }
// );
// const nodes = result.osm.node.reduce((acc, n) => {
//   let a = n._attributes;
//   acc[a.id] = {
//     lat: a.lat,
//     lng: a.lon,
//   };
//   return acc;
// }, {});
//
// console.log(typeof result.osm.way, Array.isArray(result.osm.way));
//
// const ways = result.osm.way.reduce((acc, w) => {
//   (Array.isArray(w.tag) ? w.tag : [w.tag]).forEach(t => {
//     if (t && t._attributes.k === 'highway') {
//       const v = t._attributes.v;
//       if (acc[v]) {
//         acc[v] += 1;
//       } else {
//         acc[v] = 1;
//       }
//     }
//   });
//   return acc;
// }, {});
//
// console.log(ways);
// fs.writeFileSync('./sitges.json', JSON.stringify(nodes, null, 2));
//
// let changed = false;
// for (idRoute in routes) {
//   let route = routes[idRoute];
//   if (typeof route.route === 'string') {
//     changed = true;
//     let r = JSON.parse(route.route);
//     route.route = r.map(tramo => ({
//       lat: tramo[0],
//       lng: tramo[1],
//     }));
//   }
// }
//
// if (changed) {
//   fs.writeFileSync('./routes.json', JSON.stringify(routes, null, 2));
// } else {
//   console.log('nothing changed');
// }

const fStore = {
  lineas: {},
  nodos: {},
};

fStore.lineas = lineas.reduce((acc, linea) => {
  acc['l_' + linea.idLine] = {
    descr: linea.descr,
    color: linea.color,
  };

  return acc;
}, {});

let id = 1;
lineas.forEach(linea => {
  const idLinea = 'l_' + linea.idLine;
  let stopEnd = 0;
  fStore.nodos = Object.assign(
    fStore.nodos,
    Object.keys(routes)
      .sort((a, b) => a - b) // Compare numeric
      .reduce((acc, idTramo) => {
        const tramo = routes[idTramo];
        if (tramo.idLine === linea.idLine) {
          if (tramo.idStopStart !== stopEnd) {
            acc[id] = {
              lat: Number(stops[tramo.idStopStart].lat),
              lng: Number(stops[tramo.idStopStart].lng),
              stop: true,
              [idLinea]: id,
            };
            id += 1;
          }
          tramo.route.forEach(n => {
            acc[id] = {
              lat: Number(n.lat),
              lng: Number(n.lng),
              [idLinea]: id,
            };
            id += 1;
          });
          acc[id] = {
            lat: Number(stops[tramo.idStopEnd].lat),
            lng: Number(stops[tramo.idStopEnd].lng),
            stop: true,
            [idLinea]: id,
          };
          id += 1;
          stopEnd = tramo.idStopEnd;
        }
        return acc;
      }, {})
  );
});

fs.writeFileSync('./fStore.json', JSON.stringify(fStore, null, 2));
