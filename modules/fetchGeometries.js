var axios = require('axios');


/*
returns Promise.all() promise that resolves to an array of geojson objects ...
*/

module.exports = async (didDocsArray) => {
  // create array of promises
  // return Promise.all(promises)
  let promises = [];

  for (let i = 0; i < didDocsArray.length; i++) {
    // no error handling for now ...
    for (let j = 0; j < didDocsArray[i].service.length; j++) {
      let p = axios.get(didDocsArray[i].service[j].serviceEndpoint)
      promises.push(p);
    }
    // if there's no serviceEndpoint, return a promise that resolves to
    // a notice that there is none to maintain consistency in indices ... ??
  }

  try {
    let responses = await Promise.all(promises);
    return responses.map((res) => { return res.data});

  } catch(err) {
    console.log('error', err)
  }


  // try {
  //
  //   let results =  await Promise.all(promises);
  //   return results;
  //
  // } catch (err) {
  //   throw err;
  // }


}
