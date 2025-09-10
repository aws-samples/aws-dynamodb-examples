# Database Migration User Guide - 5-Phase Migration System

## Overview

This guide provides comprehensive instructions for managing the 5-phase database migration from MySQL to DynamoDB using the feature flag system. The migration is designed to be safe, reversible, and allows for gradual transition with comprehensive validation.

## Migration Phases Overview

| Phase | Name | Write Target | Read Target | Validation | Purpose |
|-------|------|-------------|-------------|------------|---------|
| **1** | MySQL Only | MySQL | MySQL | ❌ | Baseline state - current production |
| **2** | Safety Phase | Both (MySQL first) | MySQL | ❌ | Start dual-writes, keep MySQL reads |
| **3** | Validation Phase | Both (MySQL first) | Both | ✅ | Enable validation to detect inconsistencies |
| **4** | Transition Phase | Both (MySQL first) | DynamoDB | ❌ | Switch to DynamoDB reads |
| **5** | DynamoDB Only | DynamoDB | DynamoDB | ❌ | Final state - full DynamoDB |

## Phase-by-Phase Migration Guide

### Phase 1: MySQL Only (Baseline)
**Current production state - no changes needed**

#### Configuration
```typescript
migration_phase: 1
dual_write_enabled: false
dual_read_enabled: false  
read_from_dynamodb: false
validation_enabled: false
```

#### Behavior
- ✅ All writes go to MySQL
- ✅ All reads come from MySQL
- ✅ No DynamoDB operations
- ✅ Standard production behavior

#### When to Use
- Initial state before migration begins
- Rollback target if issues occur in later phases

---

### Phase 2: Safety Phase (Dual Write + MySQL Read)
**Start writing to both databases while keeping MySQL as read source**

#### Configuration
```typescript
migration_phase: 2
dual_write_enabled: true
dual_read_enabled: false
read_from_dynamodb: false  
validation_enabled: false
```

#### Behavior
- ✅ Writes go to MySQL first, then DynamoDB
- ✅ All reads still come from MySQL
- ✅ MySQL failures block the operation
- ✅ DynamoDB failures are logged but don't block operations

#### Migration Steps
1. **Pre-Migration Checklist**
   - ✅ Verify DynamoDB tables are created and accessible
   - ✅ Confirm dual-write wrappers are deployed
   - ✅ Check monitoring and logging systems

2. **Execute Migration**
   ```typescript
   FeatureFlagService.setMigrationPhase(2);
   ```

3. **Validation**
   - Monitor logs for DynamoDB write errors
   - Verify data is being written to both databases
   - Check application performance impact

#### Rollback Procedure
```typescript
// Immediate rollback to Phase 1
FeatureFlagService.setMigrationPhase(1);
```

#### Troubleshooting
- **DynamoDB write failures**: Check connection, permissions, and table schema
- **Performance degradation**: Monitor write latency and adjust timeouts
- **Data inconsistencies**: Verify ID transformation logic

---

### Phase 3: Validation Phase (Dual Write + Dual Read)
**Enable comprehensive validation to detect data inconsistencies**

#### Configuration
```typescript
migration_phase: 3
dual_write_enabled: true
dual_read_enabled: true
read_from_dynamodb: false
validation_enabled: true
```

#### Behavior
- ✅ Writes go to MySQL first, then DynamoDB
- ✅ Reads come from both databases with validation
- ✅ Returns MySQL data as primary source
- ✅ Validation errors are logged with detailed differences

#### Migration Steps
1. **Pre-Migration Checklist**
   - ✅ Phase 2 running successfully for sufficient time
   - ✅ DynamoDB write error rate < 1%
   - ✅ Data consistency spot-checks completed

2. **Execute Migration**
   ```typescript
   FeatureFlagService.setMigrationPhase(3);
   ```

3. **Validation Monitoring**
   - Monitor validation error logs
   - Identify and fix data inconsistencies
   - Verify read performance impact

#### Common Validation Errors
- **ID mismatches**: Check ID transformation logic
- **Timestamp precision**: Verify date handling
- **Null vs empty**: Check data mapping consistency
- **Password hashes**: Verify hash preservation

#### Rollback Procedure
```typescript
// Rollback to Phase 2 (safer than Phase 1)
FeatureFlagService.setMigrationPhase(2);
```

#### Troubleshooting
- **High validation error rate**: Investigate data transformation issues
- **Performance impact**: Consider reducing validation frequency
- **False positives**: Review validation logic for edge cases

---

### Phase 4: Transition Phase (Dual Write + DynamoDB Read)
**Switch to reading from DynamoDB while maintaining dual writes**

#### Configuration
```typescript
migration_phase: 4
dual_write_enabled: true
dual_read_enabled: false
read_from_dynamodb: true
validation_enabled: false
```

#### Behavior
- ✅ Writes go to MySQL first, then DynamoDB
- ✅ All reads come from DynamoDB
- ✅ No validation overhead
- ✅ MySQL still receives all writes for safety

#### Migration Steps
1. **Pre-Migration Checklist**
   - ✅ Phase 3 validation error rate < 0.1%
   - ✅ DynamoDB data consistency verified
   - ✅ Performance benchmarks completed

2. **Execute Migration**
   ```typescript
   FeatureFlagService.setMigrationPhase(4);
   ```

3. **Monitoring**
   - Watch for read errors from DynamoDB
   - Monitor application performance
   - Verify data consistency in production

