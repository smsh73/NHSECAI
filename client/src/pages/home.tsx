import { memo, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useQuery } from '@tanstack/react-query';

// Import new modular components
import { HeroSection } from '@/components/common/hero-section';
import { PrimaryActions } from '@/components/common/primary-actions';
import { RecentAnalysis } from '@/components/common/recent-analysis';
import { NewsAlerts } from '@/components/common/news-alerts';
import { AIChatInterface } from '@/components/chat/ai-chat-interface';

const Home = memo(function Home() {
  const { user } = useAuth();

  // =====================================
  // API QUERIES - Keep existing logic
  // =====================================
  

  // 최신 시장 분석 조회
  const { data: marketAnalysis, isLoading: marketAnalysisLoading } = useQuery<any[]>({
    queryKey: ['/api/market-analysis'],
    refetchInterval: 15000,
  });

  // 최신 뉴스 데이터 조회
  const { data: recentNews, isLoading: recentNewsLoading } = useQuery<any[]>({
    queryKey: ['/api/news-data'],
    refetchInterval: 20000,
  });


  // =====================================
  // MAIN COMPONENT RENDER
  // =====================================
  
  return (
    <section 
      className="min-h-screen bg-background"
      data-testid="home-page"
      aria-label="NHQV AI 시황생성 플랫폼 홈 대시보드"
    >
      {/* 스크린 리더 지원 완성 */}
      <div className="sr-only">
        <h1>NHQV AI 시황생성 플랫폼 홈페이지</h1>
        <p>이 페이지는 AI 기반 금융 분석 플랫폼의 메인 대시보드입니다. 실시간 KPI, 주요 기능, 최신 분석 결과를 확인할 수 있습니다.</p>
      </div>

      {/* ARIA live regions for dynamic content */}
      <div id="screen-reader-announcements" aria-live="polite" aria-atomic="true" className="sr-only">
        {(marketAnalysisLoading || recentNewsLoading) && "데이터를 불러오는 중입니다..."}
      </div>
      
      <div id="system-alerts" aria-live="assertive" aria-atomic="true" className="sr-only">
        {/* 시스템 알림이 여기에 표시됩니다 */}
      </div>
      
      {/* AI Chat Interface - 최상단 배치 */}
      <AIChatInterface className="mb-8" />
      
      {/* 1. Hero Section - Branding + Core CTA */}
      <HeroSection />


      {/* 4. Primary Actions - 3-6 Main Feature Cards */}
      <PrimaryActions />

      {/* 5. Recent Analysis - Latest 5 Analysis + View All */}
      <RecentAnalysis
        marketAnalysis={marketAnalysis}
        isLoading={marketAnalysisLoading}
        maxItems={5}
      />

      {/* 6. News & Alerts - Real-time News/Alerts */}
      <NewsAlerts
        recentNews={recentNews}
        isLoading={recentNewsLoading}
        maxItems={6}
      />

    </section>
  );
});

// 성능 최적화를 위한 컴포넌트 내보내기
Home.displayName = 'Home';
export default Home;