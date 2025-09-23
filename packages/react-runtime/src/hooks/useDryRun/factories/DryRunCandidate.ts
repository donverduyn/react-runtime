// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Tagged } from 'type-fest';
import { v4 as uuid } from 'uuid';
import type {
  DeclarationId,
  ProviderId,
  RegisterId,
  ResolvedProviderEntry,
  RuntimeContext,
} from '@/types';
import type { EdgeDataFields } from '@/utils/hash';

export type DryRunCandidateId = Tagged<string, 'DryRunCandidate'>;

export type DryRunCandidateBase = {
  id: DryRunCandidateId;
  depth: number;
  self: EdgeDataFields;
  firstDescendent: EdgeDataFields | null;
};

export type DryRunCandidateDto = DryRunCandidateBase & {
  ancestors: RegisterId[];
};

export type DryRunCandidate = DryRunCandidateBase & {
  ancestors: DryRunCandidateAncestor[];
};

export type DryRunCandidateAncestor = {
  id: RegisterId;
  declId: DeclarationId;
  props: Record<string, unknown>;
  upstreamModules: Map<ProviderId, Set<RuntimeContext<any>>>;
  localProviders: ResolvedProviderEntry<any, any, unknown>[];
};

export const createDryRunCandidateDto = (
  self: EdgeDataFields,
  firstDescendent: EdgeDataFields | null,
  depth: number,
  ancestors: RegisterId[]
): DryRunCandidateDto => ({
  id: uuid() as DryRunCandidateId,
  depth,
  self,
  firstDescendent,
  ancestors,
});
