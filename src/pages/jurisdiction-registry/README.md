See /public/register-zone for HTML / some javascript to implement zone register form. Needs to be converted to react and connected to Arweave and Tezos Zone Registry

## To build registry:

### Create registration interface / form

- Geojson
- Zone name
- Beneficiary address (i.e. who gets paid)
- charge per minute
- currency
- Arweave private key?

### On submit:

- Write GeoJSON files to Arweave. return  `geojsonURL`.
- Build zone DID document. Create object for each zone in `service` array, including `geojsonURL`.
- Write zone DID document to Arweave. return `didDocURL`.
- Register `didDocURL` to Ethereum.
- Register `address` to `registeredAddresses` contract

Ethr-DID Library: https://github.com/uport-project/ethr-did

Info on setting service endpoints (?): https://github.com/uport-project/ethr-did/blob/develop/docs/guides/index.md#set-public-attributes

Ethereum DID resolver: https://github.com/decentralized-identity/ethr-did-resolver#resolving-a-did-document


## RegisteredAddresses contract

Very simple registry of Ethereum addresses. Prototype deployed on Ropsten: [0x771110c20009bfC55d79548D9E0fC523D8DC40B7](https://ropsten.etherscan.io/address/0x771110c20009bfC55d79548D9E0fC523D8DC40B7).

Goal: to fetch an array of registered addresses
  We then loop through the addresses and resolve them to DID docs to eventually pull GeoJSON from service endpoints.

Functions (\*required)

- `constructor` - set `admin = msg.sender`
- \*`register()` - add `msg.sender` address to registry
- \*`fetchAddresses()` - returns all registered addresses
- `deregister(address)` - allows address to deregister itself. (Also could enable `admin` to deregister?)

Variables

- `mapping(address => bool) registeredAddresses` - This could enable users to set their `registeredAddresses[address]` = false.
- `address[] addresses` - every time an address is registered it is appended to this array. This could be public
