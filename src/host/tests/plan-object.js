import test from 'ava';

import * as planObject from '../plan-object.js';

test('planObject', t => {
  t.plan(13);
  const plan0 = planObject.blankTestPlan();
  t.snapshot(plan0);
  t.snapshot(planObject.setServerOptionsInTestPlan(plan0, {}));
  t.throws(() => planObject.setServerOptionsInTestPlan(plan0, { notAnOption: true }));
  t.snapshot(
    planObject.setServerOptionsInTestPlan(plan0, {
      baseUrl: { protocol: 'http', hostname: 'host', port: 1234, pathname: '/path' },
    })
  );

  const plan1 = planObject.addFileToTestPlan(plan0, {
    name: 'test-something.json',
    bufferData: new Uint8Array(16),
  });
  t.snapshot(plan1);
  t.throws(() => planObject.addTestToTestPlan(plan0, 'test-something.json'));

  const plan2 = planObject.addTestToTestPlan(plan1, 'test-something.json');
  t.snapshot(plan2);

  const plan3 = planObject.addLogToTestPlan(plan1, { text: 'log' });
  t.snapshot(plan3);
  const plan4 = planObject.addLogToTestPlan(plan2, { text: 'log' });
  t.snapshot(plan4);
  t.throws(() => planObject.addTestLogToTestPlan(plan1, { filepath: 'test-something.json' }));
  t.snapshot(planObject.addTestLogToTestPlan(plan4, { filepath: 'test-something.json' }));
  t.throws(() => planObject.addTestResultToTestPlan(plan1, 'test-something.json', { pass: true }));
  t.snapshot(planObject.addTestResultToTestPlan(plan2, 'test-something.json', { pass: true }));
});
