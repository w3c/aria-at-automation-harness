import test from 'ava';

import {
  NVDASettingResponses,
  VOSettingResponses,
  isDesiredSettingResponse,
} from '../driver-test-runner.js';

test('isDesiredSettingResponse', t => {
  // NVDA
  t.true(
    isDesiredSettingResponse('BROwse ModE', NVDASettingResponses.browseMode),
    'handles casing'
  );

  t.true(isDesiredSettingResponse('Browse Mode', NVDASettingResponses.browseMode));

  t.false(isDesiredSettingResponse('Focus Mode', NVDASettingResponses.browseMode));

  t.true(isDesiredSettingResponse('Focus Mode', NVDASettingResponses.focusMode));

  t.false(isDesiredSettingResponse('Browse Mode', NVDASettingResponses.focusMode));

  // Voiceover
  t.true(isDesiredSettingResponse('QUIck NaV ON', VOSettingResponses.quickNavOn), 'handles casing');

  t.true(isDesiredSettingResponse('quick nav on', VOSettingResponses.quickNavOn));

  t.true(isDesiredSettingResponse('All quick nav on', VOSettingResponses.quickNavOn));

  t.false(isDesiredSettingResponse('All quick nav off', VOSettingResponses.quickNavOn));

  t.true(isDesiredSettingResponse('quick nav off', VOSettingResponses.quickNavOff));

  t.true(isDesiredSettingResponse('All quick nav off', VOSettingResponses.quickNavOff));

  t.false(isDesiredSettingResponse('All quick nav on', VOSettingResponses.quickNavOff));

  t.true(
    isDesiredSettingResponse('Single-key quick nav on', VOSettingResponses.singleKeyQuickNavOn)
  );

  t.false(
    isDesiredSettingResponse('Single-key quick nav off', VOSettingResponses.singleKeyQuickNavOn)
  );

  t.true(
    isDesiredSettingResponse('Single-key quick nav off', VOSettingResponses.singleKeyQuickNavOff)
  );

  t.false(
    isDesiredSettingResponse('Single-key quick nav on', VOSettingResponses.singleKeyQuickNavOff)
  );
});
