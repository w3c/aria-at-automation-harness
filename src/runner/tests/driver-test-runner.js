import test from 'ava';

import { isDesiredSettingResponse } from '../driver-test-runner.js';

test('isDesiredSettingResponse', t => {
  t.true(isDesiredSettingResponse('BROwse ModE', ['Browse mode']), 'handles casing');

  t.true(isDesiredSettingResponse('quick nav on', ['Quick nav on', 'All quick nav on']));

  t.false(isDesiredSettingResponse('quick nav', ['Quick nav on', 'All quick nav on']));
});
