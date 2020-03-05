const turf = require('./modules/turfModules')
const buffer = require('@turf/buffer')
const express = require('express');
const bodyParser = require('body-parser');
const server = express();
const path = require('path');
var samplePoints = require('./data/samplePoints.json');
const Antenna = require('iotex-antenna')
const VEHICLE_REGISTER_ABI = require('./src/pages/vehicle-registration/ABI')
const DID_REGISTER_ABI = require('./src/pages/did-registration/did-contract-details').abi
const axios = require('axios').default
const generateRandomRoute = require('./modules/generateRandomRoute')
const fetchGeometries = require('./modules/fetchGeometries')
const turfifyGeometries = require('./modules/turfifyGeometries')
const mapboxtoken = 'pk.eyJ1IjoiaW90eHBsb3JlciIsImEiOiJjazZhbXVpZjkwNmc4M29vZ3A2cTViNWo1In0.W38aUZEDsxdIcdVVJ7_LWw'


// Fetch registered zones from Zone Registry (Tezos?)
const samplePolygons = require('./data/samplePolygons.json');
const sampleJurisdictionDIDdocs = require('./data/sampleZoneDids.json')

// 1. Lint did docs json
//
console.log("sampleJurisdictionDIDdocs", sampleJurisdictionDIDdocs);

console.log(fetchGeometries)

var geojsonGeometries = await fetchGeometries(sampleJurisdictionDIDdocs);
var turfPolygons = await turfifyGeometries(geojsonGeometries);
var sampleVehicles = [];


server.use(bodyParser.urlencoded({
  extended: false
}));

const http = server.listen(3001, () => {
  console.log('Express server and socket.io websocket are running on localhost:3001');
});

const io = require('socket.io')(http);

io.on('connection', async (client) => {
  // Start enclave listener
  const SecureWorker = require('./secureworker');
  const worker = new SecureWorker('enclave.so', 'enclave-point-polygon-check.js');

  let counter = 1;
  // When we receive a request for new points, send the points and polygons into the enclave and run the check
  client.on('fetchNewPositionsFromServer', function(points) {
    worker.postMessage({
      type: 'pointInPolygonCheck',
      points,
      turfPolygons,
      samplePolygons,
      counter
    })
    counter += 1;


    // We'll add the non-enclave tests and event emission here



  });

  // Listen for results from enclave
  worker.onMessage((message) => {
    if (message.type === 'enteringNotification') {
      // If enclave detects a vehicle entering a zone, send that to the client
      client.emit('fetchNewPositionsFromServerResponse', message.notification)
    } else if (message.type === 'exitingNotification') {
      // If enclave detects a vehicle exiting a zone, send that to the client and slash vehicle
      // SLASH HERE //
      client.emit('fetchNewPositionsFromServerResponse', message.notification)
    } else if (message.type === 'updatePositions') {
      // When enclave finishes, get the new positions updated vehicle info and send to client
      client.emit('updatePositions', message.newPositions, message.points)
    }
  })

  client.on('disconnect', function() {
    console.log('user disconnected')
  })

})

server.get('/api/getAllVehicles', async (req, res) => {
  let antenna = new Antenna.default("http://api.testnet.iotex.one:80");

  // Get total number of registered vehicles
  try {
    let numberOfRegisteredVehicles = await antenna.iotx.readContractByMethod({
        from: "io1y3cncf05k0wh4jfhp9rl9enpw9c4d9sltedhld",
        abi: VEHICLE_REGISTER_ABI,
        contractAddress: "io1vrxvsyxc9wc6vq29rqrn37ev33p4v2rt00usnx",
        method: "getEveryRegisteredVehicle"
      },
      0);
    numberOfRegisteredVehicles = numberOfRegisteredVehicles.toString('hex');
    let registeredVehicles = []
    // Iterate through the registered vehicles array and return each string
    console.log(numberOfRegisteredVehicles, "vehicles NOW")
    for (let i = 0; i < numberOfRegisteredVehicles; i++) {
      const vehicleID = await antenna.iotx.readContractByMethod({
          from: "io1y3cncf05k0wh4jfhp9rl9enpw9c4d9sltedhld",
          abi: VEHICLE_REGISTER_ABI,
          contractAddress: "io1vrxvsyxc9wc6vq29rqrn37ev33p4v2rt00usnx",
          method: "allVehicles"
        },
        i);

      // Generates a route near LONDON right now ...
      // NEXT up: pull random Terrestrial polygon from the zones and generate a route through that ...
      let route = await generateRandomRoute(turfPolygons[1], mapboxtoken)
      sampleVehicles.push(route);


      registeredVehicles.push(vehicleID)
    }
    // console.log(sampleVehicles);
    console.log(sampleVehicles)
    let samplePts = sampleVehicles.map((line) => line.geometry.coordinates)
    samplePoints = samplePts[0].map((col, i) => samplePts.map(function (row) {return { "coords": row[i]} }));

    console.log('samplePts', samplePoints);
    // samplePoints = sampleVehicles.map((line) => {
    //   return [line.geometry.coordinates.map((point) => {
    //     return {"coords": point}
    //   })]
    // })
    // // console.log(samplePoints)
    console.log("sampleVehicles", sampleVehicles)
    let ret = []

    // Get the DID documents associated with each
    for (let i in registeredVehicles) {
      let uri = await antenna.iotx.readContractByMethod({
        from: "io1y3cncf05k0wh4jfhp9rl9enpw9c4d9sltedhld",
        contractAddress: "io1zyksvtuqyxeadegsqsw6vsqrzr36cs7u2aa0ag",
        abi: DID_REGISTER_ABI,
        method: "getURI"
      }, registeredVehicles[i]);
      uri = uri.toString('hex');
      if (uri) {
        let doc = await axios.get(uri)
        ret.push(doc.data)
      }
    }
    res.send(ret)
  } catch (err) {
    console.log(err)
  }
});


server.get('/api/getAllPolygons', async (req, res) => {
  res.send(samplePolygons) // Needs to be calling smart contracts to get polygons
})

server.get('/api/getAllPoints', async (req, res) => {
  res.send(samplePoints) // Should probably have a generateRoutes() function which generates random routes equal to the amount of registered vehicles.
  // See mapbox directions API for potential solution.
})

server.get('/api/getTotalStaked', async (req, res) => {
  let meta = await axios({
    url: "https://testnet.iotexscan.io/api-gateway/",
    method: "post",
    data: {
      query: `
                  query {
                          getAccount (address: "io1vrxvsyxc9wc6vq29rqrn37ev33p4v2rt00usnx"){
                            accountMeta {
                              balance
                            }
                          }
                        }
                  `
    },
  });
  res.send({
    totalStaked: meta.data.data.getAccount.accountMeta.balance / 1e18
  })
})


// Example get request to express server
server.use('/', express.static(path.join(__dirname, 'public/home')));
