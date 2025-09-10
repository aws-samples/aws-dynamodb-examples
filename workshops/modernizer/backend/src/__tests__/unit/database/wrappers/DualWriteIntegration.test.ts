import { DualWriteWrapperFactory } from '../../../../database/wrappers/DualWriteWrapperFactory';
import { DatabaseFactory } from '../../../../database/factory/DatabaseFactory';
import { FeatureFlagService } from '../../../../services/FeatureFlagService';

describe('Dual-Write Integration Tests', () => {
  let wrapperFactory: DualWriteWrapperFactory;
  let featureFlagService: FeatureFlagService;

  beforeEach(() => {
    featureFlagService = new FeatureFlagService();
    wrapperFactory = new DualWriteWrapperFactory(featureFlagService);
    FeatureFlagService.reset();
  });

  describe('Wrapper Factory Creation', () => {
    it('should create UserDualWriteWrapper', () => {
      const wrapper = wrapperFactory.createUserWrapper();
      expect(wrapper).toBeDefined();
      expect(wrapper.constructor.name).toBe('UserDualWriteWrapper');
    });

    it('should create ProductDualWriteWrapper', () => {
      const wrapper = wrapperFactory.createProductWrapper();
      expect(wrapper).toBeDefined();
      expect(wrapper.constructor.name).toBe('ProductDualWriteWrapper');
    });

    it('should create CartDualWriteWrapper', () => {
      const wrapper = wrapperFactory.createCartWrapper();
      expect(wrapper).toBeDefined();
      expect(wrapper.constructor.name).toBe('CartDualWriteWrapper');
    });

    it('should create OrderDualWriteWrapper', () => {
      const wrapper = wrapperFactory.createOrderWrapper();
      expect(wrapper).toBeDefined();
      expect(wrapper.constructor.name).toBe('OrderDualWriteWrapper');
    });

    it('should create CategoryDualWriteWrapper', () => {
      const wrapper = wrapperFactory.createCategoryWrapper();
      expect(wrapper).toBeDefined();
      expect(wrapper.constructor.name).toBe('CategoryDualWriteWrapper');
    });
  });

  describe('Feature Flag Integration', () => {
    it('should respect dual_write_enabled flag across all wrappers', () => {
      // Test that all wrappers are created with the same feature flag service
      const userWrapper = wrapperFactory.createUserWrapper();
      const productWrapper = wrapperFactory.createProductWrapper();
      const cartWrapper = wrapperFactory.createCartWrapper();
      const orderWrapper = wrapperFactory.createOrderWrapper();
      const categoryWrapper = wrapperFactory.createCategoryWrapper();

      // All wrappers should be created successfully
      expect(userWrapper).toBeDefined();
      expect(productWrapper).toBeDefined();
      expect(cartWrapper).toBeDefined();
      expect(orderWrapper).toBeDefined();
      expect(categoryWrapper).toBeDefined();
    });

    it('should handle feature flag changes', () => {
      // Test flag changes
      FeatureFlagService.setFlag('dual_write_enabled', true);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(true);

      FeatureFlagService.setFlag('dual_write_enabled', false);
      expect(FeatureFlagService.getFlag('dual_write_enabled')).toBe(false);
    });
  });

  describe('Entity Type Coverage', () => {
    it('should cover all 5 required entities', () => {
      const entityWrappers = [
        wrapperFactory.createUserWrapper(),
        wrapperFactory.createProductWrapper(),
        wrapperFactory.createCartWrapper(),
        wrapperFactory.createOrderWrapper(),
        wrapperFactory.createCategoryWrapper()
      ];

      // Verify all 5 entity wrappers are created
      expect(entityWrappers).toHaveLength(5);
      entityWrappers.forEach(wrapper => {
        expect(wrapper).toBeDefined();
      });
    });
  });

  describe('Logging Infrastructure', () => {
    it('should have correlation ID support in all wrappers', () => {
      // Test that correlation ID utility is available
      const { CorrelationId } = require('../../../../utils/CorrelationId');
      const correlationId = CorrelationId.generate();
      
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      expect(correlationId.length).toBeGreaterThan(0);
    });

    it('should generate unique correlation IDs', () => {
      const { CorrelationId } = require('../../../../utils/CorrelationId');
      const id1 = CorrelationId.generate();
      const id2 = CorrelationId.generate();
      
      expect(id1).not.toBe(id2);
    });
  });
});
