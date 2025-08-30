import type { Tagged } from 'type-fest';
import { v4 as uuid } from 'uuid';
import type { DeclarationId } from 'types';
import type { EdgeDataFields } from 'utils/hash';

export type DryRunCandidateId = Tagged<string, 'DryRunCandidate'>;

export type DryRunCandidate = {
  id: DryRunCandidateId;
  depth: number;
  self: EdgeDataFields;
  firstDescendent: EdgeDataFields | null;
  ancestors: DeclarationId[];
};

export const createDryRunCandidate = (
  self: EdgeDataFields,
  firstDescendent: EdgeDataFields | null,
  depth: number,
  ancestors: DeclarationId[]
): DryRunCandidate => ({
  id: uuid() as DryRunCandidateId,
  depth,
  self,
  firstDescendent,
  ancestors,
});
