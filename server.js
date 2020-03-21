const toRau = require("iotex-antenna/lib/account/utils").toRau;
const Contract = require("iotex-antenna/lib/contract/contract").Contract
const VehicleRegABI = require("./src/pages/vehicle-registration/ABI")
const turf = require('./modules/turfModules')
const buffer = require('@turf/buffer')
const express = require('express');
const bodyParser = require('body-parser');
const server = express();
const path = require('path');
const ethers = require('ethers');
const Antenna = require('iotex-antenna')
const VEHICLE_REGISTER_ABI = require('./src/pages/vehicle-registration/ABI')
const DID_REGISTER_ABI = require('./src/pages/did-registration/did-contract-details').abi
const ZONE_REGISTER_ABI = require('./src/pages/jurisdiction-registry/zone-contract-details.js').abi
const ZONE_REGISTER_ADDRESS = require('./src/pages/jurisdiction-registry/zone-contract-details.js').contractAddress
const axios = require('axios').default
const generateRandomRoute = require('./modules/generateRandomRoute')
const fetchDIDsAndGeometries = require('./modules/fetchDIDsAndGeometries');
const addGeometriesToDidDocs = require('./modules/addGeometriesToDidDocs')
const mapboxtoken = 'pk.eyJ1IjoiamdqYW1lcyIsImEiOiJjazd5cHlucXUwMDF1M2VtZzM1bjVwZ2hnIn0.Oavbw2oHnexn0hiVOoZwuA'

// Fetch registered zones from Zone Registry
var samplePoints = require('./data/samplePoints.json');
const samplePolygons = require('./data/samplePolygons.json');
const sampleJurisdictionDIDdocs = require('./data/sampleZoneDids.json')
// const sampleVehicles = require('./data/sampleVehicles.json')
let turfPolygons = []

async function slash(did) {
  let antenna = new Antenna.default("http://api.testnet.iotex.one:80");
  let vehicleRegContract = new Contract(VehicleRegABI,"io1vrxvsyxc9wc6vq29rqrn37ev33p4v2rt00usnx",{provider: antenna.iotx});

  // Get vehicle's document
  let uri = await antenna.iotx.readContractByMethod({
    from: "io1y3cncf05k0wh4jfhp9rl9enpw9c4d9sltedhld",
    contractAddress: "io1zyksvtuqyxeadegsqsw6vsqrzr36cs7u2aa0ag",
    abi: DID_REGISTER_ABI,
    method: "getURI"
  }, did);
  let res = await axios.get(uri)

  // Read owner from vehicle
  let vehicleOwner = res.data.creator

  // Slash owner (admin needs to use the private key of the owner of the VehicleRegistry contract)
  let admin = await antenna.iotx.accounts.privateKeyToAccount(
      "cd1ee30decfa0b4490642e92afccc00510256ef6c01ccb8989e5d186694ee3d5"
  );
  try {
    let actionHash = await vehicleRegContract.methods.slash(toRau("0.1", "Iotx"), vehicleOwner, did, {
      account: admin,
      gasLimit: "1000000",
      gasPrice: toRau("1", "Qev")
    });
    console.log("Slash occurs now on: ", vehicleOwner, "who owns", did, "Slashing action hash: ", actionHash)
    return actionHash
  } catch (err) {
    console.log(err);
  }

}

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

      registeredVehicles.push(vehicleID)
    }

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
    console.log(ret)
    res.send(ret)
  } catch (err) {
    console.log(err)
  }
});


server.get('/api/getAllPolygons', async (req, res) => {

// Set up connection with ZoneRegistry contract on Ethereum
    const ethProvider = ethers.getDefaultProvider('ropsten');
    const zoneContract = new ethers.Contract(ZONE_REGISTER_ADDRESS, ZONE_REGISTER_ABI, ethProvider);


// Simulated Fetch DID URIs:
    var zoneAddresses = [
        "0x77DB10B97bbcE20656d386624ACb5469E57Dd21b", // <- UK
        "0x375ef39Fe23128a42992d5cad5a166Ab04C20A88", // <- Netherlands
        "0x3985dE49147725D64407d14c3430bd1dC9c11f04",  // <- Germany
        "0xe0eE166374DcD88e3dFE50E3f72005CEE37F64BD" // <- France
    ];

    // Fetch Zone DID Docs from addresses, and geojson from DID docs:
    zoneDIDDocs = await fetchDIDsAndGeometries(zoneAddresses, zoneContract);
    console.log('Zone DID Docs and geometries loaded');

    zoneDIDDocs.map((did) => {
        did.service.map((zone) => {
            turfPolygons.push(turf.polygon(zone.geojson.features[0]));
        });
    });

    // console.log(zoneDIDDocs.map((doc) => {
    //     return doc.service
    // }));

    res.send(zoneDIDDocs)
    })

server.get('/api/getAllPoints', async (req, res) => {
  let antenna = new Antenna.default("http://api.testnet.iotex.one:80");
  let numberOfRegisteredVehicles;
  // Get total number of registered vehicles
  try {
    numberOfRegisteredVehicles = await antenna.iotx.readContractByMethod({
          from: "io1y3cncf05k0wh4jfhp9rl9enpw9c4d9sltedhld",
          abi: VEHICLE_REGISTER_ABI,
          contractAddress: "io1vrxvsyxc9wc6vq29rqrn37ev33p4v2rt00usnx",
          method: "getEveryRegisteredVehicle"
        },
        0);
    numberOfRegisteredVehicles = numberOfRegisteredVehicles.toString('hex');
  } catch (err) {
    console.log(err)
  }

  // Generates a route near LONDON right now ...
  // NEXT up: pull random Terrestrial polygon from the zones and generate a route through that ...
  let sampleRoutes = []
  for (let i = 0; i < numberOfRegisteredVehicles; i++) {
    let route = await generateRandomRoute(turfPolygons[Math.floor(Math.random() * turfPolygons.length)], mapboxtoken)
    sampleRoutes.push(route);
  }

  let samplePts = sampleRoutes.map((line) => line.geometry.coordinates);
  let points = samplePts[0].map((col, i) => samplePts.map(function (row) {return { "coords": row[i]} }));

  res.send(points)
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

if (process.env.NODE_ENV === 'production') {
  // Anything that doesn't match the above, send back index.html
  server.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'))
  })
}

// Example get request to express server
server.use('/', express.static(path.join(__dirname, 'public/home')));
