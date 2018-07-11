const detector = require('./lib/index');

const { start, filters } = detector;

function problems({ callback }) {
  start({
    filter: filters.PROBLEMS,
    errCallback: callback,
  });
}

function circular({ callback }) {
  start({
    errCallback: callback,
  });
}

function alwaysEmptyExports({ callback }) {
  start({
    filter: filters.ALWAYS_EMPTY,
    errCallback: callback,
  });
}

function emptySyncAccess({ callback }) {
  start({
    filter: filters.SYNC_EMPTY,
    errCallback: callback,
  });
}

function missingProperties({ callback }) {
  start({
    filter: filters.MISSING_PROPERTIES,
    errCallback: callback,
  });
}

module.exports = {
  problems,
  circular,
  alwaysEmptyExports,
  emptySyncAccess,
  missingProperties,
};
