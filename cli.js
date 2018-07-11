#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const detector = require('./lib/index');
require('colors');

const logger = console.log;
const { filters, start } = detector;

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
  console.log = console.error = console.info = console.debug = console.warn = console.trace
    = console.dir = console.dirxml = console.group = console.groupEnd = console.time
    = console.timeEnd = console.assert = console.profile = () => undefined;
  process.stderr.write = () => undefined;
}

program
  .version('0.1.1')
  .arguments('<file...>')
  .option('-p, --problems', 'Report CD. that causing problems (Default)')
  .option('-c, --circular', 'Report all Circular Dependencies.')
  .option('-e, --always-empty-exports', 'Report CD. which its exports are always empty even when it\'s async-accessed after requiring (Causes Problems)')
  .option('-s, --empty-sync-access', 'Report CD. which its exports are empty only when it is sync-accessed after requiring. (May causes problems in future)')
  .option('-m, --missing-properties', 'Report CD. which some of the properties of its exports was sync-accessed after requiring but not found (Causes Problems)');

program.parse(process.argv);

if (program.args.length) {
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
  for (let i = 0; i < program.args.length; i++) {
    const modulePath = program.args[i];
    logger(`Start detecting entrypoint: ${modulePath.green}`);
    require(path.resolve(modulePath));
  }
}
