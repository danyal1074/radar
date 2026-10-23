import { getServiceStore, estimationConfig } from '../lib/db/index.ts';
import { activeSources, activeEstimator } from '../lib/jobs/default.ts';
import { runPipeline } from '../lib/jobs/pipeline.ts';

async function test() {
  console.log('Starting manual pipeline execution...');
  const store = await getServiceStore();
  const summary = await runPipeline(store, {
    sources: activeSources(),
    estimator: activeEstimator(),
    estimationConfig: estimationConfig(),
  });
  console.log('Pipeline finished:', JSON.stringify(summary, null, 2));
}

test().catch(e => console.error('Pipeline error:', e));
