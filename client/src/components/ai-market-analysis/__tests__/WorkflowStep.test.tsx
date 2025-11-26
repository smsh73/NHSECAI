import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowStep from '../WorkflowStep';

describe('WorkflowStep Component', () => {
  const mockOnExecute = jest.fn();
  const defaultProps = {
    id: 'test-step',
    name: 'Test Step',
    description: 'Test description',
    status: 'pending' as const,
    progress: 0,
    onExecute: mockOnExecute,
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render step information correctly', () => {
    render(<WorkflowStep {...defaultProps} />);
    
    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('대기')).toBeInTheDocument();
    expect(screen.getByText('실행')).toBeInTheDocument();
  });

  it('should show pending status correctly', () => {
    render(<WorkflowStep {...defaultProps} status="pending" />);
    
    expect(screen.getByText('대기')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실행' })).not.toBeDisabled();
  });

  it('should show running status correctly', () => {
    render(<WorkflowStep {...defaultProps} status="running" progress={50} />);
    
    expect(screen.getByText('실행중')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실행중' })).toBeDisabled();
    expect(screen.getByText('진행률: 50%')).toBeInTheDocument();
  });

  it('should show completed status correctly', () => {
    const mockData = [{ id: 1, title: 'Test Data' }];
    render(
      <WorkflowStep 
        {...defaultProps} 
        status="completed" 
        progress={100}
        data={mockData}
        startTime={new Date('2025-01-01T09:00:00Z')}
        endTime={new Date('2025-01-01T09:00:05Z')}
      />
    );
    
    expect(screen.getByText('완료')).toBeInTheDocument();
    expect(screen.getByText('실행 시간: 5.0초')).toBeInTheDocument();
    expect(screen.getByText('1건 처리됨')).toBeInTheDocument();
  });

  it('should show error status correctly', () => {
    render(
      <WorkflowStep 
        {...defaultProps} 
        status="error" 
        error="Test error message"
      />
    );
    
    expect(screen.getByText('오류')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should call onExecute when execute button is clicked', () => {
    render(<WorkflowStep {...defaultProps} />);
    
    const executeButton = screen.getByRole('button', { name: '실행' });
    fireEvent.click(executeButton);
    
    expect(mockOnExecute).toHaveBeenCalledWith('test-step');
  });

  it('should disable execute button when disabled prop is true', () => {
    render(<WorkflowStep {...defaultProps} disabled={true} />);
    
    expect(screen.getByRole('button', { name: '실행' })).toBeDisabled();
  });

  it('should disable execute button when status is running', () => {
    render(<WorkflowStep {...defaultProps} status="running" />);
    
    expect(screen.getByRole('button', { name: '실행중' })).toBeDisabled();
  });

  it('should show progress bar when status is running', () => {
    render(<WorkflowStep {...defaultProps} status="running" progress={75} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('should display macro market data correctly when completed', () => {
    const macroData = {
      title: 'Test Macro Title',
      content: 'Test Macro Content'
    };
    
    render(
      <WorkflowStep 
        {...defaultProps} 
        status="completed" 
        data={macroData}
      />
    );
    
    expect(screen.getByText('Test Macro Title')).toBeInTheDocument();
  });

  it('should show different icons for different step types', () => {
    const { rerender } = render(<WorkflowStep {...defaultProps} id="collect-news" />);
    expect(screen.getByTestId('database-icon')).toBeInTheDocument();

    rerender(<WorkflowStep {...defaultProps} id="extract-events" />);
    expect(screen.getByTestId('brain-icon')).toBeInTheDocument();

    rerender(<WorkflowStep {...defaultProps} id="generate-themes" />);
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();

    rerender(<WorkflowStep {...defaultProps} id="generate-macro" />);
    expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
  });

  it('should format duration correctly', () => {
    const startTime = new Date('2025-01-01T09:00:00Z');
    const endTime = new Date('2025-01-01T09:00:02.5Z');
    
    render(
      <WorkflowStep 
        {...defaultProps} 
        status="completed"
        startTime={startTime}
        endTime={endTime}
      />
    );
    
    expect(screen.getByText('실행 시간: 2.5초')).toBeInTheDocument();
  });
});
