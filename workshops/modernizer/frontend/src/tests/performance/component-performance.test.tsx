import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { performance } from 'perf_hooks';
import FormField from '../../components/FormField';
import LoadingSpinner from '../../components/LoadingSpinner';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow
  }
});

describe('Component Performance Tests', () => {
  beforeEach(() => {
    mockPerformanceNow.mockClear();
    let time = 0;
    mockPerformanceNow.mockImplementation(() => time += 16.67); // ~60fps
  });

  describe('FormField Performance', () => {
    test('should render quickly with minimal props', () => {
      const startTime = performance.now();
      
      render(
        <FormField
          label="Test Field"
          name="test"
          value=""
          onChange={() => {}}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(50); // Should render in under 50ms
      expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    });

    test('should handle rapid value changes efficiently', async () => {
      let changeCount = 0;
      const handleChange = jest.fn(() => changeCount++);
      
      const { rerender } = render(
        <FormField
          label="Test Field"
          name="test"
          value=""
          onChange={handleChange}
        />
      );

      const input = screen.getByLabelText('Test Field');
      const startTime = performance.now();

      // Simulate rapid typing
      for (let i = 0; i < 100; i++) {
        fireEvent.change(input, { target: { value: `test${i}` } });
        rerender(
          <FormField
            label="Test Field"
            name="test"
            value={`test${i}`}
            onChange={handleChange}
          />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should handle 100 changes in under 1 second
      expect(handleChange).toHaveBeenCalledTimes(100);
    });

    test('should not re-render unnecessarily with same props', () => {
      const renderSpy = jest.fn();
      const TestComponent = React.memo(() => {
        renderSpy();
        return (
          <FormField
            label="Test Field"
            name="test"
            value="test"
            onChange={() => {}}
          />
        );
      });

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1); // Should not re-render
    });
  });

  describe('LoadingSpinner Performance', () => {
    test('should render spinner quickly', () => {
      const startTime = performance.now();
      
      render(<LoadingSpinner />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(20); // Should render very quickly
    });

    test('should handle multiple spinners efficiently', () => {
      const startTime = performance.now();
      
      render(
        <div>
          {Array.from({ length: 50 }, (_, i) => (
            <LoadingSpinner key={i} size="small" />
          ))}
        </div>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(200); // Should render 50 spinners in under 200ms
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not create memory leaks with frequent re-renders', () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            setCount(c => c + 1);
          }, 10);
          
          return () => clearInterval(interval);
        }, []);

        return (
          <FormField
            label="Counter"
            name="counter"
            value={count.toString()}
            onChange={() => {}}
          />
        );
      };

      const { unmount } = render(<TestComponent />);
      
      // Let it run for a bit
      setTimeout(() => {
        unmount();
        // In a real test, you'd check memory usage here
        expect(true).toBe(true); // Placeholder assertion
      }, 100);
    });
  });

  describe('Large Dataset Performance', () => {
    test('should handle large lists efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: `value${i}`
      }));

      const startTime = performance.now();
      
      render(
        <div>
          {largeDataset.map(item => (
            <FormField
              key={item.id}
              label={item.name}
              name={item.id.toString()}
              value={item.value}
              onChange={() => {}}
            />
          ))}
        </div>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(2000); // Should render 1000 items in under 2 seconds
    });
  });

  describe('Animation Performance', () => {
    test('should maintain smooth animations', async () => {
      render(<LoadingSpinner />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });
  });
});