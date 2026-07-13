import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const OrganisationContext = createContext(null);

export function OrganisationProvider({ children }) {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);

  const refresh = useCallback(() => {
    if (!user) return;
    api.get('/organisation').then((data) => setOrg(data.organisation));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <OrganisationContext.Provider value={{ orgName: org?.name || '', leaveYearStartMonth: org?.leaveYearStartMonth, setOrgLocal: setOrg, refresh }}>
      {children}
    </OrganisationContext.Provider>
  );
}

export function useOrganisation() {
  return useContext(OrganisationContext);
}
