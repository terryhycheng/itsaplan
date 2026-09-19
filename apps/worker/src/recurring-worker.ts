import { intEnv } from './env';
import { startPollLoop, type WorkerHandle } from './poll-loop';
import { enqueueDueRecurringIssues } from './recurring-schedules';

export function startRecurringWorker(): WorkerHandle {
  return startPollLoop('recurring-worker', enqueueDueRecurringIssues, () =>
    intEnv('RECURRING_ISSUE_SCHEDULE_POLL_INTERVAL_MS', 5000),
  );
}
