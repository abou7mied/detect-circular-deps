# Detect Circular Dependencies


![detect-circular-deps](https://img.shields.io/npm/v/detect-circular-deps.svg?style=flat-square)
![David](https://img.shields.io/david/abou7mied/detect-circular-deps.svg?style=flat-square)
![David](https://img.shields.io/david/dev/abou7mied/detect-circular-deps.svg?style=flat-square)

Detect Circular Dependencies that occurs while requiring a module

Circular Dependencies maybe necessary in some applications and it's not easy to avoid it.

This tools helps you to find Circular Dependencies that cause problems in your application.  

## Installation
```bash
npm i detect-circular-deps -g
```


## What the problems this tool could detect?

### Empty exports

Suppose you have a two modules

**a.js**
```js
const b = require('./b');

module.exports = {
  name: 'a',
};
```
**b.js**
```js
const a = require('./a'); // a is empty {}

module.exports = {
  name: 'b',
};
```
As you can see, when you require **a.js** in **b.js** file it will return empty object and that definitely will cause a problem in your application.

We can name this situation: **alwaysEmptyExports**

You can solve this issue by moving **module.exports** above the **require** statement

**a.solved.js**
```js
module.exports = {
  name: 'a',
};

const b = require('./b.solved');
```
**b.solved.js**
```js
module.exports = {
  name: 'b',
};

const a = require('./a.solved');
```

### Missing Property
Suppose

**a.js**
```js
const b = require('./b');

exports.name = 'a';
```
**b.js**
```js
const a = require('./a');

// console.log(a.name); // = undefined
process.nextTick(() => {
  console.log(a.name); // = a
});

exports.name = 'b';
```

When you use **exports.** instead of **module.exports**, the exports are updated to the dependants but in the next tick.

If you need to detect that situation, we name that **emptySyncAccess**

If your file tried to access a property of another module in a circular dependency situation and could not get it (uncomment the third line of b.js), we name that: **missingProperty** 

# CLI
```
  Usage: detect-circular-deps [options] <file...>

  Options:

    -V, --version               output the version number
    -p, --problems              Report CD. that causing problems (Default)
    -c, --circular              Report all Circular Dependencies.
    -e, --always-empty-exports  Report CD. which its exports are always empty even when it's async-accessed after requiring (Causes Problems)
    -s, --empty-sync-access     Report CD. which its exports are empty only when it is sync-accessed after requiring. (May causes problems in future)
    -m, --missing-properties    Report CD. which some of the properties of its exports was sync-accessed after requiring but not found (Causes Problems)
    -d, --debug                 Print debugging messages
    -h, --help                  output usage information
```

## Examples
Detect problems
```bash
detect-circular-deps examples/always-empty/a.js
```
```
✗  The exports of examples/always-empty/a is empty when it is required at examples/always-empty/b (It causes problems)
    Circular Path: examples/always-empty/a > examples/always-empty/b
```
```bash
detect-circular-deps examples/always-empty/a.solved.js
```
```
✓ No Problems for Circular Dependencies found! [filtered]
```
Detect any circular dependencies even it doesn't cause any problems
```bash
detect-circular-deps examples/always-empty/a.solved.js -c
```
```
✗  Circular requiring of examples/always-empty/a.solved
    Circular Path: examples/always-empty/a.solved > examples/always-empty/b.solved
```

## Support es6 import/export
Now you can run the tool on es6 files,  **babel-register** library is included in the tool but you need to have **.babelrc** file in your working directory or any upper directory.

There are examples of es6 import/export

```bash
detect-circular-deps examples/es6/always-empty/a.js
```
```
Start detecting entrypoint: examples/es6/always-empty/a.js
✗  The exports of examples/es6/always-empty/a is empty when it is required at examples/es6/always-empty/b (It causes problems)
    Circular Path: examples/es6/always-empty/a > examples/es6/always-empty/b
```

### Wildcard matching
This tool uses [glob](https://github.com/isaacs/node-glob) to match files using the patterns the shell uses but u need to qoute the pattern so that your terminal don't override it
An example for running the tool on all files in this directory and sub directories

```bash
detect-circular-deps '*/**/*.js'
```

# API
## Functions
**.problems({callback})**

**.circular({callback})**

**.alwaysEmptyExports({callback})**

**.emptySyncAccess({callback})**

**.missingProperties({callback})**

See **examples/api** for more info


## Limitations
This tool works only with node.js environment as it depends on the built-in node.js **module** package

I aim to make it works with webpack and browser applications.
