// Mock the database module before importing
const mockGetPoolStats = jest.fn(() => ({
    totalConnections: 10,
    activeConnections: 5,
    idleConnections: 5,
    queuedRequests: 0,
    acquiringConnections: 0
}));

jest.mock('../../../config/database', () => ({
    getPoolStats: mockGetPoolStats
}));

import { performanceMonitor, measureExecutionTime } from '../../../utils/performanceMonitor';

describe('PerformanceMonitor', () => {
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset mock implementation
        mockGetPoolStats.mockReturnValue({
            totalConnections: 10,
            activeConnections: 5,
            idleConnections: 5,
            queuedRequests: 0,
            acquiringConnections: 0
        });
        
        // Clear any existing metrics
        performanceMonitor['metrics'] = [];
        performanceMonitor['requestMetrics'] = new Map();
        performanceMonitor['requestCounts'] = {
            total: 0,
            successful: 0,
            failed: 0
        };
    });

    describe('recordMetric', () => {
        test('should record a metric', () => {
            performanceMonitor.recordMetric('test_metric', 100, 'ms');

            const metrics = performanceMonitor.getMetrics();
            expect(metrics).toHaveLength(1);
            expect(metrics[0]).toMatchObject({
                name: 'test_metric',
                value: 100,
                unit: 'ms'
            });
        });

        test('should record metric with tags', () => {
            performanceMonitor.recordMetric('test_metric', 100, 'ms', { endpoint: '/api/test' });

            const metrics = performanceMonitor.getMetrics();
            expect(metrics[0].tags).toEqual({ endpoint: '/api/test' });
        });
    });

    describe('recordRequest', () => {
        test('should record successful request', () => {
            performanceMonitor.recordRequest('/api/test', 150, true);

            const stats = performanceMonitor.getEndpointStats('/api/test');
            expect(stats).toMatchObject({
                requestCount: 1,
                averageResponseTime: 150,
                minResponseTime: 150,
                maxResponseTime: 150
            });
        });

        test('should record failed request', () => {
            performanceMonitor.recordRequest('/api/test', 500, false);

            const systemMetrics = performanceMonitor.getSystemMetrics();
            expect(systemMetrics.requests.failed).toBe(1);
            expect(systemMetrics.requests.successful).toBe(0);
        });
    });

    describe('getSystemMetrics', () => {
        test('should return system metrics', () => {
            const metrics = performanceMonitor.getSystemMetrics();

            expect(metrics).toHaveProperty('memory');
            expect(metrics).toHaveProperty('cpu');
            expect(metrics).toHaveProperty('database');
            expect(metrics).toHaveProperty('requests');

            expect(metrics.memory).toHaveProperty('used');
            expect(metrics.memory).toHaveProperty('total');
            expect(metrics.memory).toHaveProperty('percentage');
        });
    });

    describe('getPerformanceSummary', () => {
        test('should return performance summary with good health', () => {
            const summary = performanceMonitor.getPerformanceSummary();

            expect(summary).toHaveProperty('systemHealth');
            expect(summary).toHaveProperty('issues');
            expect(summary).toHaveProperty('recommendations');
            expect(summary).toHaveProperty('metrics');

            expect(['good', 'warning', 'critical']).toContain(summary.systemHealth);
            expect(Array.isArray(summary.issues)).toBe(true);
            expect(Array.isArray(summary.recommendations)).toBe(true);
        });
    });

    describe('measureExecutionTime', () => {
        test('should measure synchronous function execution time', () => {
            const testFunction = () => {
                // Simulate some work
                let sum = 0;
                for (let i = 0; i < 1000; i++) {
                    sum += i;
                }
                return sum;
            };

            const result = measureExecutionTime('test_sync_function', testFunction);

            expect(result).toBe(499500); // Sum of 0 to 999

            const metrics = performanceMonitor.getMetrics();
            const executionMetric = metrics.find(m => m.name === 'test_sync_function');
            expect(executionMetric).toBeDefined();
            expect(executionMetric?.unit).toBe('ms');
        });

        test('should measure asynchronous function execution time', async () => {
            const testAsyncFunction = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async result';
            };

            const result = await measureExecutionTime('test_async_function', testAsyncFunction);

            expect(result).toBe('async result');

            const metrics = performanceMonitor.getMetrics();
            const executionMetric = metrics.find(m => m.name === 'test_async_function');
            expect(executionMetric).toBeDefined();
            expect(executionMetric?.value).toBeGreaterThan(5); // Should take at least 5ms
        });
    });
});