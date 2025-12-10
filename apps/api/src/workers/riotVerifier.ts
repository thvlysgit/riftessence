// Worker skeleton for periodic re-checking of Riot verification status.
// This file lazily requires BullMQ so the rest of the app can import it without needing the package.
export function createRiotVerifierWorker(queueName = 'riot-verifier') {
  let Worker: any;
  try {
    // require lazily so environments without bullmq don't break import-time
    ({ Worker } = require('bullmq'));
  } catch (err) {
    console.warn('BullMQ not installed; riot verifier worker not started');
    return null;
  }

  const worker = new Worker(queueName, async (job: any) => {
    // job.data should include { riotAccountId }
    const { riotAccountId } = job.data;
    // TODO: fetch account, call Riot API, and update verified flag if necessary
    console.log('Processing verification check for', riotAccountId);
  });

  return worker;
}
