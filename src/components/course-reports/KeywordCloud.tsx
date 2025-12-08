import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, TrendingUp, AlertTriangle, Lightbulb, BarChart3 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

interface KeywordCloudProps {
  textualResponses: string[];
}

export const KeywordCloud = ({ textualResponses }: KeywordCloudProps) => {
  if (!textualResponses || !Array.isArray(textualResponses) || textualResponses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            키워드 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            분석할 텍스트 응답이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // 긍정/부정 키워드 분류
  const positiveWords = ['좋다', '훌륭하다', '만족', '유익', '도움', '최고', '우수', '완벽', '감사', '인상적', '뛰어나다'];
  const negativeWords = ['아쉽다', '부족', '어려움', '문제', '개선', '불편', '힘들다', '아쉬움', '미흡', '부족'];
  const neutralWords = ['시간', '내용', '강의', '실습', '교육', '과정', '방법', '자료', '설명'];

  const extractKeywords = (responses: string[]) => {
    const allText = responses.join(' ').toLowerCase();
    const words = allText.match(/[가-힣]{2,}/g) || [];
    const wordCount = new Map();
    
    const stopWords = ['있는', '같은', '대한', '하는', '되는', '이런', '저런', '그런', '많은', '좋은', '나쁜', '그것', '이것', '저것'];
    
    words.forEach((word: string) => {
      if (!stopWords.includes(word) && word && word.length >= 2) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word, count]) => ({
        word,
        count,
        category: getKeywordCategory(word, positiveWords, negativeWords, neutralWords)
      }));
  };

  const getKeywordCategory = (word: string, positive: string[], negative: string[], neutral: string[]) => {
    if (positive.some(p => word.includes(p))) return 'positive';
    if (negative.some(n => word.includes(n))) return 'negative';
    if (neutral.some(n => word.includes(n))) return 'neutral';
    return 'neutral';
  };

  const getTopComments = (responses: string[]) => {
    return responses
      .filter(response => response.length > 10)
      .map(comment => ({
        text: comment,
        category: analyzeCommentSentiment(comment),
        priority: comment.length // 길이로 우선순위 결정 (실제로는 더 정교한 알고리즘 필요)
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20);
  };

  const analyzeCommentSentiment = (comment: string) => {
    const positiveWords = ['좋다', '만족', '훌륭', '우수', '감사'];
    const negativeWords = ['아쉽', '부족', '개선', '문제', '어려움'];
    
    const positiveCount = positiveWords.filter(word => comment.includes(word)).length;
    const negativeCount = negativeWords.filter(word => comment.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  const keywords = extractKeywords(textualResponses);
  const topComments = getTopComments(textualResponses);

  const getFontSize = (count: number, maxCount: number) => {
    const minSize = 12;
    const maxSize = 20;
    return minSize + (count / maxCount) * (maxSize - minSize);
  };

  const maxCount = keywords[0]?.count || 1;

  const getKeywordColor = (category: string) => {
    switch (category) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'positive': return <TrendingUp className="h-3 w-3" />;
      case 'negative': return <AlertTriangle className="h-3 w-3" />;
      default: return <Lightbulb className="h-3 w-3" />;
    }
  };

  const positiveKeywords = keywords.filter(k => k.category === 'positive');
  const negativeKeywords = keywords.filter(k => k.category === 'negative');
  const neutralKeywords = keywords.filter(k => k.category === 'neutral');

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 강화 */}
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 border-l-4 border-purple-500">
        <h2 className="text-xl font-bold text-purple-700 mb-2 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          키워드 & 의견 분석
        </h2>
        <p className="text-muted-foreground">
          응답자들의 의견을 키워드별로 분류하고 감정 분석을 제공합니다
        </p>
      </div>

      {/* 카테고리별 키워드 분석 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 긍정 키워드 */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              긍정 키워드 ({positiveKeywords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {positiveKeywords.slice(0, 20).map(({ word, count }, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="bg-green-100 text-green-800 hover:bg-green-200"
                >
                  {word} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 개선 관련 키워드 */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              개선 관련 ({negativeKeywords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {negativeKeywords.slice(0, 20).map(({ word, count }, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                >
                  {word} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 중립 키워드 */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Lightbulb className="h-5 w-5" />
              일반 키워드 ({neutralKeywords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {neutralKeywords.slice(0, 20).map(({ word, count }, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  {word} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 의견 분석 - Accordion으로 접이식 */}
      <Card>
        <CardHeader>
          <CardTitle>상세 의견 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="detailed-comments">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  주요 개선 의견 및 제안사항 ({topComments.length}개)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {topComments.length > 0 ? (
                  <div className="space-y-4 mt-4">
                    {topComments.map((comment, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        comment.category === 'positive' 
                          ? 'bg-green-50 border-green-400' 
                          : comment.category === 'negative' 
                          ? 'bg-orange-50 border-orange-400'
                          : 'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            comment.category === 'positive' 
                              ? 'bg-green-500 text-white' 
                              : comment.category === 'negative' 
                              ? 'bg-orange-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getCategoryIcon(comment.category)}
                              <span className={`text-xs font-medium ${
                                comment.category === 'positive' 
                                  ? 'text-green-700' 
                                  : comment.category === 'negative' 
                                  ? 'text-orange-700'
                                  : 'text-blue-700'
                              }`}>
                                {comment.category === 'positive' ? '긍정 의견' : comment.category === 'negative' ? '개선 제안' : '일반 의견'}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-gray-700">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    표시할 상세 의견이 없습니다.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="keyword-summary">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  전체 키워드 클라우드
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-3 justify-center p-6 mt-4 bg-muted/30 rounded-lg">
                  {keywords.map(({ word, count, category }, index) => (
                    <span
                      key={index}
                      className={`inline-block px-3 py-1 rounded-full transition-all hover:scale-105 cursor-default border ${getKeywordColor(category)}`}
                      style={{
                        fontSize: `${getFontSize(count, maxCount)}px`,
                        fontWeight: count > maxCount * 0.7 ? 'bold' : 'normal'
                      }}
                    >
                      {word}
                      <span className="text-xs ml-1 opacity-70">({count})</span>
                    </span>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};