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
  ChevronRight,
  Plus,
  Wand2,
  X,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { CustomMethodModal } from './CustomMethodModal';
import { CustomMethod } from '../../types';

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
  const [customMethods, setCustomMethods] = useState<CustomMethod[]>([]);
  const [showCustomMethodModal, setShowCustomMethodModal] = useState(false);
  const [disabledEndpoints, setDisabledEndpoints] = useState<Set<string>>(new Set());
  const [filterMethod, setFilterMethod] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

  // Toggle endpoint enabled/disabled state
  const toggleEndpoint = (endpointId: string) => {
    setDisabledEndpoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(endpointId)) {
        newSet.delete(endpointId);
      } else {
        newSet.add(endpointId);
      }
      return newSet;
    });
  };

  // Handle endpoint selection from visual flow
  const handleEndpointSelect = (endpointId: string) => {
    setSelectedEndpointId(endpointId);
    
    // Auto-scroll to the endpoint in the sidebar
    setTimeout(() => {
      const endpointElement = document.getElementById(`endpoint-${endpointId}`);
      if (endpointElement) {
        endpointElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add a brief highlight effect
        endpointElement.classList.add('highlight-endpoint');
        setTimeout(() => {
          endpointElement.classList.remove('highlight-endpoint');
        }, 2000);
      }
    }, 100);
  };

  // Bulk toggle operations
  const enableAllEndpoints = () => {
    setDisabledEndpoints(new Set());
  };

  const disableAllEndpoints = () => {
    setDisabledEndpoints(new Set(endpoints.map(ep => ep.id)));
  };

  const toggleByMethod = (method: string) => {
    const methodEndpoints = endpoints.filter(ep => ep.method === method);
    const allMethodDisabled = methodEndpoints.every(ep => disabledEndpoints.has(ep.id));
    
    setDisabledEndpoints(prev => {
      const newSet = new Set(prev);
      methodEndpoints.forEach(ep => {
        if (allMethodDisabled) {
          newSet.delete(ep.id);
        } else {
          newSet.add(ep.id);
        }
      });
      return newSet;
    });
  };

  // Filter endpoints based on current filter
  const getFilteredEndpoints = () => {
    switch (filterMethod) {
      case 'enabled':
        return endpoints.filter(ep => !disabledEndpoints.has(ep.id));
      case 'disabled':
        return endpoints.filter(ep => disabledEndpoints.has(ep.id));
      default:
        return endpoints;
    }
  };

  // Generate initial nodes from real API endpoints
  const generateInitialNodes = () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Only include enabled endpoints
    const enabledEndpoints = endpoints.filter(ep => !disabledEndpoints.has(ep.id));

    // Create endpoint nodes with click handlers
    enabledEndpoints.forEach((endpoint, index) => {
      const methodColors = {
        'GET': 'from-blue-500 to-blue-600',
        'POST': 'from-green-500 to-green-600',
        'PUT': 'from-yellow-500 to-yellow-600',
        'DELETE': 'from-red-500 to-red-600',
        'PATCH': 'from-purple-500 to-purple-600'
      };

      const color = methodColors[endpoint.method as keyof typeof methodColors] || 'from-gray-500 to-gray-600';
      const isSelected = selectedEndpointId === endpoint.id;

      nodes.push({
        id: endpoint.id,
        type: 'input',
        data: { 
          label: (
            <div 
              className={`p-2 bg-gradient-to-r ${color} text-white rounded-lg min-w-[160px] cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-500 scale-105' : 'hover:scale-102'
              }`}
              onClick={() => handleEndpointSelect(endpoint.id)}
              title="Click to select this endpoint in the sidebar"
            >
              <div className="font-semibold text-sm">{endpoint.method} {endpoint.path}</div>
              <div className="text-xs opacity-90 mt-1 line-clamp-2">{endpoint.description}</div>
              {endpoint.parameters.length > 0 && (
                <div className="text-xs opacity-75 mt-1">
                  {endpoint.parameters.length} param{endpoint.parameters.length !== 1 ? 's' : ''}
                </div>
              )}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
              )}
            </div>
          ),
          endpoint,
          isSelected
        },
        position: { x: 100, y: 80 + (index * 100) },
        style: { border: 'none', background: 'transparent' }
      });
    });

    // Create individual tool nodes for each enabled endpoint
    const tools = groupEndpointsByFunction(enabledEndpoints);
    
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

    // Add custom method nodes
    customMethods.forEach((customMethod, index) => {
      const customToolId = `custom-tool-${index}`;
      
      nodes.push({
        id: customToolId,
        data: { 
          label: (
            <div className="p-3 bg-white border-2 border-orange-300 rounded-lg shadow-sm min-w-[200px]">
              <div className="flex items-center space-x-2 mb-2">
                <Wand2 className="w-3 h-3 text-orange-600" />
                <span className="font-semibold text-orange-900 text-sm">{customMethod.name}</span>
                <span className="px-1 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Custom</span>
              </div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-2">{customMethod.description}</div>
              <div className="text-xs text-gray-500">
                {customMethod.method} {customMethod.path || 'Custom implementation'}
              </div>
            </div>
          ),
          type: 'custom-tool',
          customMethod: customMethod
        },
        position: { x: 400, y: 80 + ((tools.length + index) * 100) },
        style: { border: 'none', background: 'transparent' }
      });
    });

    // Create resource nodes for GET endpoints that return data (only enabled ones)
    const resourceEndpoints = enabledEndpoints.filter(ep => 
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

  // Regenerate nodes when custom methods or disabled endpoints change
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes when custom methods, disabled endpoints, or selection changes
  React.useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateInitialNodes();
    setNodes(newNodes);
    setEdges(newEdges);
  }, [customMethods, endpoints, disabledEndpoints, selectedEndpointId]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleGenerateCode = () => {
    // Only include enabled endpoints
    const enabledEndpoints = endpoints.filter(ep => !disabledEndpoints.has(ep.id));
    
    // Extract regular tools from endpoint mapping
    const regularTools = nodes
      .filter(node => node.data.type === 'tool')
      .map(node => ({
        name: node.data.group.name,
        description: node.data.group.description,
        endpoints: node.data.group.endpoints,
        resourceName: node.data.group.resourceName,
        inputSchema: generateToolSchema(node.data.group),
        isCustom: false
      }));

    // Extract custom tools
    const customTools = nodes
      .filter(node => node.data.type === 'custom-tool')
      .map(node => ({
        name: node.data.customMethod.name,
        description: node.data.customMethod.description,
        endpoints: [],
        resourceName: node.data.customMethod.name,
        inputSchema: node.data.customMethod.inputSchema,
        isCustom: true,
        customImplementation: node.data.customMethod.implementation,
        customMethod: node.data.customMethod.method,
        customPath: node.data.customMethod.path
      }));

    const tools = [...regularTools, ...customTools];

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
      endpoints: enabledEndpoints, // Only pass enabled endpoints
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

  const handleAddCustomMethod = (customMethod: CustomMethod) => {
    setCustomMethods(prev => [...prev, customMethod]);
  };

  const handleRemoveCustomMethod = (methodId: string) => {
    setCustomMethods(prev => prev.filter(m => m.id !== methodId));
  };

  const getExistingMethodNames = () => {
    const enabledEndpoints = endpoints.filter(ep => !disabledEndpoints.has(ep.id));
    const endpointNames = groupEndpointsByFunction(enabledEndpoints).map(tool => tool.name);
    const customNames = customMethods.map(method => method.name);
    return [...endpointNames, ...customNames];
  };

  // Get method counts for bulk operations
  const getMethodCounts = () => {
    const counts: Record<string, { total: number; enabled: number }> = {};
    
    endpoints.forEach(ep => {
      if (!counts[ep.method]) {
        counts[ep.method] = { total: 0, enabled: 0 };
      }
      counts[ep.method].total++;
      if (!disabledEndpoints.has(ep.id)) {
        counts[ep.method].enabled++;
      }
    });
    
    return counts;
  };

  const methodCounts = getMethodCounts();
  const enabledCount = endpoints.length - disabledEndpoints.size;
  const filteredEndpoints = getFilteredEndpoints();

  return (
    <div className="h-screen flex flex-col">
      {/* Add CSS for highlight effect */}
      <style jsx>{`
        .highlight-endpoint {
          animation: highlight-pulse 2s ease-in-out;
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
        }
        
        @keyframes highlight-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>

      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Visual MCP Mapper</h1>
            <p className="text-sm text-gray-600">
              {info.title ? `Mapping ${info.title} API` : 'Map your API endpoints to MCP tools and resources'}
              <span className="ml-2 text-blue-600 font-medium">
                {enabledCount}/{endpoints.length} endpoints enabled
              </span>
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
              Generate Code ({enabledCount} endpoints)
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Enhanced Sidebar with Endpoint Management */}
        <div className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-12' : 'w-80'
        }`}>
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="font-semibold text-gray-900 text-sm">Endpoint Management</h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded hover:bg-gray-200"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              {/* Endpoint Statistics */}
              <div className="p-3 border-b border-gray-200 bg-white">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-bold text-green-800">{enabledCount}</div>
                    <div className="text-green-600">Enabled</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-bold text-gray-800">{disabledEndpoints.size}</div>
                    <div className="text-gray-600">Disabled</div>
                  </div>
                </div>
              </div>

              {/* Bulk Operations */}
              <div className="p-3 border-b border-gray-200 bg-white">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Bulk Operations</h3>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={enableAllEndpoints}
                      className="flex-1 text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Enable All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={disableAllEndpoints}
                      className="flex-1 text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Disable All
                    </Button>
                  </div>
                  
                  {/* Method-based toggles */}
                  <div className="space-y-1">
                    {Object.entries(methodCounts).map(([method, counts]) => (
                      <button
                        key={method}
                        onClick={() => toggleByMethod(method)}
                        className="w-full flex items-center justify-between p-2 text-xs rounded hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            method === 'POST' ? 'bg-green-100 text-green-800' :
                            method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {method}
                          </span>
                          <span className="text-gray-600">
                            {counts.enabled}/{counts.total}
                          </span>
                        </div>
                        {counts.enabled === counts.total ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : counts.enabled === 0 ? (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ToggleRight className="w-4 h-4 text-yellow-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="p-3 border-b border-gray-200 bg-white">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Filter View</h3>
                <div className="flex rounded-lg bg-gray-100 p-1">
                  {[
                    { id: 'all', label: 'All', count: endpoints.length },
                    { id: 'enabled', label: 'Enabled', count: enabledCount },
                    { id: 'disabled', label: 'Disabled', count: disabledEndpoints.size }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setFilterMethod(filter.id as any)}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        filterMethod === filter.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoints List */}
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">
                  Endpoints ({filteredEndpoints.length})
                  {selectedEndpointId && (
                    <span className="ml-2 text-xs text-blue-600">
                      • Click endpoint blocks in the diagram to select them
                    </span>
                  )}
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredEndpoints.map((endpoint) => {
                    const isEnabled = !disabledEndpoints.has(endpoint.id);
                    const isSelected = selectedEndpointId === endpoint.id;
                    
                    return (
                      <motion.div
                        key={endpoint.id}
                        id={`endpoint-${endpoint.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : isEnabled 
                            ? 'bg-white border-gray-200 hover:border-blue-300' 
                            : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                        onClick={() => handleEndpointSelect(endpoint.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                                endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {endpoint.method}
                              </span>
                              {endpoint.parameters.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {endpoint.parameters.length} params
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="font-medium text-gray-900 text-sm mb-1 truncate">
                              {endpoint.path}
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-2">
                              {endpoint.description}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEndpoint(endpoint.id);
                            }}
                            className={`ml-2 p-1 rounded transition-colors ${
                              isEnabled 
                                ? 'text-green-600 hover:bg-green-100' 
                                : 'text-gray-400 hover:bg-gray-200'
                            }`}
                            title={isEnabled ? 'Disable endpoint' : 'Enable endpoint'}
                          >
                            {isEnabled ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Methods Section */}
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Custom Methods ({customMethods.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCustomMethodModal(true)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                {customMethods.length === 0 ? (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-xs text-orange-700 mb-2">
                      Add custom methods to extend your API functionality beyond standard endpoints.
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowCustomMethodModal(true)}
                      className="text-xs"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      Create Custom Method
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {customMethods.map((method) => (
                      <motion.div
                        key={method.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            <Wand2 className="w-3 h-3 text-orange-600" />
                            <span className="font-medium text-orange-900">{method.name}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCustomMethod(method.id)}
                            className="text-orange-600 hover:text-orange-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-orange-700 line-clamp-2 mb-1">{method.description}</div>
                        <div className="text-orange-600">
                          {method.method} {method.path || 'Custom implementation'}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
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
                if (node.data.isSelected) return '#3B82F6';
                return '#3B82F6';
              }}
              maskColor="rgb(240, 240, 240, 0.6)"
            />
            <Panel position="top-right">
              <Card className="w-56">
                <CardHeader className="pb-2">
                  <h3 className="font-semibold text-sm">Mapping Stats</h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Endpoints:</span>
                      <span className="font-medium">{endpoints.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Enabled Endpoints:</span>
                      <span className="font-medium text-green-600">{enabledCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Disabled Endpoints:</span>
                      <span className="font-medium text-gray-500">{disabledEndpoints.size}</span>
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custom Methods:</span>
                      <span className="font-medium text-orange-600">{customMethods.length}</span>
                    </div>
                    {selectedEndpointId && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs text-blue-600 font-medium">
                          💡 Click endpoint blocks to select them in the sidebar
                        </div>
                      </div>
                    )}
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
              <p className="text-xs text-gray-400 mt-1">
                Based on {enabledCount} enabled endpoints
              </p>
            </div>
            <div className="p-3 font-mono text-xs">
              <pre className="text-green-400">
{`# Generated MCP Server for ${info.title || 'API'}
from mcp.server import Server
from mcp.types import Tool, Resource

server = Server("${(info.title || 'api').toLowerCase().replace(/\s+/g, '-')}-server")

# Generated from ${enabledCount} enabled endpoints
# Tools: ${nodes.filter(n => n.data.type === 'tool').length}
# Resources: ${nodes.filter(n => n.data.type === 'resource').length}
# Custom Methods: ${customMethods.length}

@server.list_tools()
async def list_tools():
    return [
        # Auto-generated tools based on enabled endpoints
        ${nodes.filter(n => n.data.type === 'tool').map(n => 
          `Tool(name="${n.data.group.name.toLowerCase().replace(/\s+/g, '_')}", description="${n.data.group.description}")`
        ).join(',\n        ')}
    ]`}
              </pre>
            </div>
          </motion.div>
        )}
      </div>

      {/* Custom Method Modal */}
      <CustomMethodModal
        isOpen={showCustomMethodModal}
        onClose={() => setShowCustomMethodModal(false)}
        onSave={handleAddCustomMethod}
        existingMethods={getExistingMethodNames()}
      />
    </div>
  );
};