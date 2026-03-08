export type SerpApiConfig = {
  apiKey: string;
  resultCount?: number;
};

export type OrganicResult = {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  snippet?: string;
  source?: string;
  sitelinks?: {
    inline?: Array<{ title?: string; link?: string }>;
  };
  rich_snippet?: {
    bottom?: { extensions?: string[] };
  };
};

export type RelatedQuestion = {
  question?: string;
  snippet?: string;
  title?: string;
  link?: string;
  displayed_link?: string;
  list?: string[];
};

export type KnowledgeGraph = {
  title?: string;
  type?: string;
  description?: string;
  source?: { name?: string; link?: string };
};

export type AnswerBox = {
  type?: string;
  title?: string;
  answer?: string;
  snippet?: string;
  link?: string;
  displayed_link?: string;
};

export type SearchInformation = {
  query_displayed?: string;
  total_results?: number;
  time_taken_displayed?: number;
};

export type SearchMetadata = {
  status?: string;
  total_time_taken?: number;
};

export type SerpApiAccountInfo = {
  plan_searches_left?: number;
  total_searches_left?: number;
  this_month_usage?: number;
};

export type SerpApiResponse = {
  search_metadata?: SearchMetadata;
  search_information?: SearchInformation;
  answer_box?: AnswerBox;
  knowledge_graph?: KnowledgeGraph;
  organic_results?: OrganicResult[];
  related_questions?: RelatedQuestion[];
  error?: string;
};

export type OpenClawPluginLogger = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type OpenClawPluginApi = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  config: any;
  pluginConfig?: Record<string, unknown>;
  logger: OpenClawPluginLogger;
  registerTool: (tool: any, opts?: any) => void;
};
