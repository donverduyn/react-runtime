import * as React from 'react';
import type { DryRunContextObject } from '../factories/DryRunContextObject';

export const DryRunContext = React.createContext<DryRunContextObject | null>(
  null
);

export const useDryRunContext = () => {
  const context = React.useContext(DryRunContext);
  return context;
};
