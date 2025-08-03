// React import not needed with new JSX transform
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner, { LoadingButton, SkeletonLoader } from '../../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  test('should render with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
  
  test('should render with custom text', () => {
    render(<LoadingSpinner text="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });
  
  test('should render different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="small" />);
    const smallSpinner = document.querySelector('.w-4.h-4');
    expect(smallSpinner).toBeInTheDocument();
    
    rerender(<LoadingSpinner size="large" />);
    const largeSpinner = document.querySelector('.w-12.h-12');
    expect(largeSpinner).toBeInTheDocument();
  });
  
  test('should render different colors', () => {
    const { rerender } = render(<LoadingSpinner color="blue" />);
    const blueSpinner = document.querySelector('.border-blue-600');
    expect(blueSpinner).toBeInTheDocument();
    
    rerender(<LoadingSpinner color="white" />);
    const whiteSpinner = document.querySelector('.border-white');
    expect(whiteSpinner).toBeInTheDocument();
  });
  
  test('should render fullscreen overlay', () => {
    render(<LoadingSpinner fullScreen />);
    
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('bg-white', 'bg-opacity-75');
  });
});

describe('LoadingButton', () => {
  test('should render button with children', () => {
    render(<LoadingButton loading={false}>Click me</LoadingButton>);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('should show loading spinner when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    expect(screen.getByText('Click me')).toHaveClass('opacity-0');
  });
  
  test('should handle click events', () => {
    const handleClick = jest.fn();
    render(<LoadingButton loading={false} onClick={handleClick}>Click me</LoadingButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('should not handle click when loading', () => {
    const handleClick = jest.fn();
    render(<LoadingButton loading={true} onClick={handleClick}>Click me</LoadingButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  test('should be disabled when disabled prop is true', () => {
    render(<LoadingButton loading={false} disabled>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });
});

describe('SkeletonLoader', () => {
  test('should render with default props', () => {
    render(<SkeletonLoader />);
    
    const skeletonLines = document.querySelectorAll('.bg-gray-200');
    expect(skeletonLines).toHaveLength(3);
  });
  
  test('should render custom number of lines', () => {
    render(<SkeletonLoader lines={5} />);
    
    const skeletonLines = document.querySelectorAll('.bg-gray-200');
    expect(skeletonLines).toHaveLength(5);
  });
});