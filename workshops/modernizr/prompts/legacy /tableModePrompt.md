DynamoDB Capacity Mode Decision Framework Prompt
Core Mission

Select the optimal DynamoDB capacity mode (Provisioned vs On-Demand) using a data-driven framework that balances cost efficiency, performance requirements, and operational overhead.

Quick Decision Matrix

Scenario
	Recommended Mode
	Key Indicators

New workload
	On-Demand
	No historical data; need baseline metrics

Utilization < 15%
	On-Demand
	Over-provisioned; paying for idle capacity

Utilization ≥ 15-20%
	Provisioned + Auto-Scaling
	Cost-optimal threshold; predictable workload

Frequent throttles
	On-Demand OR increase limits
	Performance > cost; SLO priority

Steady ≥1 year
	Provisioned + Reserved
	Maximum savings (54-76% discount)

Limited ops resources
	On-Demand
	Eliminates capacity planning overhead

Spike ratio (P100/μ) > 10
	On-Demand
	Highly variable traffic patterns



Step-by-Step Analysis Process

1. Collect Metrics (30 days minimum, 1-minute granularity)

Export these CloudWatch metrics as CSV or Parquet:

- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits  
- ProvisionedReadCapacityUnits (if applicable)
- ProvisionedWriteCapacityUnits (if applicable)
- UserErrors.ThrottledRequests (read & write)

Why 30 days? Captures weekly patterns while reflecting current trends.

2. Calculate Utilization

For every hour h in your sample window:

Utilization_h = ConsumedCapacityUnits_h / max(ProvisionedCapacityUnits_h, 1)

Extract these key metrics:

* Average utilization (μ): Overall efficiency indicator
* P95 utilization: Peak load handling capability
* P100 utilization: Maximum spike observed
* Spike ratio: P100/μ (volatility indicator)

3. Perform Cost Analysis

On-Demand Pricing (us-east-1)

Cost_OnDemand = (Total_RRU × $0.25/million) + (Total_WRU × $1.25/million)

Provisioned Pricing

Cost_Provisioned = Σ[(ProvisionedRCU_h × $0.00013) + (ProvisionedWCU_h × $0.00065)] × hours

Break-Even Mathematics

* 1 WCU = 3,600 writes/hour at 100% utilization
* Effective provisioned cost: ~$0.18 per million WRU
* On-Demand costs ~7x more at full utilization
* Critical threshold: ~15% utilization

4. Assess Performance & Operational Factors

Throttling Impact

Throttle_Cost = Throttle_Count × (Retry_Latency_ms × Request_Value)

* Any throttles in provisioned mode = potential SLO violations
* On-Demand eliminates throttles (except >2x previous peak surges)

Operational Overhead

Ops_Cost = Engineer_Hours × Fully_Loaded_Rate × Time_Percentage

Typical allocation: 5-10% of engineer time for:

* Alarm management
* Capacity planning
* Min/max band adjustments
* Growth modeling

5. Apply Decision Formula

Total_Cost_Provisioned = Infrastructure_Cost + Throttle_Impact_Cost + Ops_Hours_Cost
Total_Cost_OnDemand = Request_Based_Cost

if (μ < 0.15) OR (P100/μ > 10) OR (Throttles > SLO_Threshold):
    choose ON_DEMAND
elif (μ ≥ 0.15) AND (Throttles == 0) AND (Traffic_Stable):
    choose PROVISIONED
    if (Workload_Duration ≥ 1_year) AND (Capacity ≥ 100_units):
        add RESERVED_CAPACITY


Real-World Example

Given 30-day metrics:

* 20 billion reads, 3 billion writes
* Current provisioned: 1,000 RCU, 300 WCU
* Average utilization: 22%
* Zero throttles

Cost Comparison:

On-Demand: 
  (20,000M × $0.25) + (3,000M × $1.25) = $8,750

Provisioned:
  (1,000 × $0.00013 + 300 × $0.00065) × 720 hours = $234

Savings: 97% with provisioned mode
Decision: PROVISIONED (utilization > 15%, stable traffic, no throttles)


Implementation Strategy

Phase 1: Establish Baseline (New Workloads)

1. Start with On-Demand - no capacity planning needed
2. Collect 30+ days of production metrics
3. Document traffic patterns and peak events

Phase 2: Analyze & Decide

1. Run this framework using collected metrics
2. Calculate total costs including ops overhead
3. Assess performance requirements vs throttle tolerance

Phase 3: Execute & Optimize

1. Switch modes if savings > 20% (24-hour cooldown applies)
2. Monitor for 7 days to validate decision
3. Re-evaluate monthly as traffic evolves

Phase 4: Long-term Optimization

* Reserved Capacity: Consider after 6+ months of stable provisioned mode
* Auto-scaling tuning: Refine min/max bands based on actual patterns
* Automation: Implement monthly reports using capacity-mode-evaluator


Advanced Considerations

When to Override the Math

Choose On-Demand despite higher cost when:

* Customer-facing latency SLOs are critical
* Traffic patterns are genuinely unpredictable
* Engineering team lacks DynamoDB expertise
* Rapid experimentation phase with changing access patterns

Choose Provisioned despite operational overhead when:

* Cost reduction is a primary KPI
* Traffic patterns are well-understood
* Team has mature monitoring/alerting
* Workload qualifies for reserved capacity

Mode Switching Best Practices

* Timing: Switch during low-traffic windows
* Reserved Capacity: Switching flushes discounts - plan accordingly
* Cooldown: 24-hour lockout after each switch
* Testing: Use separate dev/staging tables to validate