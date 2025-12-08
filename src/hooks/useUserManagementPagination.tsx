import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  instructor_id?: string;
  first_login: boolean;
  created_at: string;
  updated_at: string;
}

export interface Instructor {
  id: string;
  name: string;
  email?: string;
  photo_url?: string;
}

export interface UserManagementFilters {
  searchQuery: string;
  roleFilters: string[];
  showFirstLoginOnly: boolean;
}

export interface PaginatedUserData {
  data: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useUserManagementPagination(initialPageSize: number = 20) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<UserManagementFilters>({
    searchQuery: '',
    roleFilters: [],
    showFirstLoginOnly: false,
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: initialPageSize,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First try RPC, fallback to direct query if RPC fails
      let profilesData: UserProfile[] = [];
      
      try {
        const rpcRes = await supabase.rpc('get_all_profiles_for_admin', { 
          requesting_user_id: user?.id || '' 
        });
        
        if (rpcRes.error) {
          console.warn('RPC failed, falling back to direct query:', rpcRes.error);
          throw rpcRes.error;
        }
        
        profilesData = rpcRes.data || [];
      } catch (rpcError) {
        // Fallback: direct query to profiles table
        const { data: directData, error: directError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (directError) throw directError;
        profilesData = directData || [];
      }

      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructors')
        .select('id, name, email, photo_url');

      if (instructorsError) throw instructorsError;

      setUsers(profilesData);
      setInstructors(instructorsData || []);

      await fetchUserRoles();
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchUserRoles = useCallback(async () => {
    try {
      const { data: userRolesData, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error) throw error;

      const rolesByUser: Record<string, string[]> = {};
      userRolesData?.forEach(ur => {
        if (!rolesByUser[ur.user_id]) {
          rolesByUser[ur.user_id] = [];
        }
        rolesByUser[ur.user_id].push(ur.role);
      });

      setUserRoles(rolesByUser);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = filters.searchQuery.toLowerCase();
      const instructor = instructors.find(i => i.id === user.instructor_id);
      const roles = userRoles[user.id] || [];

      const matchesSearch = !filters.searchQuery ||
        user.email?.toLowerCase().includes(searchLower) ||
        instructor?.name.toLowerCase().includes(searchLower) ||
        roles.some(role => role.toLowerCase().includes(searchLower));

      const matchesRole = filters.roleFilters.length === 0 ||
        roles.some(role => filters.roleFilters.includes(role));

      const matchesFirstLogin = !filters.showFirstLoginOnly || user.first_login;

      return matchesSearch && matchesRole && matchesFirstLogin;
    });
  }, [users, instructors, userRoles, filters]);

  const paginatedData = useMemo((): PaginatedUserData => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    return {
      data: paginatedUsers,
      total: filteredUsers.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(filteredUsers.length / pagination.pageSize),
    };
  }, [filteredUsers, pagination]);

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ 
      ...prev, 
      page: Math.max(1, Math.min(page, paginatedData.totalPages)) 
    }));
  }, [paginatedData.totalPages]);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize });
  }, []);

  const updateFilters = useCallback((newFilters: Partial<UserManagementFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  }, []);

  const getUserInstructor = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user?.instructor_id) return null;
    return instructors.find(i => i.id === user.instructor_id);
  }, [users, instructors]);

  return {
    // Data
    users: paginatedData.data,
    allUsers: users,
    instructors,
    userRoles,
    
    // Pagination
    pagination: paginatedData,
    goToPage,
    setPageSize,
    
    // Filters
    filters,
    updateFilters,
    
    // State
    loading,
    error,
    
    // Actions
    fetchUsers,
    fetchUserRoles,
    getUserInstructor,
  };
}