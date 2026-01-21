import { plansFrom } from '../plan-from.js';

export function testPlan(argv) {
  const { log, testsMatch: testPattern, planWorkingdir, planFiles } = argv;
  if (!planFiles || planFiles.length === 0) {
    throw new Error(`'plan-files' argument can not be empty`);
  }

  const planInput = {
    workingdir: planWorkingdir,
    files: planFiles,
  };
  const planOptions = { log, testPattern };

  argv.plans = plansFrom(planInput, planOptions);
}
