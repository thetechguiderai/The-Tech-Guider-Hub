import React, { createContext, useContext } from 'react';

export const SiteContext = createContext({ site: null });

export function useSite() {
  return useContext(SiteContext);
}