#### Rollback Procedure
```typescript
// Immediate rollback to Phase 3 for validation
FeatureFlagService.setMigrationPhase(3);

// Or rollback to Phase 2 for MySQL reads
FeatureFlagService.setMigrationPhase(2);
```

#### Troubleshooting
- **DynamoDB read failures**: Check connection and permissions
- **Missing data**: Verify dual-write completeness
- **Performance issues**: Review DynamoDB capacity and indexes

---

### Phase 5: DynamoDB Only (Final State)
**Complete migration - all operations use DynamoDB**

#### Configuration
```typescript
migration_phase: 5
dual_write_enabled: false
dual_read_enabled: false
read_from_dynamodb: true
validation_enabled: false
```

#### Behavior
- ✅ All writes go to DynamoDB only
- ✅ All reads come from DynamoDB only
- ✅ No MySQL operations
- ✅ Full DynamoDB native performance

#### Migration Steps
1. **Pre-Migration Checklist**
   - ✅ Phase 4 running successfully for extended period
   - ✅ DynamoDB performance meets requirements
   - ✅ All data migration verified complete
   - ✅ MySQL backup completed

2. **Execute Migration**
   ```typescript
   FeatureFlagService.setMigrationPhase(5);
   ```

3. **Post-Migration**
   - Monitor DynamoDB performance
   - Verify all operations working correctly
   - Plan MySQL decommissioning

#### Rollback Procedure
```typescript
// Emergency rollback to Phase 4 (dual-write)
FeatureFlagService.setMigrationPhase(4);

// Full rollback to Phase 1 (MySQL only)
FeatureFlagService.setMigrationPhase(1);
```

#### Troubleshooting
- **Write failures**: Check DynamoDB capacity and permissions
- **Data loss concerns**: Verify backup procedures
- **Performance degradation**: Review DynamoDB configuration

## Emergency Procedures

### Immediate Rollback to MySQL Only
```typescript
// Emergency rollback from any phase
FeatureFlagService.setMigrationPhase(1);
```

### Partial Rollback Strategies
```typescript
// From Phase 5 to Phase 4 (restore dual-write)
FeatureFlagService.setMigrationPhase(4);

// From Phase 4 to Phase 3 (restore validation)
FeatureFlagService.setMigrationPhase(3);

// From Phase 3 to Phase 2 (disable validation)
FeatureFlagService.setMigrationPhase(2);
```

## Monitoring and Logging

### Key Metrics to Monitor
- **Write Success Rate**: MySQL vs DynamoDB write success rates
- **Read Latency**: Response times for each database
- **Validation Error Rate**: Percentage of validation failures
- **Data Consistency**: Spot-check consistency between databases

### Log Analysis
```bash
# Monitor dual-write operations
grep "DualWrite" application.log

# Check validation errors
grep "Data validation failed" application.log

# Monitor phase transitions
grep "Migration phase" application.log
```

### Health Checks
```typescript
// Verify current migration state
const flags = FeatureFlagService.getAllFlags();
console.log('Current Phase:', flags.migration_phase);
console.log('Dual Write:', flags.dual_write_enabled);
console.log('Read Source:', flags.read_from_dynamodb ? 'DynamoDB' : 'MySQL');
```

## Best Practices

### Migration Timing
- **Phase 1 → 2**: During low-traffic periods
- **Phase 2 → 3**: After dual-write stability confirmed
- **Phase 3 → 4**: After validation error rate < 0.1%
- **Phase 4 → 5**: After extended Phase 4 stability

### Data Validation
- Run validation for at least 24 hours in Phase 3
- Investigate all validation errors before proceeding
- Maintain validation logs for audit purposes

### Performance Considerations
- Monitor write latency increase in dual-write phases
- Plan for increased DynamoDB capacity during migration
- Consider read replica strategies for high-traffic applications

### Rollback Readiness
- Always have rollback procedures tested and ready
- Maintain MySQL data integrity throughout migration
- Keep monitoring dashboards active during all phases

## Troubleshooting Common Issues

### Data Inconsistency Issues
1. **ID Mismatches**: Verify ID transformation logic
2. **Date Precision**: Check timestamp handling
3. **Null Values**: Review null vs empty string handling
4. **Type Conversions**: Validate data type mappings

### Performance Issues
1. **Write Latency**: Optimize dual-write operations
2. **Read Latency**: Review DynamoDB indexes and capacity
3. **Memory Usage**: Monitor application memory during dual operations
4. **Connection Pooling**: Verify database connection management

### System Integration Issues
1. **Feature Flag Persistence**: Verify flag storage and retrieval
2. **Service Dependencies**: Check dependent service compatibility
3. **Monitoring Integration**: Ensure logging and metrics collection
4. **Backup Procedures**: Validate backup and restore processes

## Success Criteria

### Phase Completion Criteria
- **Phase 2**: 99%+ dual-write success rate for 24 hours
- **Phase 3**: <0.1% validation error rate for 24 hours  
- **Phase 4**: Stable DynamoDB read performance for 48 hours
- **Phase 5**: Full DynamoDB operation for 72 hours

### Migration Success Indicators
- ✅ Zero data loss during migration
- ✅ Application performance within acceptable limits
- ✅ All validation errors resolved
- ✅ Successful rollback testing completed
- ✅ Monitoring and alerting systems operational

---

## Support and Escalation

For migration issues or questions:
1. Check this guide for common solutions
2. Review application logs for specific error messages
3. Consult the development team for technical issues
4. Have rollback procedures ready for emergency situations

**Remember**: The migration is designed to be safe and reversible. When in doubt, rollback to a previous phase and investigate issues before proceeding.
