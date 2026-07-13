import { createContext, useCallback, useContext, useRef, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef(null);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const showToast = useCallback((message) => {
    clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const openNewRequest = useCallback(() => setNewRequestOpen(true), []);
  const closeNewRequest = useCallback(() => setNewRequestOpen(false), []);
  const openDetail = useCallback((id) => setDetailId(id), []);
  const closeDetail = useCallback(() => setDetailId(null), []);

  return (
    <UIContext.Provider
      value={{
        toast,
        showToast,
        newRequestOpen,
        openNewRequest,
        closeNewRequest,
        detailId,
        openDetail,
        closeDetail,
        refreshKey,
        bumpRefresh
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}
