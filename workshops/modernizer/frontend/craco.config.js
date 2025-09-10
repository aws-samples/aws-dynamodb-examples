const path = require('path');

module.exports = {
  babel: {
    plugins: [
      // Remove console.log statements in production builds
      process.env.NODE_ENV === 'production' && [
        'babel-plugin-transform-remove-console',
        {
          exclude: ['error', 'warn', 'info'] // Keep error, warn, and info logs
        }
      ]
    ].filter(Boolean)
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        // Configure Terser to remove console.log and debugger statements
        const terserPlugin = webpackConfig.optimization.minimizer.find(
          plugin => plugin.constructor.name === 'TerserPlugin'
        );
        
        if (terserPlugin) {
          terserPlugin.options = terserPlugin.options || {};
          terserPlugin.options.terserOptions = terserPlugin.options.terserOptions || {};
          terserPlugin.options.terserOptions.compress = {
            ...(terserPlugin.options.terserOptions.compress || {}),
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'console.trace']
          };
        }

        // Add security-focused optimizations
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          // Ensure proper code splitting for security
          splitChunks: {
            ...(webpackConfig.optimization.splitChunks || {}),
            cacheGroups: {
              ...(webpackConfig.optimization.splitChunks?.cacheGroups || {}),
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                enforce: true
              }
            }
          }
        };

        // Remove source maps in production for security
        webpackConfig.devtool = false;
      }

      return webpackConfig;
    }
  },
  // ESLint configuration for security
  eslint: {
    configure: {
      rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'warn', // Temporarily warn instead of error
        'no-debugger': 'error',
        'no-alert': process.env.NODE_ENV === 'production' ? 'warn' : 'warn', // Temporarily warn instead of error
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-script-url': 'error'
      },
      overrides: [
        {
          files: ['src/services/logger.ts'],
          rules: {
            'no-console': 'off' // Allow console in logger service
          }
        }
      ]
    }
  }
};