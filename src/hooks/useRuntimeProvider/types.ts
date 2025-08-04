import type { Tagged } from 'type-fest';

export type ComponentId = Tagged<string, 'ComponentId'>;
export type ParentId = Tagged<string, 'ParentId'>;
export type RuntimeKey = symbol;
export type RuntimeId = Tagged<string, 'RuntimeId'>;

export type ComponentMeta = {
  name: string;
};
