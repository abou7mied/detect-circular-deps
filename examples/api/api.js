const detect = require('../../index');

detect.circular({
  callback(err, results) {
    console.log('results', results);
  },
});

const myModule = require('../always-empty/a');
