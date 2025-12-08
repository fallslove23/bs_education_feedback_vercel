import { useState, useCallback, useEffect, useRef } from 'react';

export interface InfiniteScrollState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  total: number;
}

export interface InfiniteScrollResult<T> extends InfiniteScrollState<T> {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export interface InfiniteScrollParams {
  page: number;
  pageSize: number;
  [key: string]: any;
}

export interface InfiniteScrollResponse<T> {
  data: T[];
  hasMore: boolean;
  total: number;
  page: number;
}

export function useInfiniteScroll<T>(
  fetchFn: (params: InfiniteScrollParams) => Promise<InfiniteScrollResponse<T>>,
  pageSize: number = 20,
  deps: any[] = []
): InfiniteScrollResult<T> {
  const [state, setState] = useState<InfiniteScrollState<T>>({
    data: [],
    loading: false,
    error: null,
    hasMore: true,
    page: 0,
    total: 0,
  });

  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !state.hasMore || state.loading) return;

    fetchingRef.current = true;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const nextPage = state.page + 1;
      const response = await fetchFn({
        page: nextPage,
        pageSize,
      });

      if (!isMounted.current) return;

      setState(prev => ({
        ...prev,
        data: nextPage === 1 ? response.data : [...prev.data, ...response.data],
        page: nextPage,
        hasMore: response.hasMore,
        total: response.total,
        loading: false,
      }));
    } catch (err: any) {
      if (!isMounted.current) return;
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load data',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [fetchFn, pageSize, state.hasMore, state.loading, state.page, ...deps]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, data: [], page: 0, hasMore: true, error: null }));
    await loadMore();
  }, [loadMore]);

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      hasMore: true,
      page: 0,
      total: 0,
    });
  }, []);

  return {
    ...state,
    loadMore,
    refresh,
    reset,
  };
}

export function useInfiniteScrollTrigger(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  loading: boolean
) {
  const observerRef = useRef<IntersectionObserver>();
  const loadingRef = useRef(loading);
  
  loadingRef.current = loading;

  const lastElementRef = useCallback((node: Element | null) => {
    if (loadingRef.current) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    if (!node || !hasMore) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(node);
  }, [loadMore, hasMore]);

  return lastElementRef;
}