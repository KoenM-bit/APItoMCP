import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Database, 
  Settings, 
  Play, 
  Code,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface VisualMapperProps {
  endpoints: any[];
  info: any;
  servers: any[];
  onNext: (data: any) => void;
  onBack: () => void;
}

export const VisualMapper: React.FC<VisualMapperProps> = ({ 
  endpoints = [], 
  info = {},
  servers = [], 
  onNext, 
  onBack 
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Generate initial nodes from real API endpoints
  const generateInitialNodes = () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create endpoint nodes
    endpoints.forEach((endpoint, index) => {
      const methodColors = {
        'GET': 'from-blue-500 to-blue-600',
        'POST': 'from-green-500 to-green-600',
        'PUT': 'from-yellow-500 to-yellow-600',
        'DELETE': 'from-red-500 to-red-600',
        'PATCH': 'from-purple-500 to-purple-600'
      };

      const color = methodColors[endpoint.method as keyof typeof methodColors] || 'from-gray-500 to-gray-600';

      nodes.push({
        id: endpoint.id,
        type: 'input',
        data: { 
          label: (
            <div className={`p-2 bg-gradient-to-r ${color} text-white rounded-lg min-w-[160px]`}>
              <div className="font-semibold text-sm">{endpoint.method} {endpoint.path}</div>
              <div className="text-xs opacity-90 mt-1 line-clamp-2">{endpoint.description}</div>
              {endpoint.parameters.length > 0 && (
                <div className="text-xs opacity-75 mt-1">
                  {endpoint.parameters.length} param{endpoint.parameters.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ),
          endpoint
        },
        position: { x: 100, y: 80 + (index * 100) },
        style: { border: 'none', background: 'transparent' }
      });
    });

    // Create individual tool nodes for each endpoint
    const tools = groupEndpointsByFunction(endpoints);
    
    tools.forEach((tool, index) => {
      const toolId = `tool-${index}`;
      const endpoint = tool.endpoints[0]; // Single endpoint per tool
      
      nodes.push({
        id: toolId,
        data: { 
          label: (
            <div className="p-3 bg-white border-2 border-purple-300 rounded-lg shadow-sm min-w-[200px]">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-3 h-3 text-purple-600" />
                <span className="font-semibold text-purple-900 text-sm">{tool.name}</span>
              </div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-2">{tool.description}</div>
              <div className="text-xs text-gray-500">
                {endpoint.method} {endpoint.path}
              </div>
            </div>
          ),
          type: 'tool',
          group: tool // Keep for backward compatibility
        },
        position: { x: 400, y: 80 + (index * 100) },
        style: { border: 'none', background: 'transparent' }
      });

      // Connect endpoint to this tool
      edges.push({
        id: `${endpoint.id}-${toolId}`,
        source: endpoint.id,
        target: toolId,
        type: 'smoothstep',
        style: { stroke: '#8B5CF6', strokeWidth: 2 }
      });
    });

    // Create resource nodes for GET endpoints that return data
    const resourceEndpoints = endpoints.filter(ep => 
      ep.method === 'GET' && 
      !ep.path.includes('{') && // Not parameterized
      ep.responses.some((r: any) => r.statusCode >= 200 && r.statusCode < 300)
    );

    resourceEndpoints.forEach((endpoint, index) => {
      const resourceId = `resource-${index}`;
      const resourceName = endpoint.path.split('/').pop() || 'Data';
      
      nodes.push({
        id: resourceId,
        data: { 
          label: (
            <div className="p-3 bg-white border-2 border-emerald-300 rounded-lg shadow-sm min-w-[200px]">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="w-3 h-3 text-emerald-600" />
                <span className="font-semibold text-emerald-900 text-sm">{resourceName} Resource</span>
              </div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                Data from {endpoint.path}
              </div>
              <div className="text-xs text-gray-500">
                MCP Resource for {endpoint.description}
              </div>
            </div>
          ),
          type: 'resource',
          endpoint
        },
        position: { x: 700, y: 80 + (index * 120) },
        style: { border: 'none', background: 'transparent' }
      });

      // Connect endpoint to resource
      edges.push({
        id: `${endpoint.id}-${resourceId}`,
        source: endpoint.id,
        target: resourceId,
        type: 'smoothstep',
        style: { stroke: '#10B981', strokeWidth: 2 }
      });
    });

    return { nodes, edges };
  };

  const groupEndpointsByFunction = (endpoints: any[]) => {
    // Instead of grouping, create individual tools for each endpoint
    const tools: any[] = [];

    endpoints.forEach(endpoint => {
      const pathParts = endpoint.path.split('/').filter(Boolean);
      const method = endpoint.method.toLowerCase();
      
      // Better resource extraction logic
      let resourceName = '';
      let toolName = '';
      let description = '';
      
      // Handle different path patterns
      if (pathParts.length === 1) {
        // Simple case: /posts, /users, /comments
        resourceName = pathParts[0];
      } else if (pathParts.length === 2 && pathParts[1].includes('{')) {
        // Pattern: /posts/{id}, /users/{id}
        resourceName = pathParts[0];
      } else if (pathParts.length === 3 && pathParts[1].includes('{')) {
        // Pattern: /posts/{id}/comments, /users/{id}/posts
        resourceName = pathParts[2]; // Use the final resource
      } else {
        // Fallback: use the last non-parameter part
        resourceName = pathParts.find(part => !part.includes('{')) || pathParts[0] || 'api';
      }
      
      // Clean up resource name and get singular form
      resourceName = resourceName.replace(/[{}]/g, '');
      const singularResource = resourceName.endsWith('s') ? resourceName.slice(0, -1) : resourceName;
      
      // Generate tool names based on method and path structure
      if (method === 'get' && !endpoint.path.includes('{')) {
        // GET /posts -> get_all_posts
        toolName = `get_all_${resourceName}`;
        description = `Get all ${resourceName}`;
      } else if (method === 'get' && endpoint.path.includes('{')) {
        if (pathParts.length === 2) {
          // GET /posts/{id} -> get_post_by_id
          toolName = `get_${singularResource}_by_id`;
          description = `Get a specific ${singularResource} by ID`;
        } else if (pathParts.length === 3) {
          // GET /users/{id}/posts -> get_user_posts
          const parentResource = pathParts[0].endsWith('s') ? pathParts[0].slice(0, -1) : pathParts[0];
          toolName = `get_${parentResource}_${resourceName}`;
          description = `Get all ${resourceName} for a specific ${parentResource}`;
        } else {
          // Fallback for complex paths
          toolName = `get_${singularResource}`;
          description = `Get ${singularResource} from ${endpoint.path}`;
        }
      } else if (method === 'post') {
        // POST /posts -> create_post
        toolName = `create_${singularResource}`;
        description = `Create a new ${singularResource}`;
      } else if (method === 'put') {
        // PUT /posts/{id} -> update_post
        toolName = `update_${singularResource}`;
        description = `Update an existing ${singularResource}`;
      } else if (method === 'delete') {
        // DELETE /posts/{id} -> delete_post
        toolName = `delete_${singularResource}`;
        description = `Delete a ${singularResource}`;
      } else if (method === 'patch') {
        // PATCH /posts/{id} -> patch_post
        toolName = `patch_${singularResource}`;
        description = `Partially update a ${singularResource}`;
      } else {
        // Fallback for other methods
        toolName = `${method}_${singularResource}`;
        description = `${method.toUpperCase()} operation on ${singularResource}`;
      }

      tools.push({
        name: toolName,
        description: description,
        endpoints: [endpoint], // Single endpoint per tool
        method: endpoint.method,
        path: endpoint.path,
        resourceName: singularResource
      });
    });

    return tools;
  };

  const { nodes: initialNodes, edges: initialEdges } = generateInitialNodes();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleGenerateCode = () => {
    // Extract tools and resources from the current mapping
    const tools = nodes
      .filter(node => node.data.type === 'tool')
      .map(node => ({
        name: node.data.group.name,
        description: node.data.group.description,
        endpoints: node.data.group.endpoints,
        resourceName: node.data.group.resourceName,
        inputSchema: generateToolSchema(node.data.group)
      }));

    const resources = nodes
      .filter(node => node.data.type === 'resource')
      .map(node => {
        const resourceName = node.data.endpoint.path.split('/').pop() || 'data';
        return {
          name: `All ${resourceName.charAt(0).toUpperCase()}${resourceName.slice(1)}`,
          description: `All ${resourceName} from the API`,
          uri: `${resourceName}://all`,
          path: node.data.endpoint.path,
          endpoint: node.data.endpoint
        };
      });

    onNext({
      nodes,
      edges,
      tools,
      resources,
      endpoints,
      apiInfo: {
        ...info,
        servers
      }
    });
  };

  const generateToolSchema = (tool: any) => {
    const properties: any = {};
    const required: string[] = [];
    
    const endpoint = tool.endpoints[0];
    if (!endpoint) return { type: 'object', properties: {} };

    // Add parameters from the endpoint
    endpoint.parameters.forEach((param: any) => {
      properties[param.name] = {
        type: param.type || 'string',
        description: param.description || `${param.name} parameter`
      };
      
      if (param.example) {
        properties[param.name].example = param.example;
      }
      
      // Add validation constraints
      if (param.type === 'integer') {
        properties[param.name].minimum = 1;
      }
      
      if (param.required) {
        required.push(param.name);
      }
    });

    // Add additional schema for POST/PUT operations based on resource type
    const method = endpoint.method?.toLowerCase();
    if (method === 'post' || method === 'put' || method === 'patch') {
      if (tool.name.includes('post')) {
        properties.userId = { type: 'integer', description: 'User ID creating the post', minimum: 1 };
        properties.title = { type: 'string', description: 'Post title' };
        properties.body = { type: 'string', description: 'Post content' };
        if (method === 'post') {
          required.push('userId', 'title', 'body');
        }
      } else if (tool.name.includes('user')) {
        properties.name = { type: 'string', description: 'User full name' };
        properties.username = { type: 'string', description: 'Username' };
        properties.email = { type: 'string', description: 'Email address' };
        if (method === 'post') {
          required.push('name', 'username', 'email');
        }
      } else if (tool.name.includes('comment')) {
        properties.postId = { type: 'integer', description: 'Post ID for the comment', minimum: 1 };
        properties.name = { type: 'string', description: 'Commenter name' };
        properties.email = { type: 'string', description: 'Commenter email' };
        properties.body = { type: 'string', description: 'Comment content' };
        if (method === 'post') {
          required.push('postId', 'name', 'email', 'body');
        }
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Visual MCP Mapper</h1>
            <p className="text-sm text-gray-600">
              {info.title ? `Mapping ${info.title} API` : 'Map your API endpoints to MCP tools and resources'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="w-3 h-3 mr-1" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
            <Button size="sm" onClick={handleGenerateCode}>
              <Code className="w-3 h-3 mr-1" />
              Generate Code
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Collapsible Sidebar */}
        <div className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-12' : 'w-64'
        }`}>
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="font-semibold text-gray-900 text-sm">API Information</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded hover:bg-gray-200"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* API Info */}
              <div>
                {info.title && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-700">API Title</div>
                    <div className="text-xs text-gray-600">{info.title}</div>
                  </div>
                )}
                {info.version && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-700">Version</div>
                    <div className="text-xs text-gray-600">{info.version}</div>
                  </div>
                )}
                {info.description && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-700">Description</div>
                    <div className="text-xs text-gray-600 line-clamp-3">{info.description}</div>
                  </div>
                )}
              </div>

              {/* Endpoints */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Endpoints ({endpoints.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {endpoints.map((endpoint, index) => (
                    <motion.div
                      key={endpoint.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="p-2 bg-white rounded-lg border border-gray-200 text-xs"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-1 py-0.5 text-xs font-medium rounded ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                          endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {endpoint.method}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 mb-1 line-clamp-1">{endpoint.path}</div>
                      <div className="text-gray-600 line-clamp-2">{endpoint.description}</div>
                      {endpoint.parameters.length > 0 && (
                        <div className="text-gray-500 mt-1">
                          {endpoint.parameters.length} param{endpoint.parameters.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* MCP Components */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">MCP Components</h3>
                <div className="space-y-2">
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Zap className="w-3 h-3 text-purple-600" />
                      <span className="font-medium text-purple-900 text-xs">Tools</span>
                    </div>
                    <p className="text-xs text-purple-700">Functions that Claude can call</p>
                  </div>
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Database className="w-3 h-3 text-emerald-600" />
                      <span className="font-medium text-emerald-900 text-xs">Resources</span>
                    </div>
                    <p className="text-xs text-emerald-700">Data that Claude can read</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Authentication
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <Play className="w-3 h-3 mr-1" />
                    Test Mapping
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.data.type === 'tool') return '#8B5CF6';
                if (node.data.type === 'resource') return '#10B981';
                return '#3B82F6';
              }}
              maskColor="rgb(240, 240, 240, 0.6)"
            />
            <Panel position="top-right">
              <Card className="w-48">
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-sm">Mapping Stats</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">API Endpoints:</span>
                      <span className="font-medium">{endpoints.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MCP Tools:</span>
                      <span className="font-medium">
                        {nodes.filter(n => n.data.type === 'tool').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">MCP Resources:</span>
                      <span className="font-medium">
                        {nodes.filter(n => n.data.type === 'resource').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Panel>
          </ReactFlow>
        </div>

        {/* Code Preview Sidebar */}
        {showPreview && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 320 }}
            exit={{ width: 0 }}
            className="bg-gray-900 text-white overflow-hidden"
          >
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-semibold text-sm">Generated Code Preview</h3>
            </div>
            <div className="p-3 font-mono text-xs">
              <pre className="text-green-400">
{`# Generated MCP Server for ${info.title || 'API'}
from mcp.server import Server
from mcp.types import Tool, Resource

server = Server("${(info.title || 'api').toLowerCase().replace(/\s+/g, '-')}-server")

# Generated from ${endpoints.length} API endpoints
# Tools: ${nodes.filter(n => n.data.type === 'tool').length}
# Resources: ${nodes.filter(n => n.data.type === 'resource').length}

@server.list_tools()
async def list_tools():
    return [
        # Auto-generated tools based on your API
        ${nodes.filter(n => n.data.type === 'tool').map(n => 
          `Tool(name="${n.data.group.name.toLowerCase().replace(/\s+/g, '_')}", description="${n.data.group.description}")`
        ).join(',\n        ')}
    ]`}
              </pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};