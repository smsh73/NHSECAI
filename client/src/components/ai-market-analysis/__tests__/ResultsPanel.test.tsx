import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultsPanel from '../ResultsPanel';

describe('ResultsPanel Component', () => {
  const mockWorkflowData = {
    newsData: [
      { N_TITLE: 'Test News 1', N_CONTENT: 'Content 1' },
      { N_TITLE: 'Test News 2', N_CONTENT: 'Content 2' }
    ],
    marketEvents: [
      { eventId: 'event1', eventTitle: 'Test Event 1', eventDetail: 'Detail 1' },
      { eventId: 'event2', eventTitle: 'Test Event 2', eventDetail: 'Detail 2' }
    ],
    themeMarkets: [
      { 
        trendId: 'theme1', 
        themeTitle: 'Test Theme 1', 
        content: 'Theme Content 1',
        direction: 'UP',
        fluctuationRate: 2.5,
        bubbleScale: 3
      },
      { 
        trendId: 'theme2', 
        themeTitle: 'Test Theme 2', 
        content: 'Theme Content 2',
        direction: 'DOWN',
        fluctuationRate: -1.2,
        bubbleScale: 2
      }
    ],
    macroMarket: {
      trendId: 'macro1',
      baseDate: '20250101',
      baseTime: '090000',
      title: 'Test Macro Title',
      content: 'Test Macro Content',
      ingestTs: new Date('2025-01-01T09:00:00Z')
    }
  };

  it('should render loading state correctly', () => {
    render(<ResultsPanel data={null} isLoading={true} />);
    
    expect(screen.getByText('데이터를 처리 중입니다...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<ResultsPanel data={null} isLoading={false} />);
    
    expect(screen.getByText('워크플로우를 실행하여 결과를 확인하세요.')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
  });

  it('should render data summary correctly', () => {
    render(<ResultsPanel data={mockWorkflowData} isLoading={false} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // newsData count
    expect(screen.getByText('2')).toBeInTheDocument(); // marketEvents count
    expect(screen.getByText('2')).toBeInTheDocument(); // themeMarkets count
    expect(screen.getByText('1건')).toBeInTheDocument(); // macroMarket count
  });

  it('should display macro market details', () => {
    render(<ResultsPanel data={mockWorkflowData} isLoading={false} />);
    
    expect(screen.getByText('Test Macro Title')).toBeInTheDocument();
    expect(screen.getByText('Test Macro Content')).toBeInTheDocument();
    expect(screen.getByText('생성 시간: 2025. 1. 1. 오전 9:00:00')).toBeInTheDocument();
  });

  it('should display market events', () => {
    render(<ResultsPanel data={mockWorkflowData} isLoading={false} />);
    
    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    expect(screen.getByText('Detail 1')).toBeInTheDocument();
    expect(screen.getByText('Detail 2')).toBeInTheDocument();
  });

  it('should display theme markets with correct direction badges', () => {
    render(<ResultsPanel data={mockWorkflowData} isLoading={false} />);
    
    expect(screen.getByText('Test Theme 1')).toBeInTheDocument();
    expect(screen.getByText('Test Theme 2')).toBeInTheDocument();
    expect(screen.getByText('상승')).toBeInTheDocument();
    expect(screen.getByText('하락')).toBeInTheDocument();
    expect(screen.getByText('등락률: 2.50%')).toBeInTheDocument();
    expect(screen.getByText('등락률: -1.20%')).toBeInTheDocument();
    expect(screen.getByText('버블스케일: 3')).toBeInTheDocument();
    expect(screen.getByText('버블스케일: 2')).toBeInTheDocument();
  });

  it('should handle empty arrays gracefully', () => {
    const emptyData = {
      newsData: [],
      marketEvents: [],
      themeMarkets: [],
      macroMarket: null
    };
    
    render(<ResultsPanel data={emptyData} isLoading={false} />);
    
    expect(screen.getAllByText('0')).toHaveLength(3); // newsData, marketEvents, themeMarkets
    expect(screen.getByText('0건')).toBeInTheDocument(); // macroMarket
  });

  it('should display correct data type icons', () => {
    render(<ResultsPanel data={mockWorkflowData} isLoading={false} />);
    
    expect(screen.getByTestId('news-icon')).toBeInTheDocument();
    expect(screen.getByTestId('events-icon')).toBeInTheDocument();
    expect(screen.getByTestId('themes-icon')).toBeInTheDocument();
    expect(screen.getByTestId('macro-icon')).toBeInTheDocument();
  });

  it('should show correct data type colors', () => {
    render(<ResultsPanel data={mockWorkflowData} isLoading={false} />);
    
    const newsCard = screen.getByText('뉴스 데이터').closest('div');
    const eventsCard = screen.getByText('주요이벤트').closest('div');
    const themesCard = screen.getByText('테마 시황').closest('div');
    const macroCard = screen.getByText('매크로 시황').closest('div');
    
    expect(newsCard).toHaveClass('bg-blue-50');
    expect(eventsCard).toHaveClass('bg-purple-50');
    expect(themesCard).toHaveClass('bg-green-50');
    expect(macroCard).toHaveClass('bg-orange-50');
  });

  it('should limit displayed items to first 3', () => {
    const largeData = {
      ...mockWorkflowData,
      marketEvents: Array.from({ length: 5 }, (_, i) => ({
        eventId: `event${i}`,
        eventTitle: `Event ${i}`,
        eventDetail: `Detail ${i}`
      })),
      themeMarkets: Array.from({ length: 5 }, (_, i) => ({
        trendId: `theme${i}`,
        themeTitle: `Theme ${i}`,
        content: `Content ${i}`,
        direction: 'UP',
        fluctuationRate: 1.0,
        bubbleScale: 1
      }))
    };
    
    render(<ResultsPanel data={largeData} isLoading={false} />);
    
    // Should only show first 3 items
    expect(screen.getByText('Event 0')).toBeInTheDocument();
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
    expect(screen.queryByText('Event 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Event 4')).not.toBeInTheDocument();
  });

  it('should handle missing macro market gracefully', () => {
    const dataWithoutMacro = {
      ...mockWorkflowData,
      macroMarket: null
    };
    
    render(<ResultsPanel data={dataWithoutMacro} isLoading={false} />);
    
    expect(screen.getByText('0건')).toBeInTheDocument(); // macroMarket count
    expect(screen.queryByText('매크로 시황')).not.toBeInTheDocument();
  });
});
