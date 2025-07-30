#!/usr/bin/env node

// CLI interface for the load testing system

import { quickStart, getSystemInfo, validateSystemRequirements, VERSION } from './index';
import { ConfigDefaults, ConfigValidator } from './config/schema';
import { Logger } from './utils/helpers';

class LoadTestCLI {
  private args: string[];

  constructor(args: string[]) {
    this.args = args;
  }

  async run(): Promise<void> {
    const command = this.args[2] || 'help';

    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
        
      case 'version':
      case '--version':
      case '-v':
        this.showVersion();
        break;
        
      case 'info':
      case 'system-info':
        this.showSystemInfo();
        break;
        
      case 'validate':
        this.validateSystem();
        break;
        
      case 'quick-start':
        await this.quickStart();
        break;
        
      case 'config':
        this.showConfigExamples();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "npm run load-test help" for available commands.');
        process.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
🚀 Load Testing System CLI v${VERSION}
=====================================

USAGE:
  npm run load-test <command> [options]

COMMANDS:
  help              Show this help message
  version           Show version information
  info              Show system information
  validate          Validate system requirements
  quick-start       Run system validation and show quick start guide
  config            Show configuration examples

EXAMPLES:
  npm run load-test help
  npm run load-test info
  npm run load-test quick-start
  npm run load-test validate

For more detailed usage, see the documentation in the load-testing directory.
`);
  }

  private showVersion(): void {
    console.log(`Load Testing System v${VERSION}`);
  }

  private showSystemInfo(): void {
    console.log('🖥️  System Information');
    console.log('=====================');
    
    const info = getSystemInfo();
    console.log(`Node.js Version: ${info.nodeVersion}`);
    console.log(`Platform: ${info.platform} (${info.arch})`);
    console.log(`Memory Usage: ${info.memory.used}MB / ${info.memory.total}MB`);
    console.log(`External Memory: ${info.memory.external}MB`);
    console.log(`RSS Memory: ${info.memory.rss}MB`);
    console.log(`Process Uptime: ${info.uptime} seconds`);
    console.log(`Load Testing Version: ${info.loadTestingVersion}`);
  }

  private validateSystem(): void {
    console.log('🔍 Validating System Requirements');
    console.log('=================================');
    
    const validation = validateSystemRequirements();
    
    if (validation.valid) {
      console.log('✅ All system requirements met!');
      console.log('System is ready for load testing.');
    } else {
      console.log('❌ System requirements not met:');
      validation.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
      console.log('\nPlease resolve these issues before running load tests.');
    }
  }

  private async quickStart(): Promise<void> {
    const success = await quickStart();
    
    if (success) {
      console.log('\n✅ System is ready for load testing!');
      console.log('\n📚 Next Steps:');
      console.log('1. Start your backend server: npm start');
      console.log('2. Create a test script using the TestController');
      console.log('3. Run your load test and monitor results');
    } else {
      console.log('\n❌ System is not ready for load testing.');
      console.log('Please resolve the issues above and try again.');
      process.exit(1);
    }
  }

  private showConfigExamples(): void {
    console.log('⚙️  Configuration Examples');
    console.log('=========================');
    
    console.log('\n📋 Default Configuration:');
    const defaultConfig = ConfigDefaults.getDefaultConfig();
    console.log(JSON.stringify(defaultConfig, null, 2));
    
    console.log('\n🔥 Stress Test Configuration:');
    const stressConfig = ConfigDefaults.getStressTestConfig();
    console.log(JSON.stringify(stressConfig, null, 2));
    
    console.log('\n⚡ Quick Test Configuration:');
    const quickConfig = ConfigDefaults.getQuickTestConfig();
    console.log(JSON.stringify(quickConfig, null, 2));
    
    console.log('\n💡 Tips:');
    console.log('- Start with the quick test configuration for development');
    console.log('- Use default configuration for regular load testing');
    console.log('- Use stress test configuration for performance validation');
    console.log('- Customize configurations based on your specific needs');
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new LoadTestCLI(process.argv);
  cli.run().catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}

export default LoadTestCLI;