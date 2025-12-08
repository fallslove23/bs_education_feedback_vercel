import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: PaginationState;
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setPageSize: (size: number) => void;
  refresh: () => Promise<void>;
}

export interface ServerPaginationParams {
  page: number;
  pageSize: number;
  [key: string]: any;
}

export interface ServerPaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useServerPagination<T>(
  fetchFn: (params: ServerPaginationParams) => Promise<ServerPaginationResponse<T>>,
  initialPageSize: number = 20,
  deps: any[] = []
): PaginationResult<T> {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
  });
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (params?: Partial<ServerPaginationParams>) => {
    try {
      setLoading(true);
      setError(null);
      
      const finalParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...params,
      };

      const response = await fetchFn(finalParams);
      
      setData(response.data);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pagination.page, pagination.pageSize, ...deps]);

  const goToPage = useCallback(async (page: number) => {
    const newPage = Math.max(1, Math.min(page, pagination.totalPages || 1));
    setPagination(prev => ({ ...prev, page: newPage }));
    await fetchData({ page: newPage, pageSize: pagination.pageSize });
  }, [fetchData, pagination.totalPages, pagination.pageSize]);

  const goToNextPage = useCallback(() => {
    goToPage(pagination.page + 1);
  }, [goToPage, pagination.page]);

  const goToPreviousPage = useCallback(() => {
    goToPage(pagination.page - 1);
  }, [goToPage, pagination.page]);

  const setPageSize = useCallback(async (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
    await fetchData({ page: 1, pageSize });
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(), [fetchData]);

  const hasNextPage = useMemo(() => pagination.page < pagination.totalPages, [pagination.page, pagination.totalPages]);
  const hasPreviousPage = useMemo(() => pagination.page > 1, [pagination.page]);

  return {
    data,
    pagination,
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize,
    refresh,
  };
}