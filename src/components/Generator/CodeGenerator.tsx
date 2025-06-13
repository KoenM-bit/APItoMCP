import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Download, Play, Settings, Cloud, Code2, Phone as Python, FileCode, Zap, CheckCircle2, Copy, ExternalLink, TestTube } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { TestingEnvironment } from './TestingEnvironment';

interface CodeGeneratorProps {
  tools: any[];
  resources: any[];
  endpoints: any[];
  apiInfo: any;
  onBack: () => void;
}

export const CodeGenerator: React.FC<CodeGeneratorProps> = ({ 
  tools = [], 
  resources = [], 
  endpoints = [], 
  apiInfo = {},
  onBack 
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'python' | 'typescript'>('python');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [showTesting, setShowTesting] = useState(false);

  const generateCustomHelperFunctions = (tools: any[]) => {
  const customTools = tools.filter(tool => tool.isCustom);
  if (customTools.length === 0) return '';

  const helperFunctions = [];

  customTools.forEach(tool => {
    const implementation = tool.customImplementation || '';
    if (!implementation.trim()) return;

    const lines = implementation.split('\n');
    let currentHelper = [];
    let inHelperFunction = false;

    for (const line of lines) {
      // Check if this is a helper function definition (not the main tool function)
      if (line.match(/^(async )?def [a-zA-Z_][a-zA-Z0-9_]*\s*\(/)) {
        // Save previous helper if exists
        if (currentHelper.length > 0) {
          helperFunctions.push(currentHelper.join('\n'));
          currentHelper = [];
        }

        // Only include if it's NOT the main tool function
        if (!line.includes(`def ${tool.name}(`)) {
          currentHelper.push(line);
          inHelperFunction = true;
        } else {
          inHelperFunction = false;
        }
      } else if (inHelperFunction) {
        currentHelper.push(line);

        // If we hit a non-indented line that's not empty, function has ended
        if (line.trim() !== '' && !line.startsWith('    ') && !line.startsWith('\t')) {
          helperFunctions.push(currentHelper.join('\n'));
          currentHelper = [];
          inHelperFunction = false;
        }
      }
    }

    // Add the last helper function if exists
    if (currentHelper.length > 0) {
      helperFunctions.push(currentHelper.join('\n'));
    }
  });

  return helperFunctions.length > 0 ? '\n' + helperFunctions.join('\n\n') : '';
};

  const generateCustomPythonToolHandler = (tool: any) => {
  const implementation = tool.customImplementation || '';

  if (!implementation.trim()) {
    return `# Custom implementation for ${tool.name}
                result = {"message": "Custom method executed", "arguments": arguments}

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]`;
  }

  const lines = implementation.split('\n');
  const cleanedLines = [];
  let inMainFunction = false;
  let foundImplementation = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if we're entering the main tool function
    if (trimmedLine.includes(`def ${tool.name}(`)) {
      inMainFunction = true;
      continue; // Skip the function definition line
    }

    // Check if we're entering a different function (helper function)
    if (trimmedLine.match(/^(async )?def [a-zA-Z_][a-zA-Z0-9_]*\s*\(/) && !trimmedLine.includes(`def ${tool.name}(`)) {
      inMainFunction = false;
      continue;
    }

    // Only process lines inside the main tool function
    if (inMainFunction) {
      // Skip docstrings and comments
      if (trimmedLine.startsWith('"""') || trimmedLine.startsWith('#') || trimmedLine === '') {
        continue;
      }

      // This is actual implementation code from the main function
      if (trimmedLine !== '') {
        foundImplementation = true;
        // Remove leading whitespace (function indentation)
        const cleanedLine = line.startsWith('    ') ? line.substring(4) : line;
        cleanedLines.push(cleanedLine);
      }
    }
  }

  // If no implementation found, use default
  if (!foundImplementation || cleanedLines.length === 0) {
    return `# Custom implementation for ${tool.name}
                result = {"message": "Custom method executed", "arguments": arguments}

                return [TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )]`;
  }

  let implementationCode = cleanedLines.join('\n                ');

  // SIMPLIFIED: Ensure proper return statement
  if (!implementationCode.includes('return [TextContent')) {
    // Check if there's already a response_data variable
    if (implementationCode.includes('response_data =')) {
      implementationCode += '\n                \n                return [TextContent(\n                    type="text",\n                    text=json.dumps(response_data, indent=2)\n                )]';
    } else {
      // Add a fallback result and return
      implementationCode += '\n                \n                # Ensure we have a result to return\n                if "result" not in locals():\n                    result = {"status": "executed", "arguments": arguments}\n                \n                return [TextContent(\n                    type="text",\n                    text=json.dumps(result, indent=2)\n                )]';
    }
  }

  return implementationCode;
};

  const generatePythonToolHandler = (tool: any) => {
  // Generate clean, production-ready tool implementation
  if (!tool.endpoints || tool.endpoints.length === 0) {
    return `# Default implementation for ${tool.name}
                response = await client.get("/")
                response.raise_for_status()`;
  }

  const endpoint = tool.endpoints[0]; // Use first endpoint as primary
  const pathParams = endpoint.parameters?.filter((p: any) => p.location === 'path') || [];
  const queryParams = endpoint.parameters?.filter((p: any) => p.location === 'query') || [];
  const bodyParams = endpoint.parameters?.filter((p: any) => p.location === 'body') || [];

  let path = endpoint.path || '/';
  const method = endpoint.method?.toLowerCase() || 'get';
  const lines = [];

  // Handle path parameters first
  if (pathParams.length > 0) {
    pathParams.forEach((param: any) => {
      const varName = param.name;
      lines.push(`${varName} = arguments['${param.name}']`);
      // Replace placeholder with variable name for f-string
      path = path.replace(`{${param.name}}`, `{${varName}}`);
    });
  }

  // Handle query parameters
  if (queryParams.length > 0) {
    lines.push('params = {}');
    queryParams.forEach((param: any) => {
      if (param.required) {
        lines.push(`params['${param.name}'] = arguments['${param.name}']`);
      } else {
        lines.push(`if '${param.name}' in arguments:`);
        lines.push(`    params['${param.name}'] = arguments['${param.name}']`);
      }
    });
  }

  // Handle request body for POST/PUT/PATCH operations
  if (method === 'post' || method === 'put' || method === 'patch') {
    lines.push('payload = {}');

    // Add common fields based on the tool name and resource
    if (tool.name.includes('post')) {
      lines.push(`if 'userId' in arguments: payload['userId'] = arguments['userId']`);
      lines.push(`if 'title' in arguments: payload['title'] = arguments['title']`);
      lines.push(`if 'body' in arguments: payload['body'] = arguments['body']`);
    } else if (tool.name.includes('user')) {
      lines.push(`if 'name' in arguments: payload['name'] = arguments['name']`);
      lines.push(`if 'username' in arguments: payload['username'] = arguments['username']`);
      lines.push(`if 'email' in arguments: payload['email'] = arguments['email']`);
    } else if (tool.name.includes('comment')) {
      lines.push(`if 'postId' in arguments: payload['postId'] = arguments['postId']`);
      lines.push(`if 'name' in arguments: payload['name'] = arguments['name']`);
      lines.push(`if 'email' in arguments: payload['email'] = arguments['email']`);
      lines.push(`if 'body' in arguments: payload['body'] = arguments['body']`);
    } else {
      // Generic payload handling
      bodyParams.forEach((param: any) => {
        if (param.required) {
          lines.push(`payload['${param.name}'] = arguments['${param.name}']`);
        } else {
          lines.push(`if '${param.name}' in arguments: payload['${param.name}'] = arguments['${param.name}']`);
        }
      });
    }
  }

  // FIXED: Generate the actual API call with proper f-string usage
  const needsFString = pathParams.length > 0;
  let pathExpression;

  if (needsFString) {
    // Use f-string for dynamic paths
    pathExpression = `f"${path}"`;
  } else {
    // Use regular string for static paths
    pathExpression = `"${path}"`;
  }

  const callArgs = [pathExpression];

  if (queryParams.length > 0) callArgs.push('params=params');
  if (method === 'post' || method === 'put' || method === 'patch') {
    callArgs.push('json=payload');
  }

  lines.push(`response = await client.${method}(${callArgs.join(', ')})`);
  lines.push('response.raise_for_status()');

  return lines.join('\n                ');
};

  const generatePythonCode = () => {
    const serverName = (apiInfo.title || 'API').toLowerCase().replace(/\s+/g, '-') + '-server';
    // Use the correct base URL or detect from the API spec
    const baseUrl = apiInfo.servers?.[0]?.url || endpoints[0]?.baseUrl || 'https://api.example.com';

    // Debug logging
    console.log('🔍 URL extraction debug:');
    console.log('  apiInfo.servers:', apiInfo.servers);
    console.log('  endpoints[0]?.baseUrl:', endpoints[0]?.baseUrl);
    console.log('  final baseUrl:', baseUrl);

    return `#!/usr/bin/env python3
"""
Generated MCP Server for ${apiInfo.title || 'API'}
${apiInfo.description ? `Description: ${apiInfo.description}` : ''}
${apiInfo.version ? `Version: ${apiInfo.version}` : ''}
Automatically created by MCP Studio
"""

import asyncio
import logging
import json
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    InitializationOptions,
    ServerCapabilities,
)
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the MCP server
server = Server("${serverName}")

# API Configuration
API_BASE_URL = "${baseUrl}"

# HTTP client setup
async def get_http_client():
    """Get configured HTTP client"""
    return httpx.AsyncClient(base_url=API_BASE_URL)

${generateCustomHelperFunctions(tools)}

@server.list_resources()
async def list_resources() -> List[Resource]:
    """List available resources"""
    return [
${resources.map(resource => `        Resource(
            uri="${resource.uri}",
            name="${resource.name}",
            description="${resource.description}",
            mimeType="application/json"
        )`).join(',\n')}
    ]

@server.read_resource()
async def read_resource(uri: str) -> str:
    """Read resource content"""
    async with get_http_client() as client:
        try:
${resources.map((resource, index) => `            ${index === 0 ? 'if' : 'elif'} uri == "${resource.uri}":
                response = await client.${resource.endpoint?.method?.toLowerCase() || 'get'}("${resource.endpoint?.path || resource.path}")
                response.raise_for_status()
                return response.text`).join('\n')}
            else:
                raise ValueError(f"Unknown resource: {uri}")
        except httpx.HTTPError as e:
            logger.error(f"HTTP error reading resource {uri}: {e}")
            raise

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools"""
    tools = [
${tools.map(tool => `        Tool(
            name="${tool.name}",
            description="${tool.description}",
            inputSchema=${JSON.stringify(tool.inputSchema, null, 12).split('\n').join('\n            ')}
        )`).join(',\n')}
    ]

    # Debug: Print registered tools
    print("🔍 Registered tools:", [tool.name for tool in tools])
    return tools

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""

    # Debug: Print what tool is being called
    print(f"🎯 Tool called: '{name}' with args: {arguments}")

    async with get_http_client() as client:
        try:
${tools.map((tool, index) => `            ${index === 0 ? 'if' : 'elif'} name == "${tool.name}":
                # ${tool.description}
                ${tool.isCustom ? generateCustomPythonToolHandler(tool) :
                  generatePythonToolHandler(tool) + '\n                \n                return [TextContent(\n                    type="text",\n                    text=json.dumps(response.json(), indent=2)\n                )]'}`).join('\n')}
            else:
                raise ValueError(f"Unknown tool: {name}")

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP {e.response.status_code} error calling {name}: {e}")
            return [TextContent(
                type="text",
                text=f"API Error: {e.response.status_code} - {e.response.text}"
            )]
        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling {name}: {e}")
            return [TextContent(
                type="text",
                text=f"Connection error: {str(e)}"
            )]
        except Exception as e:
            logger.error(f"Unexpected error calling {name}: {e}")
            return [TextContent(
                type="text",
                text=f"Unexpected error: {str(e)}"
            )]

async def main():
    """Run the MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="${serverName}",
                server_version="1.0.0",
                capabilities=ServerCapabilities(
                    resources={},
                    tools={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())`;
  };

  const generateTypeScriptCode = () => {
    const serverName = (apiInfo.title || 'API').toLowerCase().replace(/\s+/g, '-') + '-server';
    const baseUrl = apiInfo.servers?.[0]?.url || endpoints[0]?.baseUrl || 'https://api.example.com';

    return `#!/usr/bin/env node
/**
 * Generated MCP Server for ${apiInfo.title || 'API'}
 * ${apiInfo.description ? `Description: ${apiInfo.description}` : ''}
 * ${apiInfo.version ? `Version: ${apiInfo.version}` : ''}
 * Automatically created by MCP Studio
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// API Configuration
const API_BASE_URL = '${baseUrl}';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// HTTP client setup
const defaultHeaders = {
  'Authorization': \`Bearer \${API_KEY}\`,
  'Content-Type': 'application/json',
};

async function makeApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = \`\${API_BASE_URL}\${endpoint}\`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status} \${response.statusText}\`);
  }

  return response;
}

// Create MCP server
const server = new Server(
  {
    name: '${serverName}',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
${resources.map(resource => `      {
        uri: '${resource.uri}',
        name: '${resource.name}',
        description: '${resource.description}',
        mimeType: 'application/json',
      }`).join(',\n')}
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
${resources.map(resource => `    case '${resource.uri}': {
      const response = await makeApiRequest('${resource.endpoint?.path || resource.path}');
      const data = await response.json();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }`).join('\n\n')}

    default:
      throw new McpError(ErrorCode.InvalidRequest, \`Unknown resource: \${uri}\`);
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
${tools.map(tool => `      {
        name: '${tool.name}',
        description: '${tool.description}',
        inputSchema: ${JSON.stringify(tool.inputSchema, null, 8)},
      }`).join(',\n')}
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
${tools.map(tool => `      case '${tool.name}': {
        // Handle ${tool.description}
        ${tool.isCustom ? generateCustomTypeScriptToolHandler(tool) : generateTypeScriptToolHandler(tool)}

        return {
          content: [
            {
              type: 'text',
              text: ${tool.isCustom ? 'JSON.stringify(result, null, 2)' : `\`Tool \${name} executed successfully\``},
            },
          ],
        };
      }`).join('\n\n')}

      default:
        throw new McpError(ErrorCode.MethodNotFound, \`Unknown tool: \${name}\`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: \`Error calling \${name}: \${errorMessage}\`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});`;
  };

  const generateCustomTypeScriptToolHandler = (tool: any) => {
    // For custom tools, adapt the Python implementation to TypeScript
    const implementation = tool.customImplementation || `// Custom implementation for ${tool.name}
        const result = { message: "Custom method executed", arguments: args };`;

    // Convert Python-style implementation to TypeScript
    const adaptedImplementation = implementation
      .replace(/async def \w+\([^)]*\):/g, `// Custom method implementation`)
      .replace(/def \w+\([^)]*\):/g, `// Custom method implementation`)
      .replace(/arguments/g, 'args')
      .replace(/await client\./g, 'await makeApiRequest(')
      .replace(/\.get\(/g, ', { method: "GET" }); const response = await fetch(')
      .replace(/\.post\(/g, ', { method: "POST" }); const response = await fetch(')
      .replace(/\.put\(/g, ', { method: "PUT" }); const response = await fetch(')
      .replace(/\.delete\(/g, ', { method: "DELETE" }); const response = await fetch(')
      .replace(/response\.json\(\)/g, 'await response.json()')
      .split('\n')
      .map(line => line.startsWith('    ') ? line.substring(4) : line)
      .join('\n        ');

    return `// Custom implementation
        ${adaptedImplementation}
        const result = await ${tool.name.replace(/[^a-zA-Z0-9_]/g, '_')}_impl?.(args) ?? { status: "executed", arguments: args };`;
  };

  const generateTypeScriptToolHandler = (tool: any) => {
    if (!tool.endpoints || tool.endpoints.length === 0) {
      return `// Default implementation
        const response = await makeApiRequest('/');
        const result = await response.json();`;
    }

    return tool.endpoints.map((endpoint: any) => {
      const pathParams = endpoint.parameters?.filter((p: any) => p.location === 'path') || [];
      const queryParams = endpoint.parameters?.filter((p: any) => p.location === 'query') || [];
      const bodyParams = endpoint.parameters?.filter((p: any) => p.location === 'body') || [];

      let path = endpoint.path;
      pathParams.forEach((param: any) => {
        path = path.replace(`{${param.name}}`, `\${args.${param.name}}`);
      });

      const lines = [];
      
      if (queryParams.length > 0) {
        lines.push('const params = new URLSearchParams();');
        queryParams.forEach((param: any) => {
          lines.push(`if (args.${param.name}) params.append('${param.name}', args.${param.name}.toString());`);
        });
      }

      const options: string[] = [`method: '${endpoint.method}'`];
      if (bodyParams.length > 0) {
        lines.push('const body = {};');
        bodyParams.forEach((param: any) => {
          lines.push(`if (args.${param.name}) body.${param.name} = args.${param.name};`);
        });
        options.push('body: JSON.stringify(body)');
      }

      const urlSuffix = queryParams.length > 0 ? '?\${params}' : '';
      lines.push(`const response = await makeApiRequest(\`${path}${urlSuffix}\`, { ${options.join(', ')} });`);
      lines.push('const result = await response.json();');

      return lines.join('\n        ');
    }).join('\n        ');
  };

  const currentCode = selectedLanguage === 'python' ? generatePythonCode() : generateTypeScriptCode();

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentStatus('deploying');
    
    // Simulate deployment
    setTimeout(() => {
      setDeploymentStatus('success');
      setDeploymentUrl('https://your-mcp-server.herokuapp.com');
      setIsDeploying(false);
    }, 3000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
  };

  const handleDownload = () => {
    const filename = selectedLanguage === 'python' ? 'mcp_server.py' : 'mcp_server.js';
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showTesting) {
    return (
      <TestingEnvironment
        generatedCode={currentCode}
        language={selectedLanguage}
        tools={tools}
        resources={resources}
        onBack={() => setShowTesting(false)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Your MCP Server is Ready!
        </h1>
        <p className="text-base text-gray-600 max-w-3xl mx-auto">
          Generated from {endpoints.length} API endpoints with {tools.length} MCP tools and {resources.length} resources.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Compact Configuration Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-base font-semibold">Language & Settings</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Programming Language
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedLanguage('python')}
                    className={`p-2 rounded-lg border-2 transition-all text-xs ${
                      selectedLanguage === 'python'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Python className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <div className="font-medium">Python</div>
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('typescript')}
                    className={`p-2 rounded-lg border-2 transition-all text-xs ${
                      selectedLanguage === 'typescript'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FileCode className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <div className="font-medium">TypeScript</div>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Generated Features</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>MCP Tools ({tools.length})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>MCP Resources ({resources.length})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>API Integration ({endpoints.length})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Authentication handling</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Error handling & logging</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-base font-semibold">Actions</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={() => setShowTesting(true)}
                className="w-full justify-start text-sm"
                size="sm"
              >
                <TestTube className="w-3 h-3 mr-2" />
                Test Locally
              </Button>
              <Button 
                onClick={handleDownload}
                variant="outline" 
                className="w-full justify-start text-sm"
                size="sm"
              >
                <Download className="w-3 h-3 mr-2" />
                Download Code
              </Button>
              <Button 
                onClick={handleDeploy}
                loading={isDeploying}
                className="w-full justify-start text-sm"
                disabled={deploymentStatus === 'success'}
                size="sm"
              >
                <Cloud className="w-3 h-3 mr-2" />
                {deploymentStatus === 'success' ? 'Deployed' : 'Deploy to Cloud'}
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm" size="sm">
                <Settings className="w-3 h-3 mr-2" />
                Advanced Settings
              </Button>
            </CardContent>
          </Card>

          {deploymentStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-900 text-sm">Deployment Successful!</span>
                  </div>
                  <p className="text-xs text-green-700 mb-2">
                    Your MCP server is now live and ready to use.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="text-green-700 border-green-300 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Live
                    </Button>
                    <Button size="sm" variant="ghost" className="text-green-700 text-xs">
                      <Copy className="w-3 h-3 mr-1" />
                      Copy URL
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Code Editor */}
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-sm">Generated MCP Server</span>
                  <span className="text-xs text-gray-500">
                    ({selectedLanguage === 'python' ? 'Python' : 'TypeScript'})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={handleCopyCode}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline">
                    <Play className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full">
              <Editor
                height="520px"
                language={selectedLanguage === 'python' ? 'python' : 'typescript'}
                value={currentCode}
                theme="vs-dark"
                options={{
                  readOnly: false,
                  minimap: { enabled: true },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on'
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compact Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between pt-4 border-t border-gray-200"
      >
        <Button variant="outline" onClick={onBack} size="sm">
          Back to Mapping
        </Button>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            Save Project
          </Button>
          <Button size="sm">
            <Zap className="w-3 h-3 mr-2" />
            Create New Server
          </Button>
        </div>
      </motion.div>
    </div>
  );
};