// ─── WMHQ Metric Explanations ─────────────────────────────────────────────────
// Dual-mode educational content for Money Dashboard metric cards.
// simple  → plain language for members new to business finance
// expert  → strategic/operator-level framing for experienced founders

export const EXPLANATIONS = {

  revenue: {
    simple: {
      howItWorks: 'The total money your business received from sales this week — before any costs are subtracted.',
      whyItMatters: 'Revenue is the starting point for everything. All your costs, margins, and profit flow from this number.',
    },
    expert: {
      howItWorks: 'Gross top-line inflows for the period, before COGS or operating expenses are deducted.',
      whyItMatters: 'Revenue growth signals traction, but it\'s meaningless without margin. Watch for revenue expansion paired with margin compression — a common early sign of a volume trap.',
    },
  },

  grossProfit: {
    simple: {
      howItWorks: 'What\'s left from your revenue after subtracting the direct cost of making or delivering your product.',
      whyItMatters: 'Low gross profit means very little room to cover your other expenses. It\'s the foundation your business runs on.',
    },
    expert: {
      howItWorks: 'Revenue minus COGS (product) or delivery costs (service). Contribution margin before fixed operating costs.',
      whyItMatters: 'Gross profit sets the ceiling on your operating leverage. A thin gross profit forces volume-led growth, which is harder to sustain and scale profitably.',
    },
  },

  grossMargin: {
    simple: {
      howItWorks: 'The percentage of each sale you keep after covering direct costs. E.g. if you earn $100 and direct costs are $40, your gross margin is 60%.',
      whyItMatters: 'A strong gross margin means you have enough room to cover your expenses and still make money. A weak one means you\'re running very tight.',
    },
    expert: {
      howItWorks: 'Gross profit as a percentage of revenue. Reflects direct cost efficiency and the structural ceiling on pricing power.',
      whyItMatters: 'Gross margin is a structural constraint, not just a performance metric. It determines operating flexibility, reinvestment capacity, and the maximum achievable net margin. Compression here is hard to fix without repricing or renegotiating COGS.',
    },
  },

  netProfit: {
    simple: {
      howItWorks: 'What\'s left after ALL costs — direct costs and all other expenses — have been subtracted from your revenue.',
      whyItMatters: 'This is the real measure of whether your business made money this week. Everything else is context.',
    },
    expert: {
      howItWorks: 'Revenue minus total expenses (COGS + variable costs + fixed operating expenses). Bottom-line profitability for the period.',
      whyItMatters: 'Net profit determines sustainability. Sustained negative net margin is a structural problem — not just a bad week. It means the business currently requires revenue growth simply to break even, which is an unstable long-term position.',
    },
  },

  netMargin: {
    simple: {
      howItWorks: 'The percentage of your revenue you actually keep as profit. E.g. a 20% net margin means for every $100 earned, you keep $20.',
      whyItMatters: 'The higher this is, the more efficient your business is at turning revenue into real profit. A low number means your costs are eating most of what you earn.',
    },
    expert: {
      howItWorks: 'Net profit as a percentage of revenue. The clearest measure of overall operational efficiency.',
      whyItMatters: 'Net margin compression is often the first indicator of a cost structure problem. Even with strong revenue growth, a declining net margin signals that the business is running harder to stand still — and needs structural intervention, not just more sales.',
    },
  },

  inventoryTurnover: {
    simple: {
      howItWorks: 'How many times your stock "turned over" relative to what you held — essentially, how fast your products sold.',
      whyItMatters: 'Fast turnover means cash keeps flowing through the business. Slow turnover means money is sitting in unsold stock instead of working for you.',
    },
    expert: {
      howItWorks: 'COGS divided by average inventory value for the period. A proxy for capital velocity in the inventory cycle.',
      whyItMatters: 'Low turnover creates working capital drag and increases dead stock risk. It also constrains your ability to respond quickly to demand shifts or introduce new product lines without overextending cash.',
    },
  },

  capacityPressure: {
    simple: {
      howItWorks: 'How full your client roster is compared to the maximum number of clients you can handle at once. 80% means 8 out of 10 available slots are filled.',
      whyItMatters: 'High pressure means you\'re close to your delivery ceiling. Low pressure means you have room to grow — or signals that you need more clients.',
    },
    expert: {
      howItWorks: 'Active clients as a proportion of maximum client capacity. Reflects delivery risk and near-term revenue ceiling.',
      whyItMatters: 'Above 90%: an operational constraint that limits growth and increases churn risk. Below 50%: a utilisation problem pointing to pricing, positioning, or pipeline gaps. Neither extreme is healthy long-term — the target zone is 70–85%.',
    },
  },

  utilisation: {
    simple: {
      howItWorks: 'The percentage of your working hours that were spent on billable, client-facing work this week.',
      whyItMatters: 'Higher utilisation means more of your time is generating income. A low number means a lot of your time is going to admin, prep, or non-billable work.',
    },
    expert: {
      howItWorks: 'Billable hours as a proportion of total working hours (billable + admin). Period-level delivery efficiency.',
      whyItMatters: 'Utilisation rate is the primary efficiency lever in service businesses. Low utilisation at high revenue signals pricing leverage opportunity. Low utilisation at low revenue indicates a delivery bottleneck or a pipeline constraint requiring attention upstream.',
    },
  },

  conversionRate: {
    simple: {
      howItWorks: 'The percentage of your sales calls that turned into actual paying clients this week.',
      whyItMatters: 'A high conversion rate means your offer and sales process are resonating. A low one points to a gap — whether that\'s the offer itself, how it\'s presented, or who you\'re talking to.',
    },
    expert: {
      howItWorks: 'Sales closed as a proportion of sales calls booked for the period. Isolates sales execution from lead volume.',
      whyItMatters: 'A declining conversion rate despite consistent call volume is a leading indicator of offer-market misalignment or sales process degradation. It should be investigated separately from pipeline volume metrics to avoid misdiagnosing the problem.',
    },
  },

  aov: {
    simple: {
      howItWorks: 'The average amount each customer spent per order this week, calculated by dividing total revenue by the number of orders.',
      whyItMatters: 'A higher AOV means each sale earns you more, which makes it easier to cover your costs and grow your profit without needing more customers.',
    },
    expert: {
      howItWorks: 'Revenue divided by order count. Core unit economics metric for product businesses.',
      whyItMatters: 'AOV directly impacts CAC payback period and gross margin efficiency. Increasing AOV without increasing COGS is one of the highest-leverage, lowest-risk ways to improve profitability — without needing more traffic or customers.',
    },
  },

  cac: {
    simple: {
      howItWorks: 'How much it cost to acquire each new customer this week — your marketing spend divided by the number of new customers gained.',
      whyItMatters: 'If it costs you more to get a customer than they spend with you, your growth is costing you money. The goal is to keep CAC well below what a customer is worth.',
    },
    expert: {
      howItWorks: 'Marketing spend divided by new customers acquired for the period. A period-level proxy for acquisition efficiency.',
      whyItMatters: 'CAC relative to AOV or LTV determines whether acquisition is a value multiplier or a cash drain. CAC should trend downward over time as brand equity, organic channels, and retention levers reduce your dependence on paid acquisition.',
    },
  },

  repeatRate: {
    simple: {
      howItWorks: 'The percentage of your customers this week who were repeat buyers rather than first-time customers.',
      whyItMatters: 'Repeat customers cost less to retain than new ones cost to acquire. A high repeat rate means your product keeps people coming back — which is a strong sign of product quality and loyalty.',
    },
    expert: {
      howItWorks: 'Repeat customers as a proportion of total customers for the period.',
      whyItMatters: 'Repeat rate is a direct indicator of retention leverage and LTV trajectory. High repeat rate reduces structural CAC dependency, improves LTV:CAC, and signals product-market resonance. Declining repeat rate — even with growing revenue — is a red flag for long-term cohort health.',
    },
  },

  sellThrough: {
    simple: {
      howItWorks: 'The percentage of your available stock that actually sold this week — units sold divided by units available.',
      whyItMatters: 'A high sell-through rate means demand is strong and your stock is moving well. A low rate means inventory is building up, which ties up cash.',
    },
    expert: {
      howItWorks: 'Units sold divided by total available units (sold + on hand). A demand-side efficiency metric for product businesses.',
      whyItMatters: 'Low sell-through is a leading indicator of over-purchasing, demand forecasting errors, or weakening product-market fit. It directly impacts inventory turnover, cash conversion cycle, and markdown risk.',
    },
  },

}
