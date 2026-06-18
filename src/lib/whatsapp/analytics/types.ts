export interface TimeStats {
  averageMs: number;
  medianMs: number;
  p90Ms: number;
  averageLabel: string;
  medianLabel: string;
  p90Label: string;
}

export interface ResponseDistributionBucket {
  label: string;
  count: number;
  pct: number;
}

export interface SlaStats {
  met: number;
  missed: number;
  pending: number;
  metPct: number;
  missedPct: number;
}

export interface SegmentMetric {
  label: string;
  key?: string;
  outbound: number;
  responded: number;
  responseRate: number;
  engaged: number;
  engagementRate: number;
  multiReply: number;
  multiReplyRate: number;
  avgCustomerReplyMs: number;
  avgAgentReplyMs: number;
}

export interface TemplateMetric {
  templateName: string;
  sent: number;
  delivered: number;
  read: number;
  responded: number;
  responseRate: number;
  deliveryRate: number;
  avgReplyMs: number;
  visits: number;
  goodToGo: number;
  bookings: number;
}

export interface FunnelMetrics {
  outbound: number;
  customerResponded: number;
  agentReplied: number;
  engaged: number;
  visits: number;
  goodToGo: number;
  bookings: number;
  replyToVisitRate: number;
  visitToGoodToGoRate: number;
  goodToGoToBookingRate: number;
  replyToBookingRate: number;
}

export interface OperationalMetrics {
  activeConversations: number;
  dormantConversations: number;
  unansweredConversations: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  dormantLeads: number;
}

export interface LocationAnalyticsRow {
  locationKey: string;
  location: string;
  outbound: number;
  responded: number;
  responseRate: number;
  avgCustomerReplyMs: number;
  avgAgentReplyMs: number;
  visitRate: number;
  bookingRate: number;
  hotLeads: number;
  ownerCount: number;
  guestCount: number;
  shortTermCount: number;
  longTermCount: number;
}

export interface AgentAnalyticsRow {
  agentId: string;
  name: string;
  outbound: number;
  responded: number;
  responseRate: number;
  avgAgentReplyMs: number;
  conversations: number;
  slaMetPct: number;
}

export interface WhatsAppOverviewResponse {
  kpis: {
    customerResponseRate: number;
    avgCustomerReplyTime: TimeStats;
    agentResponseRate: number;
    avgAgentReplyTime: TimeStats;
  };
  operational: OperationalMetrics;
  sla: SlaStats;
  responseDistribution: ResponseDistributionBucket[];
  ownerGuestStats: SegmentMetric[];
  rentalTypeStats: SegmentMetric[];
  locationStats: {
    rows: LocationAnalyticsRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  locationMapRows: LocationAnalyticsRow[];
  agentStats: AgentAnalyticsRow[];
  templateStats: {
    rows: TemplateMetric[];
    total: number;
    page: number;
    pageSize: number;
  };
  funnel: FunnelMetrics;
  callStats: {
    total: number;
    connected: number;
    missed: number;
    declined: number;
    avgDurationSeconds: number;
  };
  generatedAt: string;
}
