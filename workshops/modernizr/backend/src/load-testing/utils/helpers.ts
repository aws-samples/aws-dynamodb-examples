// Utility functions for load testing system

import { UserAction, ActionType } from '../types';

export class DelayManager {
  /**
   * Create a random delay between min and max seconds
   */
  static async randomDelay(minSeconds: number, maxSeconds: number): Promise<void> {
    const delay = Math.random() * (maxSeconds - minSeconds) + minSeconds;
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
  }

  /**
   * Create a fixed delay in seconds
   */
  static async fixedDelay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /**
   * Create exponential backoff delay for retries
   */
  static async exponentialBackoff(attempt: number, baseDelaySeconds: number = 1): Promise<void> {
    const delay = baseDelaySeconds * Math.pow(2, attempt) + Math.random() * 1000;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Create realistic user thinking time (1-5 seconds with weighted distribution)
   */
  static async realisticDelay(): Promise<void> {
    // Weighted towards shorter delays (more realistic user behavior)
    const random = Math.random();
    let delay: number;
    
    if (random < 0.4) {
      delay = 1 + Math.random() * 1; // 1-2 seconds (40% chance)
    } else if (random < 0.7) {
      delay = 2 + Math.random() * 1.5; // 2-3.5 seconds (30% chance)
    } else if (random < 0.9) {
      delay = 3.5 + Math.random() * 1.5; // 3.5-5 seconds (20% chance)
    } else {
      delay = 5 + Math.random() * 3; // 5-8 seconds (10% chance)
    }
    
    return this.fixedDelay(delay);
  }
}

export class RandomDataGenerator {
  private static readonly FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Jessica',
    'Daniel', 'Ashley', 'Matthew', 'Amanda', 'James', 'Melissa', 'Robert', 'Michelle',
    'William', 'Kimberly', 'Richard', 'Amy', 'Joseph', 'Angela', 'Thomas', 'Helen'
  ];

