import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ProtectedRoute } from "@/components/common/protected-route";
import { setupGlobalErrorHandler } from "@/lib/error-logger";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import News from "@/pages/news";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import WorkflowEditor from "@/pages/workflow-editor";
import PromptManagement from "@/pages/prompt-management";
import ApiManagement from "@/pages/api-management";
import PythonManagement from "@/pages/python-management";
import DataSourceManagement from "@/pages/data-source-management";
import LogViewer from "@/pages/log-viewer";
import SchemaBrowser from "@/pages/schema-browser";
import Scheduler from "@/pages/scheduler";
import WorkflowMonitor from "@/pages/workflow-monitor";
import ThemeClusterManagement from "@/pages/theme-cluster-management";
import PersonalDashboard from "@/pages/personal-dashboard";
import MyHoldings from "@/pages/my-holdings";
import MyTrades from "@/pages/my-trades";
import MyWatchlist from "@/pages/my-watchlist";
import PersonalizationSettings from "@/pages/personalization-settings";
import ETFGuide from "@/pages/etf-guide";
import ETFAdminSettings from "@/pages/etf-admin-settings";
import NL2SQLEngine from "@/pages/nl2sql-engine";
import DictionaryManager from "@/pages/dictionary-manager";
import SchemaMapper from "@/pages/schema-mapper";
import PromptBuilder from "@/pages/prompt-builder";
import { FinancialChatbot } from "@/pages/financial-chatbot";
import AzureConfig from "@/pages/azure-config";
import OpenAIProvider from "@/pages/openai-provider";
import ServiceTest from "@/pages/service-test";
import AIMarketAnalysis from "@/pages/AIMarketAnalysis";
import AuditLogManagement from "@/pages/audit-log-management";
import AISearchManagement from "@/pages/ai-search-management";
import RAGManagement from "@/pages/rag-management";
import RAGSecurityManagement from "@/pages/rag-security-management";
import DataQueryAIMarket from "@/pages/data-query-ai-market";
import DataQueryHoldings from "@/pages/data-query-holdings";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" role="main" aria-label="로딩 중">
        <div className="text-center">
          <div 
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
            role="status"
            aria-label="로딩 중"
          ></div>
          <p className="text-muted-foreground" aria-live="polite">시스템을 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
        aria-label="메인 콘텐츠로 건너뛰기"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        
        <main 
          id="main-content"
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label="주요 콘텐츠 영역"
        >
          <Switch>
            {/* 홈 & 대시보드 - 모든 역할 접근 가능 */}
            <Route path="/">
              <ProtectedRoute path="/" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <Home />
              </ProtectedRoute>
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute path="/dashboard" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/news">
              <ProtectedRoute path="/news" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <News />
              </ProtectedRoute>
            </Route>
            
            {/* 워크플로우 관리 - 분석가 이상 */}
            <Route path="/workflow-editor/:id?">
              <ProtectedRoute path="/workflow-editor/:id?" requiredRoles={['analyst', 'ops', 'admin']}>
                <WorkflowEditor />
              </ProtectedRoute>
            </Route>
            <Route path="/scheduler">
              <ProtectedRoute path="/scheduler" requiredRoles={['ops', 'admin']}>
                <Scheduler />
              </ProtectedRoute>
            </Route>
            <Route path="/workflow-monitor">
              <ProtectedRoute path="/workflow-monitor" requiredRoles={['ops', 'admin']}>
                <WorkflowMonitor />
              </ProtectedRoute>
            </Route>
            
            {/* AI 시스템 관리 - 관리자 전용 */}
            <Route path="/prompt-management">
              <ProtectedRoute path="/prompt-management" requiredRoles={['admin']}>
                <PromptManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/api-management">
              <ProtectedRoute path="/api-management" requiredRoles={['admin']}>
                <ApiManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/python-management">
              <ProtectedRoute path="/python-management" requiredRoles={['admin']}>
                <PythonManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/data-source-management">
              <ProtectedRoute path="/data-source-management" requiredRoles={['admin']}>
                <DataSourceManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/logs">
              <ProtectedRoute path="/logs" requiredRoles={['ops', 'admin']}>
                <LogViewer />
              </ProtectedRoute>
            </Route>
            <Route path="/azure-config">
              <ProtectedRoute path="/azure-config" requiredRoles={['admin']}>
                <AzureConfig />
              </ProtectedRoute>
            </Route>
            <Route path="/ai-search-management">
              <ProtectedRoute path="/ai-search-management" requiredRoles={['admin']}>
                <AISearchManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/rag-management">
              <ProtectedRoute path="/rag-management" requiredRoles={['admin']}>
                <RAGManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/rag-security-management">
              <ProtectedRoute path="/rag-security-management" requiredRoles={['admin']}>
                <RAGSecurityManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/openai-provider">
              <ProtectedRoute path="/openai-provider" requiredRoles={['admin']}>
                <OpenAIProvider />
              </ProtectedRoute>
            </Route>
            <Route path="/service-test">
              <ProtectedRoute path="/service-test" requiredRoles={['admin']}>
                <ServiceTest />
              </ProtectedRoute>
            </Route>
            <Route path="/ai-market-analysis">
              <ProtectedRoute path="/ai-market-analysis" requiredRoles={['analyst', 'ops', 'admin']}>
                <AIMarketAnalysis />
              </ProtectedRoute>
            </Route>
            
            {/* 데이터 관리 */}
            <Route path="/schema-browser">
              <ProtectedRoute path="/schema-browser" requiredRoles={['admin']}>
                <SchemaBrowser />
              </ProtectedRoute>
            </Route>
            <Route path="/theme-cluster-management">
              <ProtectedRoute path="/theme-cluster-management" requiredRoles={['analyst', 'ops', 'admin']}>
                <ThemeClusterManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/nl2sql-engine">
              <ProtectedRoute path="/nl2sql-engine" requiredRoles={['analyst', 'ops', 'admin']}>
                <NL2SQLEngine />
              </ProtectedRoute>
            </Route>
            <Route path="/schema-mapper">
              <ProtectedRoute path="/schema-mapper" requiredRoles={['analyst', 'ops', 'admin']}>
                <SchemaMapper />
              </ProtectedRoute>
            </Route>
            <Route path="/dictionary-manager">
              <ProtectedRoute path="/dictionary-manager" requiredRoles={['analyst', 'ops', 'admin']}>
                <DictionaryManager />
              </ProtectedRoute>
            </Route>
            <Route path="/data-query-ai-market">
              <ProtectedRoute path="/data-query-ai-market" requiredRoles={['analyst', 'ops', 'admin']}>
                <DataQueryAIMarket />
              </ProtectedRoute>
            </Route>
            <Route path="/data-query-holdings">
              <ProtectedRoute path="/data-query-holdings" requiredRoles={['analyst', 'ops', 'admin']}>
                <DataQueryHoldings />
              </ProtectedRoute>
            </Route>
            <Route path="/prompt-builder">
              <ProtectedRoute path="/prompt-builder" requiredRoles={['analyst', 'ops', 'admin']}>
                <PromptBuilder />
              </ProtectedRoute>
            </Route>
            <Route path="/financial-chatbot">
              <ProtectedRoute path="/financial-chatbot" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <FinancialChatbot />
              </ProtectedRoute>
            </Route>
            
            {/* 개인화 서비스 - 모든 사용자 */}
            <Route path="/personal-dashboard">
              <ProtectedRoute path="/personal-dashboard" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <PersonalDashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/my-holdings">
              <ProtectedRoute path="/my-holdings" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <MyHoldings />
              </ProtectedRoute>
            </Route>
            <Route path="/my-trades">
              <ProtectedRoute path="/my-trades" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <MyTrades />
              </ProtectedRoute>
            </Route>
            <Route path="/my-watchlist">
              <ProtectedRoute path="/my-watchlist" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <MyWatchlist />
              </ProtectedRoute>
            </Route>
            <Route path="/personalization-settings">
              <ProtectedRoute path="/personalization-settings" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <PersonalizationSettings />
              </ProtectedRoute>
            </Route>
            <Route path="/etf-guide">
              <ProtectedRoute path="/etf-guide" requiredRoles={['user', 'analyst', 'ops', 'admin']}>
                <ETFGuide />
              </ProtectedRoute>
            </Route>
            <Route path="/etf-admin-settings">
              <ProtectedRoute path="/etf-admin-settings" requiredRoles={['admin']}>
                <ETFAdminSettings />
              </ProtectedRoute>
            </Route>
            
            {/* AI 시스템 관리 - 관리자 */}
            <Route path="/audit-log-management">
              <ProtectedRoute path="/audit-log-management" requiredRoles={['admin']}>
                <AuditLogManagement />
              </ProtectedRoute>
            </Route>
            
            {/* 404 페이지 */}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Setup global error handler
    setupGlobalErrorHandler();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
