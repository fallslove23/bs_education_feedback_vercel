import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download, Search, Filter } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  data: any[];
  columns: Column[];
  searchable?: boolean;
  exportable?: boolean;
  pageSize?: number;
  onExport?: () => void;
}

export const DataTable = ({ 
  title, 
  data, 
  columns, 
  searchable = true, 
  exportable = true, 
  pageSize = 20,
  onExport 
}: DataTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 필터링 및 검색
  const filteredData = data.filter(row => {
    // 검색 필터
    if (searchTerm) {
      const searchableText = columns
        .map(col => String(row[col.key] || ''))
        .join(' ')
        .toLowerCase();
      if (!searchableText.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    // 컬럼 필터
    for (const [key, value] of Object.entries(filters)) {
      if (value && String(row[key] || '').toLowerCase() !== value.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  // 정렬
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 페이지네이션
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  // 정렬 처리
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // 필터 처리
  const handleFilter = (columnKey: string, value: string) => {
    setFilters({ ...filters, [columnKey]: value === 'all' ? '' : value });
    setCurrentPage(1);
  };

  // 고유 값 가져오기 (필터 옵션용)
  const getUniqueValues = (columnKey: string) => {
    const values = data.map(row => String(row[columnKey] || '')).filter(Boolean);
    return [...new Set(values)].sort();
  };

  return (
    <Card>
      <CardHeader className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {title}
            <Badge variant="secondary" className="text-xs">{filteredData.length}개</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {exportable && (
              <Button variant="outline" size="sm" onClick={onExport} className="text-xs sm:text-sm">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">내보내기</span>
              </Button>
            )}
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="space-y-3 sm:space-y-4">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* 컬럼 필터 */}
          <div className="flex flex-wrap gap-2">
            {columns
              .filter(col => col.filterable)
              .map(col => (
                <Select
                  key={col.key}
                  value={filters[col.key] || 'all'}
                  onValueChange={(value) => handleFilter(col.key, value)}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={`${col.label} 필터`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {getUniqueValues(col.key).map(value => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))
            }
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 테이블 - 모바일에서 horizontal scroll */}
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead
                    key={column.key}
                    className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {column.label}
                      {column.sortable && sortColumn === column.key && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map(column => (
                      <TableCell key={column.key} className="text-sm">
                        {column.render 
                          ? column.render(row[column.key], row)
                          : String(row[column.key] || '-')
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mt-4">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              {startIndex + 1}-{Math.min(startIndex + pageSize, sortedData.length)} / {sortedData.length}개
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium min-w-[60px] sm:min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};