  private static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
  ];

  private static readonly PRODUCT_ADJECTIVES = [
    'Premium', 'Deluxe', 'Professional', 'Advanced', 'Ultimate', 'Classic', 'Modern',
    'Vintage', 'Luxury', 'Essential', 'Smart', 'Eco-Friendly', 'Portable', 'Wireless',
    'Digital', 'Automatic', 'Manual', 'Heavy-Duty', 'Lightweight', 'Compact'
  ];

  private static readonly PRODUCT_NOUNS = [
    'Widget', 'Gadget', 'Tool', 'Device', 'Accessory', 'Component', 'System',
    'Kit', 'Set', 'Collection', 'Bundle', 'Package', 'Solution', 'Equipment',
    'Instrument', 'Apparatus', 'Machine', 'Unit', 'Module', 'Assembly'
  ];

  private static readonly CATEGORIES = [
    'Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors', 'Books',
    'Health & Beauty', 'Toys & Games', 'Automotive', 'Tools & Hardware', 'Food & Beverages'
  ];

  static generateUsername(): string {
    const firstName = this.randomChoice(this.FIRST_NAMES).toLowerCase();
    const lastName = this.randomChoice(this.LAST_NAMES).toLowerCase();
    const number = Math.floor(Math.random() * 999) + 1;
    return `${firstName}${lastName}${number}`;
  }

  static generateEmail(username?: string): string {
    const user = username || this.generateUsername();
    const domains = ['example.com', 'test.com', 'demo.org', 'sample.net', 'loadtest.io'];
    const domain = this.randomChoice(domains);
    return `${user}@${domain}`;
  }

  static generatePassword(): string {
    const length = 8 + Math.floor(Math.random() * 4); // 8-12 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  static generateProductName(): string {
    const adjective = this.randomChoice(this.PRODUCT_ADJECTIVES);
    const noun = this.randomChoice(this.PRODUCT_NOUNS);
    const hasModel = Math.random() > 0.5;
    const model = hasModel ? ` ${Math.floor(Math.random() * 9000) + 1000}` : '';
    return `${adjective} ${noun}${model}`;
  }

  static generateProductDescription(): string {
    const templates = [
      'High-quality {product} designed for professional use. Features advanced technology and durable construction.',
      'Perfect {product} for everyday use. Combines functionality with style and reliability.',
      'Premium {product} with innovative features. Ideal for both beginners and experts.',
      'Versatile {product} that delivers exceptional performance. Built to last with superior materials.',
      'State-of-the-art {product} offering unmatched quality and value. Perfect for modern lifestyles.'
    ];
    
    const template = this.randomChoice(templates);
    const product = this.randomChoice(this.PRODUCT_NOUNS).toLowerCase();
    return template.replace('{product}', product);
  }

  static generateCategoryName(): string {
    return this.randomChoice(this.CATEGORIES);
  }

  static generatePrice(): number {
    // Generate realistic price distribution
    const random = Math.random();
    let price: number;
    
    if (random < 0.3) {
      price = 5 + Math.random() * 20; // $5-25 (30% chance)
    } else if (random < 0.6) {
      price = 25 + Math.random() * 75; // $25-100 (30% chance)
    } else if (random < 0.85) {
      price = 100 + Math.random() * 400; // $100-500 (25% chance)
    } else {
      price = 500 + Math.random() * 1500; // $500-2000 (15% chance)
    }
    
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  static generateInventoryQuantity(): number {
    // Generate realistic inventory levels
    const random = Math.random();
    
    if (random < 0.1) {
      return Math.floor(Math.random() * 5) + 1; // 1-5 (low stock, 10% chance)
    } else if (random < 0.3) {
      return Math.floor(Math.random() * 20) + 5; // 5-25 (20% chance)
    } else if (random < 0.7) {
      return Math.floor(Math.random() * 75) + 25; // 25-100 (40% chance)
    } else {
      return Math.floor(Math.random() * 400) + 100; // 100-500 (30% chance)
    }
  }

  static generateAddress(): any {
    const streetNumbers = Math.floor(Math.random() * 9999) + 1;
    const streetNames = [
      'Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Maple Ln', 'Cedar Blvd',
      'First St', 'Second Ave', 'Park Rd', 'Hill Dr', 'Lake Ln', 'River Blvd'
    ];
    const cities = [
      'Springfield', 'Franklin', 'Georgetown', 'Madison', 'Washington', 'Arlington',
      'Riverside', 'Fairview', 'Greenwood', 'Bristol', 'Clinton', 'Monroe'
    ];
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
    
    return {
      street: `${streetNumbers} ${this.randomChoice(streetNames)}`,
      city: this.randomChoice(cities),
      state: this.randomChoice(states),
      zipCode: String(Math.floor(Math.random() * 90000) + 10000)
    };
  }

  static generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 800) + 200;
    const exchange = Math.floor(Math.random() * 800) + 200;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `(${areaCode}) ${exchange}-${number}`;
  }

  private static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

export class IdGenerator {
  private static counter = 0;

  static generateId(prefix: string = ''): string {
    this.counter++;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}-${this.counter}-${random}`;
  }

  static generateSessionId(): string {
    return this.generateId('session-');
  }

  static generateActionId(): string {
    return this.generateId('action-');
  }

  static generateTestId(): string {
    return this.generateId('test-');
  }
}

export class MetricsCalculator {
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  static calculateSuccessRate(successful: number, total: number): number {
    if (total === 0) return 0;
    return (successful / total) * 100;
  }

  static calculateRequestsPerSecond(totalRequests: number, durationSeconds: number): number {
    if (durationSeconds === 0) return 0;
    return totalRequests / durationSeconds;
  }
}

export class ActionTracker {
  static createAction(
    sessionId: string,
    type: ActionType,
    endpoint: string,
    method: string = 'GET'
  ): UserAction {
    return {
      id: IdGenerator.generateActionId(),
      sessionId,
      type,
      endpoint,
      method,
      startTime: new Date(),
      success: false
    };
  }

  static completeAction(action: UserAction, success: boolean, statusCode?: number, error?: string): UserAction {
    const endTime = new Date();
    return {
      ...action,
      endTime,
      duration: endTime.getTime() - action.startTime.getTime(),
      success,
      statusCode,
      error
    };
  }
}

export class Logger {
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  static debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }

  static info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }

  static warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }

  static error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    }
  }

  private static shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
}