var axios = require('axios');


/*
returns Promise.all() promise that resolves to an array of geojson objects ...
*/
module.exports = async (didDocsArray) => {

  // create array of promises
  // return Promise.all(promises)

  let promises = [];

  for (let i = 0; i < didDocsArray; i++) {
    // no error handling for now ...
    for (let j = 0; j < didDocsArray; j++) {
      promises.push(axios.get(didDocsArray)[i].service[j]);
    }
    // if there's no serviceEndpoint, return a promise that resolves to
    // a notice that there is none to maintain consistency in indices ... ??
  }

  return Promise.all(promises);

}
