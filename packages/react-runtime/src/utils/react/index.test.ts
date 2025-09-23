import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { isReactNode } from '.';

describe('react.isValidElement', () => {
  it('returns true for a valid React element', () => {
    const element = {
      $$typeof: Symbol.for('react.transitional.element'),
      props: { className: 'test' },
      type: 'div',
    };
    expect(React.isValidElement(element)).toBeTruthy();
  });

  it('returns false for null', () => {
    expect(React.isValidElement(null)).toBeFalsy();
  });

  it('returns false for undefined', () => {
    expect(React.isValidElement(undefined)).toBeFalsy();
  });

  it('returns false for a plain object', () => {
    expect(React.isValidElement({})).toBeFalsy();
  });

  it('returns false for a string', () => {
    expect(React.isValidElement('div')).toBeFalsy();
  });

  it('returns false for a number', () => {
    expect(React.isValidElement(123)).toBeFalsy();
  });

  it('returns false for an object missing $$typeof', () => {
    expect(React.isValidElement({ type: 'div', props: {} })).toBeFalsy();
  });

  it('returns false for an object with wrong $$typeof', () => {
    expect(
      React.isValidElement({
        $$typeof: Symbol('not-react.element'),
        type: 'div',
        props: {},
      })
    ).toBeFalsy();
  });
});

describe('isReactNode', () => {
  it('returns true for a string', () => {
    expect(isReactNode('hello')).toBeTruthy();
  });

  it('returns true for a number', () => {
    expect(isReactNode(42)).toBeTruthy();
  });

  it('returns false for null', () => {
    expect(isReactNode(null)).toBeTruthy();
  });

  it('returns false for undefined', () => {
    expect(isReactNode(undefined)).toBeTruthy();
  });

  it('returns true for a valid React element', () => {
    const element = React.createElement('div', { className: 'test' });
    expect(isReactNode(element)).toBeTruthy();
  });

  it('returns false for a plain object', () => {
    expect(isReactNode({})).toBeFalsy();
  });

  it('returns true for an array of valid React nodes', () => {
    const arr = ['text', 123, React.createElement('span', null, 'child')];
    expect(isReactNode(arr)).toBeTruthy();
  });

  it('returns false for an array containing an invalid node', () => {
    const arr = [
      'text',
      Symbol('foo'),
      React.createElement('span', null, 'child'),
    ];
    expect(isReactNode(arr)).toBeFalsy();
  });

  it('returns false for a function', () => {
    expect(isReactNode(() => {})).toBeFalsy();
  });

  it('returns false for a symbol', () => {
    expect(isReactNode(Symbol('test'))).toBeFalsy();
  });
});
