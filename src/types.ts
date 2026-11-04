// Shared web types (was missing — mockData.ts imports from here).
export interface CodeFile {
  id: string;
  name: string;
  language: string;
  icon: string;
  description: string;
  content: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  avatarIcon: string;
  contextWindow: string;
  costPer1k: number;
  badge: string;
  defaultTtft: number;
  typicalThroughput: number;
}

export interface ProviderApiConfig {
  id: string;
  name: string;
  category: string;
  logo: string;
  status: string;
  apiKey: string;
  endpointUrl: string;
  latencyMs: number;
  models: string[];
  description: string;
}

export interface FineTuneMessage {
  role: string;
  content: string;
}

export interface FineTuneItem {
  id: string;
  task: string;
  framework: string;
  messages: FineTuneMessage[];
}
