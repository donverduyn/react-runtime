import { Context } from 'effect';

// eslint-disable-next-line prettier/prettier
export class Store extends Context.Tag(
  'App/Store'
)<Store, Record<string, unknown>>() {}
