/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';

const PanelNavContext = createContext({
  itemsNav: [],
  onNavChange: null,
  setPanelNav: () => {},
});

export function PanelNavProvider({ children }) {
  const [itemsNav, setItemsNav] = useState([]);
  const [onNavChange, setOnNavChange] = useState(null);

  const setPanelNav = useCallback((config) => {
    setItemsNav(config?.itemsNav || []);
    setOnNavChange(() => config?.onNavChange || null);
  }, []);

  const value = { itemsNav, onNavChange, setPanelNav };
  return <PanelNavContext.Provider value={value}>{children}</PanelNavContext.Provider>;
}

export function usePanelNav() {
  return useContext(PanelNavContext);
}
