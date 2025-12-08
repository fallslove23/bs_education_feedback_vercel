import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCumulativeSurveyStats } from '@/hooks/useCumulativeSurveyStats';
import { formatSatisfaction } from '@/utils/satisfaction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, FileSpreadsheet, Calendar, Users, Star, Target } from 'lucide-react';
import VirtualizedTable, { type VirtualizedColumn } from '@/components/data-table/VirtualizedTable';
import type { SurveyCumulativeRow } from '@/repositories/cumulativeStatsRepo';

const getInstructorDisplay = (row: SurveyCumulativeRow) => {
  const names = row.instructor_names ?? [];
  const filtered = names.filter((name): name is string => Boolean(name && name.trim()));

  if (filtered.length === 0) return '미지정';
  if (filtered.length === 1) return filtered[0];
  return `${filtered[0]} 외 ${filtered.length - 1}명`;
};

const getResponseCount = (row: SurveyCumulativeRow, includeTestData: boolean) => {
  if (includeTestData) {
    return row.total_response_count ?? 0;
  }
  return row.real_response_count ?? 0;
};

const getAverageSatisfactionValue = (row: SurveyCumulativeRow, includeTestData: boolean) => {
  if (includeTestData) {
    return row.avg_satisfaction_total ?? null;
  }
  return row.avg_satisfaction_real ?? null;
};

const getStatusLabel = (status: string | null) => {
  if (status === 'completed') return '완료';
  if (status === 'active') return '진행중';
  return '준비중';
};

