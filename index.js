#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const Module = require('module');
require('colors');

const paths = {};
const orig = Module._load;
const results = {};
const logger = console.log;

const filters = {
  PROBLEMS: 'problems',
  ALWAYS_EMPTY: 'always-empty',
  SYNC_EMPTY: 'sync-empty',
  MISSING_PROPERTIES: 'missing-properties',
};

function removeExtension(filePath) {
  return filePath.replace('.js', '');
}

function isCircularDep(path, parent) {
  const context = {
    parent,
  };
  while (context.parent) {
    if (removeExtension(context.parent.filename) === path) {
      return true;
    }
    context.parent = context.parent.parent;
  }
}

function report({ relativePath, ...rest }) {
  const { data } = paths[relativePath];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const context = {
      parent: item.parent,
    };

    const current = path.relative(process.cwd(), removeExtension(context.parent.filename));
    const stack = [current];
    while (path.relative(process.cwd(), removeExtension(context.parent.filename)) !== relativePath) {
      context.parent = context.parent.parent;
      if (!context.parent) {
        break;
      }
      const nextPath = path.relative(process.cwd(), removeExtension(context.parent.filename));
      stack.unshift(nextPath);
    }
    results[relativePath] = Object.assign(results[relativePath] || {}, {
      stack,
    }, rest);
  }
}

function isAcceptableExports(data, newExports) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const oldExports = item.moduleExports;
    const oldKeys = item.keys;
    const newKeys = Object.keys(newExports);
    const sameObject = newExports === oldExports;
    const sameProperties = oldKeys.length === newKeys.length && oldKeys.every((v, i) => v === newKeys[i]);
    if (!sameObject) {
      return false;
    }
    if (!sameProperties) {
      return 0;
    }
  }
  return true;
}

function validateProperty({ moduleName, propName, value }) {
  const { completeExports } = paths[moduleName];
  const actual = completeExports[propName];
  const propertyMissing = actual !== value;
  if (propertyMissing) {
    report({
      relativePath: moduleName,
      causingProblems: true,
      missingProperty: {
        name: propName,
        expectedValue: actual,
      },
    });
  }
}

function compare(options) {
  const {
    relativePath,
    parent,
    errCallback,
    moduleExports,
  } = options;
  const filePath = path.resolve(relativePath);
  const item = {
    parent,
    moduleExports,
    keys: Object.keys(moduleExports),
  };
  const circular = isCircularDep(filePath, parent);
  if (!paths[relativePath]) {
    if (circular) {
      paths[relativePath] = { data: [] };
      paths[relativePath].data.push(item);
    }
  } else {
    if (circular) {
      paths[relativePath].data.push(item);
      return;
    }
    paths[relativePath].completeExports = moduleExports;
    const acceptableExports = isAcceptableExports(paths[relativePath].data, moduleExports);

    if (typeof errCallback !== 'function') {
      throw new Error('Parameter errCallback should be function');
    }

    report({
      relativePath,
      exportsNotIdentical: acceptableExports === false,
      hasIncompleteExports: !acceptableExports,
      causingProblems: acceptableExports === false,
    });
  }
}

function check(options) {
  const {
    path: fPath,
    errCallback,
    parent,
  } = options;

  let { apply } = options;
  const relativePath = removeExtension(path.relative(process.cwd(), fPath));

  compare({
    moduleExports: apply,
    relativePath,
    parent,
    errCallback,
  });

  if (isCircularDep(path.resolve(relativePath), parent)) {
    apply = new Proxy(apply, {
      get(target, propName) {
        if (typeof propName === 'string') {
          const value = target[propName];
          process.nextTick(() => {
            validateProperty({
              moduleName: relativePath,
              propName,
              value,
            });
          });
        }
        return target[propName];
      },
    });
  }

  return apply;
}

