import { observable } from 'mobx';

export const createStore = () => {
  const store = observable.map<string, string>();
  store.set('message', 'Hello, world!');
  return store;
};