const CumulativeDataTable = () => {
  const includeTestData = false; // 테스트 데이터 제외
  const [searchParams] = useSearchParams();
  const { instructorId, userRoles } = useAuth();
  
  const currentView = searchParams.get('view');
  const isInstructorView = currentView === 'instructor' && userRoles.includes('instructor');
  const filterInstructorId = isInstructorView ? instructorId : null;
  
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    summary,
    searchTerm,
    setSearchTerm,
    selectedYear,
    setSelectedYear,
    selectedCourse,
    setSelectedCourse,
    availableYears,
    availableCourses,
    loadMore,
    getExportData,
  } = useCumulativeSurveyStats({ 
    includeTestData, 
    instructorId: filterInstructorId,
    pageSize: 50 
  });

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      // 같은 컬럼 클릭: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      // 새 컬럼 클릭: asc로 시작
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortKey) {
        case 'title':
          aValue = a.title ?? '';
          bValue = b.title ?? '';
          break;
        case 'yearRound':
          aValue = (a.education_year ?? 0) * 1000 + (a.education_round ?? 0);
          bValue = (b.education_year ?? 0) * 1000 + (b.education_round ?? 0);
          break;
        case 'course':
          aValue = a.course_name ?? '';
          bValue = b.course_name ?? '';
          break;
        case 'instructor':
          aValue = getInstructorDisplay(a);
          bValue = getInstructorDisplay(b);
          break;
        case 'responses':
          aValue = getResponseCount(a, includeTestData);
          bValue = getResponseCount(b, includeTestData);
          break;
        case 'satisfaction':
          aValue = getAverageSatisfactionValue(a, includeTestData) ?? 0;
          bValue = getAverageSatisfactionValue(b, includeTestData) ?? 0;
          break;
        case 'status':
          aValue = a.status ?? '';
          bValue = b.status ?? '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });
  }, [data, sortKey, sortDirection, includeTestData]);

  const columns = useMemo<VirtualizedColumn<SurveyCumulativeRow>[]>(() => [
    {
      key: 'title',
      title: '설문 제목',
      minWidth: 250,
      sortable: true,
      render: (row) => (
        <span className="line-clamp-2 text-sm">{row.title ?? '-'}</span>
      ),
    },
    {
      key: 'yearRound',
      title: '연도/회차',
      minWidth: 130,
      sortable: true,
      render: (row) => (
        <span className="text-sm whitespace-nowrap">
          {row.education_year && row.education_round
            ? `${row.education_year}년 ${row.education_round}차`
            : '-'}
        </span>
      ),
    },
    {
      key: 'course',
      title: '과정명',
      minWidth: 200,
      sortable: true,
      render: (row) => (
        <span className="line-clamp-2 text-sm">{row.course_name ?? '-'}</span>
      ),
    },
    {
      key: 'instructor',
      title: '담당 강사',
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <span className="text-sm whitespace-nowrap">{getInstructorDisplay(row)}</span>
      ),
    },
    {
      key: 'responses',
      title: '응답 수',
      minWidth: 110,
      sortable: true,
      render: (row) => {
        const count = getResponseCount(row, includeTestData);
        return (
          <Badge variant={count > 0 ? 'default' : 'secondary'} className="whitespace-nowrap">
            {count.toLocaleString()}명
          </Badge>
        );
      },
    },
    {
      key: 'satisfaction',
      title: '평균 만족도',
      minWidth: 120,
      sortable: true,
      render: (row) => {
        const value = getAverageSatisfactionValue(row, includeTestData);
        if (value === null || !Number.isFinite(value)) {
          return <span className="text-muted-foreground">-</span>;
        }

        const safeValue = Number.isFinite(value) && !Number.isNaN(value) ? value : 0;
        const badgeVariant = safeValue >= 8 ? 'default' : safeValue >= 6 ? 'secondary' : 'destructive';
        
        try {
          return <Badge variant={badgeVariant} className="whitespace-nowrap">{formatSatisfaction(safeValue)}</Badge>;
        } catch (error) {
          console.error('Error formatting satisfaction in table:', error, value);
          return <Badge variant="secondary">-</Badge>;
        }
      },
    },
    {
      key: 'status',
      title: '상태',
      minWidth: 100,
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'completed' ? 'default' : 'outline'} className="whitespace-nowrap">
          {getStatusLabel(row.status)}
        </Badge>
      ),
    },
  ], [includeTestData]);

  const handleExport = useCallback(async () => {
    try {
      const rows = await getExportData();
      const headers = [
        '설문 제목',
        '교육 연도',
        '교육 회차',
        '과정명',
        '담당 강사',
        '응답 수',
        '평균 만족도',
        '상태',
        '최근 응답일',
      ];

      const csvRows = rows.map((row) => {
        const count = getResponseCount(row, includeTestData);
        const avg = getAverageSatisfactionValue(row, includeTestData);
        const dateSource = row.last_response_at ?? row.created_at;
        const formattedDate = dateSource ? new Date(dateSource).toLocaleDateString() : '';

        return [
          `"${row.title ?? ''}"`,
          row.education_year ?? '',
          row.education_round ?? '',
          `"${row.course_name ?? ''}"`,
          `"${getInstructorDisplay(row)}"`,
          count,
          avg !== null ? formatSatisfaction(avg) : '',
          `"${getStatusLabel(row.status)}"`,
          `"${formattedDate}"`,
        ].join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `누적데이터_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export cumulative survey data', err);
    }
  }, [getExportData, includeTestData]);

  const averageDisplay = useMemo(() => {
    try {
      return formatSatisfaction(summary.averageSatisfaction, { fallback: '0' });
    } catch (error) {
      console.error('Error formatting satisfaction value:', error, summary.averageSatisfaction);
      return '0';
    }
  }, [summary.averageSatisfaction]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            데이터 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">검색어</label>
              <Input
                placeholder="설문명, 과정명, 강사명 검색..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">연도</label>
              <Select
                value={selectedYear !== null ? String(selectedYear) : 'all'}
                onValueChange={(value) =>
                  setSelectedYear(value === 'all' ? null : Number(value))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="연도 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">과정</label>
              <Select
                value={selectedCourse ?? 'all'}
                onValueChange={(value) =>
                  setSelectedCourse(value === 'all' ? null : value)
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="과정 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {availableCourses.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} variant="outline" className="w-full">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">총 응답 수</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{summary.totalResponses.toLocaleString()}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">평균 만족도</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{averageDisplay}</p>
              </div>
              <Star className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">참여 강사</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{summary.participatingInstructors.toLocaleString()}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">진행 과정</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{summary.coursesInProgress.toLocaleString()}</p>
              </div>
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base lg:text-lg">누적 데이터 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading && data.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm">데이터를 불러오는 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">조건에 맞는 데이터가 없습니다.</div>
          ) : (
            <VirtualizedTable
              data={sortedData}
              columns={columns}
              height={520}
              itemHeight={64}
              loading={loadingMore}
              loadingRows={4}
              onLoadMore={loadMore}
              hasMore={hasMore}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CumulativeDataTable;
