import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Home } from 'lucide-react';

const SurveyComplete = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-lg border-0 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <CardContent className="pt-10 pb-10 px-8 text-center space-y-8">

                    {/* Logo / Branding Area */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative z-10">
                                <div className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent tracking-tight">
                                    SS/BS
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                                    Education
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Success Animation */}
                    <div className="flex justify-center animate-in zoom-in-50 duration-500 fade-in">
                        <div className="rounded-full bg-green-100 p-3 ring-8 ring-green-50">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-2xl font-bold text-slate-900">설문이 완료되었습니다</h1>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            소중한 의견을 보내주셔서 감사합니다.<br />
                            여러분의 피드백은 더 나은 교육 과정을 만드는 데 큰 도움이 됩니다.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button
                            className="w-full h-11 text-base font-medium shadow-md transition-transform hover:scale-[1.02]"
                            onClick={() => navigate('/')}
                        >
                            <Home className="w-4 h-4 mr-2" />
                            홈으로 돌아가기
                        </Button>
                    </div>

                    <div className="text-xs text-slate-400 pt-8">
                        © SS/BS Education Feedback System
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SurveyComplete;
