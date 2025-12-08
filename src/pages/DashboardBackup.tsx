import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, Download, AlertTriangle, CheckCircle2, FileJson } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";

const TABLE_LIST = [
    { name: 'profiles', label: '사용자 프로필' },
    { name: 'surveys', label: '설문 정보' },
    { name: 'survey_responses', label: '설문 응답 (익명)' },
    { name: 'question_answers', label: '상세 답변' },
    { name: 'courses', label: '강의 과목' },
    { name: 'instructors', label: '강사 정보' },
    { name: 'programs', label: '교육 과정' },
];

export default function DashboardBackup() {
    const [loading, setLoading] = useState<string | null>(null);
    const { toast } = useToast();

    const handleBackup = async (tableName: string, label: string) => {
        try {
            setLoading(tableName);

            // Fetch all data from the table
            const { data, error } = await supabase
                .from(tableName as any)
                .select('*');

            if (error) throw error;

            if (!data || data.length === 0) {
                toast({
                    title: "데이터 없음",
                    description: `${label} 테이블에 저장된 데이터가 없습니다.`,
                    variant: "default",
                });
                return;
            }

            // Create JSON file
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `backup_${tableName}_${date}.json`;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "백업 완료",
                description: `${label} 데이터가 성공적으로 다운로드되었습니다.`,
            });

        } catch (error: any) {
            console.error('Backup error:', error);
            toast({
                title: "백업 실패",
                description: error.message || "데이터를 가져오는 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <DashboardLayout title="데이터 백업" description="주요 데이터를 JSON 형식으로 내보냅니다.">
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">데이터 백업</h1>
                    <p className="text-muted-foreground mt-2">
                        시스템의 주요 데이터를 JSON 형식으로 안전하게 백업(내보내기)할 수 있습니다.
                    </p>
                </div>

                <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                    <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-800 dark:text-blue-300 font-semibold">백업 안내</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-400 mt-1">
                        이 기능은 현재 시점의 데이터를 <strong>JSON 파일</strong>로 다운로드합니다.
                        정기적으로 백업 파일을 다운로드하여 별도의 안전한 저장소(Google Drive, 외장 하드 등)에 보관하시기 바랍니다.
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TABLE_LIST.map((table) => (
                        <Card key={table.name} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    {table.label}
                                    <FileJson className="h-5 w-5 text-muted-foreground" />
                                </CardTitle>
                                <CardDescription className="font-mono text-xs">
                                    {table.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    onClick={() => handleBackup(table.name, table.label)}
                                    disabled={loading !== null}
                                    variant="outline"
                                    className="w-full justify-between group hover:border-primary/50"
                                >
                                    <span className="flex items-center">
                                        {loading === table.name ? (
                                            <Database className="mr-2 h-4 w-4 animate-pulse" />
                                        ) : (
                                            <Download className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                        {loading === table.name ? "다운로드 중..." : "JSON 백업받기"}
                                    </span>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                        전체 복구 (Disaster Recovery)
                    </h2>
                    <Card className="bg-muted/30">
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground mb-4">
                                데이터베이스 전체에 치명적인 문제가 발생했을 경우(예: 모든 데이터가 삭제됨),
                                Supabase 대시보드에서 <strong>Point-in-Time Recovery (PITR)</strong> 기능을 사용해야 합니다.
                            </p>
                            <div className="flex gap-4">
                                <Button variant="secondary" asChild>
                                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                                        Supabase 대시보드 이동
                                    </a>
                                </Button>
                                <Button variant="ghost" asChild>
                                    <a href="https://supabase.com/docs/guides/platform/backups" target="_blank" rel="noopener noreferrer">
                                        복구 가이드 문서 보기
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
