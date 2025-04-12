import { Context } from 'effect';

// eslint-disable-next-line prettier/prettier
export class Name extends Context.Tag(
  'Child/Name'
)<Name, string>() {}