function start({ filter, errCallback }) {
  Module._load = function (name, parent) {
    let apply = orig.apply(this, arguments);
    const relative = removeExtension(path.relative(process.cwd(), path.resolve(path.dirname(parent.filename), name)));
    if ((name.indexOf('.') === 0 || path.isAbsolute(name))
      && parent.filename.indexOf('node_modules/') === -1) {
      if (errCallback) {
        if (typeof errCallback !== 'function') {
          throw new Error('Parameter errCallback should be function');
        }
        apply = check({
          parent,
          apply,
          path: relative,
          errCallback,
        });
      }
    }
    return apply;
  };
  setImmediate(() => {
    const keys = Object.keys(results);
    const newResults = keys.map(key => Object.assign({ file: key }, results[key]));
    let filterKey;
    switch (filter) {
      case filters.ALWAYS_EMPTY:
        filterKey = 'exportsNotIdentical';
        break;
      case filters.SYNC_EMPTY:
        filterKey = 'hasIncompleteExports';
        break;
      case filters.MISSING_PROPERTIES:
        filterKey = 'missingProperty';
        break;
      case filters.PROBLEMS:
        filterKey = 'causingProblems';
        break;
      default:
        filterKey = null;
        break;
    }
    errCallback(null, filterKey ? newResults.filter(i => i[filterKey]) : newResults);
  });
}

function formatProblem(problem) {
  let str = '✗  '.red;
  const { missingProperty } = problem;
  const modulePath = problem.stack[problem.stack.length - 1];
  if (missingProperty) {
    str += 'Can\'t find a property: ';
    str += missingProperty.name.yellow;
    str += ' at ';
    str += modulePath;
    str += ' (It causes problems)'.red;
  } else if (problem.exportsNotIdentical) {
    str += 'The exports of ';
    str += problem.stack[0];
    str += ' is empty when it is required at ';
    str += modulePath;
    str += ' (It causes problems)'.red;
  } else if (problem.hasIncompleteExports) {
    str += 'The exports of ';
    str += problem.stack[0];
    str += ' is not complete when it is required at ';
    str += modulePath;
    str += ' (It doesn\'t cause problems but maybe in future)'.yellow;
  } else {
    str += 'Circular requiring of ';
    str += problem.stack[0];
  }
  str += '\n    Circular Path: ';
  str += problem.stack.join(' > '.cyan);
  str += '\n';
  return str;
}

function muteConsole() {
  console.log = console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.group = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = () => undefined;
  process.stderr.write = () => undefined;
}

program
  .version('0.1.0')
  .option('-p, --problems', 'Report CD. that causing problems (Default)')
  .option('-c, --circular', 'Report all Circular Dependencies.')
  .option('-e, --always-empty-exports', 'Report CD. which its exports are always empty even when it\'s async-accessed after requiring (Causes Problems)')
  .option('-s, --empty-sync-access', 'Report CD. which its exports are empty only when it is sync-accessed after requiring. (May causes problems in future)')
  .option('-m, --missing-properties', 'Report CD. which some of the properties of its exports was sync-accessed after requiring but not found (Causes Problems)')
  .action((modulePath) => {
    muteConsole();
    let filter = filters.PROBLEMS;
    if (program.circular) {
      filter = null;
    } else if (program.problems) {
      filter = filters.PROBLEMS;
    } else if (program.alwaysEmptyExports) {
      filter = filters.ALWAYS_EMPTY;
    } else if (program.emptySyncAccess) {
      filter = filters.SYNC_EMPTY;
    } else if (program.missingProperties) {
      filter = filters.MISSING_PROPERTIES;
    }
    start({
      filter,
      errCallback: (err, results) => {
        if (!results.length) {
          logger(`${'✓'.green} No Problems for Circular Dependencies found!${filter ? ' [filtered]'.yellow : ''}`);
        }
        for (let i = 0; i < results.length; i++) {
          const item = results[i];
          logger(formatProblem(item));
        }
        process.exit();
      },
    });
    require(path.resolve(modulePath));
  });

program.parse(process.argv);

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
