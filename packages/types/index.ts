export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'DEVELOPER' | 'ORG_ADMIN' | 'VIEWER';
  is_active: boolean;
  created_at: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  database: {
    status: string;
    database_type: string;
  };
  redis: {
    status: string;
    mode: string;
    version?: string;
  };
  timestamp: string;
}

export interface ApiKey {
  id: string;
  project_id: string;
  key_prefix: string;
  name: string;
  budget_usd: number | null;
  spend_usd: number;
  is_active: boolean;
  created_at: string;
}

export interface RequestLog {
  id: string;
  request_id: string;
  model_requested: string;
  model_executed: string;
  provider_code: string;
  status_code: number;
  latency_ms: number;
  cost_usd: number;
  created_at: string;
}
