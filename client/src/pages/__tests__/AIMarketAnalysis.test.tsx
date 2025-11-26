import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIMarketAnalysis from '../AIMarketAnalysis';

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AIMarketAnalysis Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render page title and description', () => {
    renderWithQueryClient(<AIMarketAnalysis />);
    
    expect(screen.getByText('AI 시황 생성 테스트')).toBeInTheDocument();
    expect(screen.getByText('Databricks 기반 AI 시황 생성 워크플로우를 시각화하고 테스트합니다.')).toBeInTheDocument();
  });

  it('should render workflow steps correctly', () => {
    renderWithQueryClient(<AIMarketAnalysis />);
    
    expect(screen.getByText('뉴스 데이터 수집')).toBeInTheDocument();
    expect(screen.getByText('주요이벤트 추출')).toBeInTheDocument();
    expect(screen.getByText('테마 시황 생성')).toBeInTheDocument();
    expect(screen.getByText('매크로 시황 생성')).toBeInTheDocument();
  });

  it('should execute full workflow successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        newsData: [{ N_TITLE: 'Test News' }],
        marketEvents: [{ eventId: 'event1', eventTitle: 'Test Event' }],
        themeMarkets: [{ trendId: 'theme1', themeTitle: 'Test Theme' }],
        macroMarket: { trendId: 'macro1', title: 'Test Macro' }
      }
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    renderWithQueryClient(<AIMarketAnalysis />);
    
    const executeButton = screen.getByText('전체 워크플로우 실행');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-market-analysis/execute-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  it('should handle workflow execution errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderWithQueryClient(<AIMarketAnalysis />);
    
    const executeButton = screen.getByText('전체 워크플로우 실행');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('워크플로우 실행 중 오류가 발생했습니다: Network error')).toBeInTheDocument();
    });
  });

  it('should execute individual steps', async () => {
    const mockResponse = {
      success: true,
      data: [{ N_TITLE: 'Test News' }]
    };
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    renderWithQueryClient(<AIMarketAnalysis />);
    
    const executeButtons = screen.getAllByText('실행');
    fireEvent.click(executeButtons[0]); // First step
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-market-analysis/collect-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  it('should reset workflow state', () => {
    renderWithQueryClient(<AIMarketAnalysis />);
    
    const resetButton = screen.getByText('초기화');
    fireEvent.click(resetButton);
    
    // All steps should be in pending state
    const pendingBadges = screen.getAllByText('대기');
    expect(pendingBadges).toHaveLength(4);
  });

  it('should disable buttons when workflow is running', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: {} })
      }), 100))
    );

    renderWithQueryClient(<AIMarketAnalysis />);
    
    const executeButton = screen.getByText('전체 워크플로우 실행');
    fireEvent.click(executeButton);
    
    // Button should be disabled while running
    expect(executeButton).toBeDisabled();
    
    await waitFor(() => {
      expect(executeButton).not.toBeDisabled();
    });
  });

  it('should display workflow visualization', () => {
    renderWithQueryClient(<AIMarketAnalysis />);
    
    expect(screen.getByText('AI 시황 생성 워크플로우')).toBeInTheDocument();
    expect(screen.getByText('Databricks 기반 AI 시황 생성 프로세스를 시각화합니다.')).toBeInTheDocument();
  });

  it('should display results panel', () => {
    renderWithQueryClient(<AIMarketAnalysis />);
    
    expect(screen.getByText('결과 데이터')).toBeInTheDocument();
    expect(screen.getByText('워크플로우 실행 결과를 확인할 수 있습니다.')).toBeInTheDocument();
  });

  it('should show individual step execution buttons', () => {
    renderWithQueryClient(<AIMarketAnalysis />);
    
    expect(screen.getByText('개별 단계 실행')).toBeInTheDocument();
    expect(screen.getByText('각 단계를 개별적으로 실행하고 모니터링할 수 있습니다.')).toBeInTheDocument();
    
    const executeButtons = screen.getAllByText('실행');
    expect(executeButtons).toHaveLength(4); // One for each step
  });

  it('should handle step execution with news data', async () => {
    const mockNewsData = [{ N_TITLE: 'Test News' }];
    const mockEventsResponse = {
      success: true,
      data: [{ eventId: 'event1', eventTitle: 'Test Event' }]
    };
    
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockNewsData })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEventsResponse
      });

    renderWithQueryClient(<AIMarketAnalysis />);
    
    // Execute news collection step
    const executeButtons = screen.getAllByText('실행');
    fireEvent.click(executeButtons[0]);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-market-analysis/collect-news', expect.any(Object));
    });
    
    // Execute events extraction step
    fireEvent.click(executeButtons[1]);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-market-analysis/extract-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newsData: mockNewsData })
      });
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, message: 'Server error' })
    });

    renderWithQueryClient(<AIMarketAnalysis />);
    
    const executeButton = screen.getByText('전체 워크플로우 실행');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('워크플로우 실행에 실패했습니다.')).toBeInTheDocument();
    });
  });
});
