import React, { useMemo, CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VirtualizedColumn<T> {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedColumn<T>[];
  height: number;
  itemHeight: number;
  loading?: boolean;
  loadingRows?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  emptyMessage?: string;
  sortKey?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (key: string) => void;
}

export function VirtualizedTable<T>({
  data,
  columns,
  height,
  itemHeight,
  loading = false,
  loadingRows = 5,
  onLoadMore,
  hasMore = false,
  className = "",
  emptyMessage = "데이터가 없습니다.",
  sortKey = null,
  sortDirection = null,
  onSort,
}: VirtualizedTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // 로딩 스켈레톤을 포함한 전체 아이템 수
  const totalItems = useMemo(() => {
    const baseCount = data.length;
    if (loading && loadingRows > 0) {
      return baseCount + loadingRows;
    }
    return baseCount;
  }, [data.length, loading, loadingRows]);

  const virtualizer = useVirtualizer({
    count: totalItems,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length
    ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

  // 무한 스크롤 트리거
  React.useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    
    if (!lastItem || !hasMore || loading) return;
    
    if (lastItem.index >= data.length - 1 && onLoadMore) {
      onLoadMore();
    }
  }, [virtualizer.getVirtualItems(), data.length, hasMore, loading, onLoadMore]);

  const renderRow = (index: number, style: CSSProperties) => {
    const isLoadingRow = loading && index >= data.length;
    
    if (isLoadingRow) {
      return (
        <TableRow key={`loading-${index}`} style={style} className="border-b">
          {columns.map((column, colIndex) => (
            <TableCell 
              key={colIndex} 
              className={column.className}
              style={{ 
                minWidth: column.minWidth,
                padding: '0.75rem 1rem',
              }}
            >
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      );
    }

    const item = data[index];
    if (!item) return null;

    return (
      <TableRow key={index} style={style} className="border-b hover:bg-muted/50">
        {columns.map((column) => (
          <TableCell 
            key={column.key} 
            className={`${column.className} align-middle`}
            style={{ 
              minWidth: column.minWidth,
              padding: '0.75rem 1rem',
            }}
          >
            <div className="flex items-center min-h-[2rem]">
              {column.render ? column.render(item, index) : (item as any)[column.key]}
            </div>
          </TableCell>
        ))}
      </TableRow>
    );
  };

  if (!loading && data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-md overflow-x-auto ${className}`}>
      <div 
        ref={parentRef}
        className="relative overflow-auto touch-scroll"
        style={{ height }}
      >
        <Table className="w-full table-fixed min-w-[800px]">
          <TableHeader className="sticky top-0 bg-background z-10 border-b">
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={`${column.className} whitespace-nowrap bg-background`}
                  style={{ 
                    width: column.width, 
                    minWidth: column.minWidth 
                  }}
                >
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => onSort(column.key)}
                    >
                      <span>{column.title}</span>
                      {sortKey === column.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  ) : (
                    column.title
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0" style={{ height: paddingTop }} />
              </TableRow>
            )}
            {virtualizer.getVirtualItems().map((virtualRow) => 
              renderRow(virtualRow.index, { height: itemHeight })
            )}
            {paddingBottom > 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0" style={{ height: paddingBottom }} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default VirtualizedTable;