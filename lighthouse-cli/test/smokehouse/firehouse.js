/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Smoke test runner for non-Node environments. Supports skipping and modifiying
 * expectations to match the environment.
 */

/* eslint-disable no-console */

const log = require('lighthouse-logger');
const { collateResults, report } = require('./smokehouse-report.js');

/** @type {Smokehouse.Test[]} */
// @ts-ignore
const smokeTests = require('./smoke-test-dfns-compiled.json');

// function shouldSkip(test, expectation) {
//   if (expectation.lhr.requestedUrl.includes('infinite-loop')) {
//     return 'Can\'t open DevTools when main thread is busy.';
//   }

//   return false;
// }

// function modify(test, expectation) {
//   if (expectation.lhr.requestedUrl === 'http://localhost:10200/dobetterweb/dbw_tester.html') {
//     // Audits panel doesn't connect to the page before a favicon.ico request is mades and fails,
//     // so remove one error from the expected error log.
//     // TODO: give the fixture server an actual favicon so we can ignore this edge case.
//     expectation.lhr.audits['errors-in-console'].details.items.length -= 1;
//   }

//   // Audits and artifacts don't survive the error case in DevTools.
//   // What remains is asserting that lhr.runtimeError is the expected error code.
//   if (test.id === 'errors') {
//     expectation.lhr.audits = {};
//     delete expectation.artifacts;
//   }
// }

/**
 * @param {Smokehouse.RunnerOptions} options
 */
async function runSmokes(options) {
  const {runLighthouse, filter, skip, modify} = options;

  let passingCount = 0;
  let failingCount = 0;

  for (const test of smokeTests) {
    for (const expected of test.expectations) {
      if (filter && !expected.lhr.requestedUrl.match(filter)) {
        continue;
      }

      console.log(`====== ${expected.lhr.requestedUrl} ======`);
      const reasonToSkip = skip && skip(test, expected);
      if (reasonToSkip) {
        console.log(`skipping: ${reasonToSkip}`);
        continue;
      }

      modify && modify(test, expected);
      const results = await runLighthouse(expected.lhr.requestedUrl, test.config);
      console.log(`Asserting expected results match those found. (${expected.lhr.requestedUrl})`);
      const collated = collateResults(results, expected);
      const counts = report(collated);
      passingCount += counts.passed;
      failingCount += counts.failed;
    }
  }

  if (passingCount) {
    console.log(log.greenify(`${passingCount} passing`));
  }
  if (failingCount) {
    console.log(log.redify(`${failingCount} failing`));
  }

  return {
    success: passingCount > 0 && failingCount === 0,
    passingCount,
    failingCount,
  };
}

module.exports = {
  runSmokes,
};
