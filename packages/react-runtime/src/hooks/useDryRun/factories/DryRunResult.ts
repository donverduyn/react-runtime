import type { DryRunCandidate } from './DryRunCandidate';

export const createDryRunResult = (options: {
  timestamp?: number;
  candidates: DryRunCandidate[];
}): DryRunResult =>
  Object.assign({}, options, {
    timestamp: options.timestamp || Date.now(),
    // defensive programming to ensure candidates is always an array
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    candidates: options.candidates || [],
  });

type DryRunResult = {
  timestamp: number;
  candidates: DryRunCandidate[];
};
