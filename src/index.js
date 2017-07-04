const Mocha = require('mocha')
const mocha = new Mocha()
const log = require('debug')('focha')
// verbose output during e2e tests
// const e2e = require('debug')('focha:e2e')
const la = require('lazy-ass')
const is = require('check-more-types')
const chalk = require('chalk')
const {Maybe} = require('ramda-fantasy')
const {is, prop} = require('ramda')
const pluralize = require('pluralize')

const order = require('./order-of-tests')
const cache = require('./order-cache')
la(is.object(cache), 'missing test order object')

const {join} = require('path')
const pkg = require(join(__dirname, '../package.json'))

function getSpecs(options) {
  if (!options.spec) {
    console.error('Missing spec file pattern')
    process.exit(-1)
  }

  const specFilenames = is(String, specFilenames) ? options.spec : [options.spec];
  specFilenames.forEach(sf => mocha.addFile(sf));
  return specFilenames;
}

function focha (options) {
  options = options || {}

  log('starting focha with options')
  log(JSON.stringify(options, null, 2))

  const specFilenames = getSpecs(options);

  const prevFailingTests = options.all ? Promise.resolve([])
    : cache.load().then(
      resp => resp.body.failures,
      err  => {
        if (!options.all) {
          console.log('😃 no previously failing tests found')
          console.log('ℹ️ run all tests using --all flag')
        }
        throw err;
      }
    )
    .then(
        prevFails => {
          if (prevFails.length > 0) {
            mocha.suite.beforeAll(function () {
              la(prevFails, 'missing failing tests')
              log('leaving only failed tests from last run')
              order.leave(prevFails)(mocha.suite)

              // the order might be out of date if any tests
              // were added or deleted, thus
              // always collect the order
              // const testNames = order.collect(mocha.suite)
              // cache.save(testNames)          
            });
          }
        }
        return prevFails;
    })
    .then(fails => {
      var failedTests = [];
      const runner = mocha.run(function (failures) {
        // console.log('mocha run finished')
        // why do we register process.on('exit') here and not
        // control the exit ourselves?
        process.on('exit', function () {
          if (failures === 0) {
            log('there were no failures in this run')
            cache.clear()
            numberOfPreviouslyFailingTests()
              .forEach(n => {
                console.log('🤔 previously %s failed', pluralize('test', n, true))
                console.log('✅ now everything is fine')
              })
          } else {
            if (is.not.empty(failedTests)) {
              console.log('%d failed tests', failedTests.length)
              console.log(failedTests)
              const filename = cache.filename()
              la(is.unemptyString(filename), 'missing save filename')
              cache.save({tests: failedTests, version: pkg.version})
              console.error('Failed tests order saved in', chalk.yellow(filename))
              console.error('If you run Focha again, failed tests will run first')
            } else {
              console.error('Problem: Mocha has finished with an error')
              console.error('but we have no failed tests recorded! 🐞')
            }
          }
          process.exit(failures)
        });

    });
    runner.on('fail', function (test, err) {
      const failed = {
        title: test.title,
        fullTitle: test.fullTitle()
      }
      log('failed test "%s"', failed.fullTitle)
      failedTests.push(failed)
    });

    // TODO: on `end` push or put file to failstore service
  });
}

module.exports = focha
