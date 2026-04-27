import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      axios
        .get('/api/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await axios.post('/api/auth/register', data);
    localStorage.setItem('token', res.data.token);
    axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common.Authorization;
    setUser(null);
  };

  const hasRole = useCallback(
    (roleName) => user?.role === roleName || Boolean(user?.roles?.includes(roleName)),
    [user]
  );

  const can = useCallback(
    (permission) => {
      const role = user?.role;
      if (role === 'Admin') return true;
      if (role === 'Supervisor') {
        return [
          'tasks:view_all',
          'tasks:create',
          'tasks:edit',
          'tasks:assign',
          'tasks:complete',
          'tasks:verify',
          'masters:manage',
          'dashboard:team',
          'roles:view',
        ].includes(permission);
      }
      if (role === 'Technician') {
        return [
          'tasks:view_assigned',
          'tasks:edit_own',
          'tasks:complete',
          'dashboard:self',
        ].includes(permission);
      }
      if (role === 'User') {
        return [
          'tasks:view_assigned',
          'tasks:edit_own',
          'tasks:complete',
          'dashboard:self',
        ].includes(permission);
      }
      return false;
    },
    [user]
  );

  const canAny = useCallback(
    (permissions) => {
      if (!permissions?.length) return false;
      return permissions.some((p) => can(p));
    },
    [can]
  );

  /** @deprecated Prefer hasRole('Admin') || can('*') */
  const isAdmin = () => hasRole('Admin') || can('*');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        hasRole,
        can,
        canAny,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
