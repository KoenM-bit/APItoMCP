export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  parameters: Parameter[];
  responses: APIResponse[];
  authentication?: AuthMethod;
  tags?: string[];
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  example?: any;
  location: 'query' | 'header' | 'path' | 'body';
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: any;
}

export interface AuthMethod {
  type: 'apiKey' | 'bearer' | 'oauth2' | 'basic';
  location?: 'header' | 'query';
  name?: string;
  description?: string;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  inputSchema: any;
  mappedEndpoints: string[];
  transformations?: any;
}

export interface MCPResource {
  id: string;
  name: string;
  description: string;
  uri: string;
  mimeType?: string;
  mappedEndpoints: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  apiSpec?: any;
  endpoints: APIEndpoint[];
  tools: MCPTool[];
  resources: MCPResource[];
  authentication?: AuthMethod;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'enterprise';
  projects: Project[];
}

export interface GeneratedServer {
  id: string;
  projectId: string;
  language: 'python' | 'typescript';
  code: string;
  deploymentUrl?: string;
  status: 'draft' | 'testing' | 'deployed' | 'failed';
  createdAt: Date;
}