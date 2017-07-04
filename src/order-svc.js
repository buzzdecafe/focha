// @ts-check
const log = require('debug')('focha')
const la = require('lazy-ass')
const is = require('check-more-types')
const join = require('path').join
const req = require('request');
const {
  existsSync: exists,
  unlinkSync: rm,
  readFileSync: read,
  writeFileSync: write,
  mkdirSync: md
 } = require('fs')

// big assumption that cwd == project name
const projId = process.cwd();

const stringify = what => JSON.stringify(what, null, 2) + '\n\n'

/*
function saveFailedTests ({tests, version}) {
  la(is.array(tests), 'expected a list of suites', tests)
  const json = stringify({tests, version})

  if (!exists(saveFolder)) {
    log('created output folder %s', saveFolder)
    md(saveFolder)
  }
  write(filename, json, 'utf8')
  log('saved failed tests to file', filename)
  return filename
}
*/
const mkReq = (url, body) => ({
  json: true,
  url: url,
  body: body
});

const srv = 'http://localhost:5000/';

function saveFailedTests(ts) {
  const projId = process.cwd();
  const reqOpts = mkReq(srv + projId, ts);

  return new Promise((resolve, reject) => {
    // are we POST-ing or PUT-ing?
    req.head(srv + projId, (err, resp, body) => {
      if (err) { 
        console.error('something went wrong', err);
        reject(err);
      } else if (resp.statusCode === 200) {
        // it exists; we are PUT-ing
        req.put(reqOpts, (error, response, bdy) => {
          if (error) {
            console.error('Failed to PUT', err);
            reject(err);
          } else {
            resolve(reqOpts.url);
          }
        });
      } else {
        // it does not exist; we are POST-ing
        req.post(reqOpts, (error, response, bdy) => {
          if (error) {
            console.error('Failed to PUT', err);
            reject(err);
          } else {
            resolve(reqOpts.url);
          }
        });
      }
    });
  });

}

function clearSavedOrder () {
  // DEL request
  return new Promise((resolve, reject) => {
    req.delete(srv + projId, (err, resp, body) => {
      if (err) {
        reject(err);
      } else {
        log('tests have passed, deleted the current random order')
        resolve(resp);
      }
    });
  });
}

function loadOrder () {
  return new Promise((resolve, reject) => {
    req.get(srv + projId, (err, resp, body) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }
    });
  });
}

module.exports = {
  save: saveFailedTests,
  clear: clearSavedOrder,
  load: loadOrder
}
