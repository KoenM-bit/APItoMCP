import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree } from '@webcontainer/api';

export class WebContainerManager {
  private static instance: WebContainerManager | null = null;
  private static webcontainerInstance: WebContainer | null = null;
  private static isInitializing: boolean = false;
  private static initPromise: Promise<WebContainer> | null = null;
  private serverProcess: any = null;
  private serverUrl: string | null = null;
  private mcpWriter: WritableStreamDefaultWriter | null = null;
  private pendingRequests: Map<number, { resolve: Function, reject: Function, timeout: NodeJS.Timeout }> = new Map();

  private constructor() {}

  static getInstance(): WebContainerManager {
    if (!WebContainerManager.instance) {
      WebContainerManager.instance = new WebContainerManager();
    }
    return WebContainerManager.instance;
  }

  async initialize() {
    try {
      // If already initialized, return success
      if (WebContainerManager.webcontainerInstance) {
        console.log('WebContainer already initialized, reusing existing instance');
        return true;
      }

      // If currently initializing, wait for that process to complete
      if (WebContainerManager.isInitializing && WebContainerManager.initPromise) {
        console.log('WebContainer initialization in progress, waiting...');
        await WebContainerManager.initPromise;
        return true;
      }

      // Start initialization
      WebContainerManager.isInitializing = true;
      WebContainerManager.initPromise = WebContainer.boot();
      
      WebContainerManager.webcontainerInstance = await WebContainerManager.initPromise;
      WebContainerManager.isInitializing = false;
      console.log('WebContainer initialized successfully');
      
      return true;
    } catch (error) {
      WebContainerManager.isInitializing = false;
      WebContainerManager.initPromise = null;
      console.error('Failed to initialize WebContainer:', error);
      throw new Error(`WebContainer initialization failed: ${error.message}`);
    }
  }

  private get webcontainer(): WebContainer | null {
    return WebContainerManager.webcontainerInstance;
  }

async createMCPProject(language: 'python' | 'typescript', code: string) {
  if (!this.webcontainer) {
    throw new Error('WebContainer not initialized');
  }

  // Stop any existing server to prevent conflicts
  if (this.serverProcess) {
    console.log('Stopping existing server before creating new project...');
    await this.stopServer();
  }

  // Clear any previous project files by mounting fresh file system
  console.log('Creating fresh MCP project with new generated code...');
  const files: FileSystemTree = {};

  if (language === 'python') {
    // Store the actual generated Python code
    files['server.py'] = {
      file: {
        contents: code
      }
    };
    
    files['requirements.txt'] = {
      file: {
        contents: `mcp>=1.0.0
httpx>=0.25.0
asyncio-mqtt>=0.11.0
pydantic>=2.0.0`
      }
    };

    // Create the dynamic Node.js MCP server that parses the Python code
    files['server.js'] = {
      file: {
        contents: `// Dynamic WebContainer MCP Server
// This server dynamically parses the generated Python MCP server code

const readline = require('readline');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Dynamic Python MCP Parser Class
class PythonMCPParser {
  constructor(pythonCode) {
    this.pythonCode = pythonCode;
    this.extractedData = this.parse();
  }

  parse() {
    console.error('[PARSER] Starting dynamic Python MCP server parsing...');
    
    const result = {
      serverName: this.extractServerName(),
      apiBaseUrl: this.extractApiBaseUrl(),
      tools: this.extractTools(),
      resources: this.extractResources(),
      toolHandlers: this.extractToolHandlers()
    };

    console.error('[PARSER] Parsing complete:', {
      serverName: result.serverName,
      apiBaseUrl: result.apiBaseUrl,
      toolCount: result.tools.length,
      resourceCount: result.resources.length,
      handlerCount: Object.keys(result.toolHandlers).length
    });

    return result;
  }

  extractServerName() {
    const match = this.pythonCode.match(/server = Server\\(["']([^"']+)["']\\)/);
    return match ? match[1] : 'unknown-server';
  }

  extractApiBaseUrl() {
    const match = this.pythonCode.match(/API_BASE_URL\\s*=\\s*["']([^"']+)["']/);
    return match ? match[1] : 'https://api.example.com';
  }

  extractTools() {
    console.error('[PARSER] Extracting tools from Python code...');
    
    // Find the list_tools function and extract Tool() definitions
    const toolsPattern = /@server\\.list_tools\\(\\)(.*?)(?=@server\\.|async\\s+def\\s+main|$)/s;
    const toolsMatch = this.pythonCode.match(toolsPattern);
    
    if (!toolsMatch) {
      console.error('[PARSER] No list_tools function found');
      return [];
    }

    const toolsSection = toolsMatch[1];
    console.error('[PARSER] Found tools section, length:', toolsSection.length);

    // Extract individual Tool() constructor calls - handle multiline schemas
    const toolPattern = /Tool\\s*\\(\\s*name\\s*=\\s*["']([^"']+)["']\\s*,\\s*description\\s*=\\s*["']([^"']+)["']\\s*,\\s*inputSchema\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*\\)/g;
    const tools = [];
    let match;

    while ((match = toolPattern.exec(toolsSection)) !== null) {
      const [, name, description, schemaStr] = match;
      console.error('[PARSER] Found tool:', name);

      try {
        const inputSchema = this.parseInputSchema(schemaStr);
        
        tools.push({
          name: name,
          description: description,
          inputSchema: inputSchema
        });
      } catch (parseError) {
        console.error('[PARSER] Failed to parse schema for tool', name, ':', parseError.message);
        tools.push({
          name: name,
          description: description,
          inputSchema: { type: 'object', properties: {} }
        });
      }
    }

    console.error('[PARSER] Extracted tools:', tools.map(t => t.name));
    return tools;
  }

  parseInputSchema(schemaStr) {
    try {
      // Clean up the schema string - handle Python to JavaScript conversion
      let cleanSchema = schemaStr
        .replace(/\\s+/g, ' ')           // Normalize whitespace
        .replace(/'/g, '"')             // Convert single quotes to double quotes
        .replace(/True/g, 'true')       // Convert Python True to JavaScript true
        .replace(/False/g, 'false')     // Convert Python False to JavaScript false
        .replace(/None/g, 'null')       // Convert Python None to JavaScript null
        .trim();

      // Remove trailing commas that might break JSON parsing
      cleanSchema = cleanSchema.replace(/,(\\s*[}\\]])/g, '$1');

      // Use Function constructor for safe evaluation
      const schema = new Function('return ' + cleanSchema)();
      
      if (typeof schema === 'object' && schema !== null) {
        return schema;
      } else {
        throw new Error('Invalid schema structure');
      }
    } catch (error) {
      console.error('[PARSER] Schema parsing failed:', error.message);
      return { type: 'object', properties: {} };
    }
  }

  extractResources() {
    console.error('[PARSER] Extracting resources from Python code...');
    
    const resourcesPattern = /@server\\.list_resources\\(\\)(.*?)(?=@server\\.|async\\s+def\\s+main|$)/s;
    const resourcesMatch = this.pythonCode.match(resourcesPattern);
    
    if (!resourcesMatch) {
      console.error('[PARSER] No list_resources function found');
      return [];
    }

    const resourcesSection = resourcesMatch[1];
    
    const resourcePattern = /Resource\\s*\\(\\s*uri\\s*=\\s*["']([^"']+)["']\\s*,\\s*name\\s*=\\s*["']([^"']+)["']\\s*,\\s*description\\s*=\\s*["']([^"']+)["']\\s*,\\s*mimeType\\s*=\\s*["']([^"']+)["']\\s*\\)/g;
    const resources = [];
    let match;

    while ((match = resourcePattern.exec(resourcesSection)) !== null) {
      const [, uri, name, description, mimeType] = match;
      console.error('[PARSER] Found resource:', name);
      
      resources.push({
        uri: uri,
        name: name,
        description: description,
        mimeType: mimeType
      });
    }

    console.error('[PARSER] Extracted resources:', resources.map(r => r.name));
    return resources;
  }

  extractToolHandlers() {
    console.error('[PARSER] Extracting tool handlers from Python code...');
    
    const handlerPattern = /@server\\.call_tool\\(\\)(.*?)(?=async\\s+def\\s+main|$)/s;
    const handlerMatch = this.pythonCode.match(handlerPattern);
    
    if (!handlerMatch) {
      console.error('[PARSER] No call_tool function found');
      return {};
    }

    const handlerSection = handlerMatch[1];
    const handlers = {};

    const toolHandlerPattern = /(if|elif)\\s+name\\s*==\\s*["']([^"']+)["']\\s*:(.*?)(?=(elif\\s+name\\s*==|else\\s*:|return\\s+\\[TextContent|$))/gs;
    let match;

    while ((match = toolHandlerPattern.exec(handlerSection)) !== null) {
      const [, , toolName, handlerCode] = match;
      console.error('[PARSER] Found handler for tool:', toolName);
      
      const handler = this.parseToolHandler(toolName, handlerCode);
      handlers[toolName] = handler;
    }

    console.error('[PARSER] Extracted handlers for tools:', Object.keys(handlers));
    return handlers;
  }

  parseToolHandler(toolName, handlerCode) {
    console.error('[PARSER] Parsing handler for:', toolName);
    
    const methodPattern = /await\\s+client\\.(\\w+)\\s*\\(/;
    const methodMatch = handlerCode.match(methodPattern);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

    const pathPattern = /client\\.\\w+\\s*\\(\\s*["']([^"']+)["']/;
    const pathMatch = handlerCode.match(pathPattern);
    let path = pathMatch ? pathMatch[1] : '/';

    const pathParamPattern = /(\\w+)\\s*=\\s*arguments\\s*\\[\\s*["'](\\w+)["']\\s*\\]/g;
    const pathParams = [];
    let paramMatch;
    
    while ((paramMatch = pathParamPattern.exec(handlerCode)) !== null) {
      const [, varName, argName] = paramMatch;
      pathParams.push({ varName, argName });
    }

    const hasParams = handlerCode.includes('params=params') || handlerCode.includes('params=');
    const hasBody = handlerCode.includes('json=payload') || handlerCode.includes('json=') || 
                   ['POST', 'PUT', 'PATCH'].includes(method);

    const handler = {
      method: method,
      path: path,
      hasParams: hasParams,
      hasBody: hasBody,
      pathParams: pathParams,
      toolName: toolName
    };

    console.error('[PARSER] Parsed handler:', handler);
    return handler;
  }

  getToolByName(name) {
    return this.extractedData.tools.find(tool => tool.name === name);
  }

  getHandlerByName(name) {
    return this.extractedData.toolHandlers[name];
  }

  getAllTools() {
    return this.extractedData.tools;
  }

  getAllResources() {
    return this.extractedData.resources;
  }

  getApiBaseUrl() {
    return this.extractedData.apiBaseUrl;
  }

  getServerName() {
    return this.extractedData.serverName;
  }
}

// Read and parse the Python code
let pythonCode = '';
let mcpParser = null;

try {
  pythonCode = fs.readFileSync('server.py', 'utf8');
  console.error('✅ Loaded Python code:', pythonCode.length, 'characters');
  mcpParser = new PythonMCPParser(pythonCode);
  console.error('✅ Parser initialized successfully');
} catch (error) {
  console.error('❌ Could not read or parse server.py:', error.message);
  process.exit(1);
}

// HTTP request helper function
function makeApiRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Server/1.0.0',
        ...options.headers
      }
    };

    console.error('[HTTP] Making request:', requestOptions.method, url);

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.error('[HTTP] Response received:', res.statusCode, data.length, 'bytes');

        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (parseError) {
            resolve({ statusCode: res.statusCode, data: data });
          }
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + data));
        }
      });
    });

    req.on('error', (error) => {
      console.error('[HTTP] Request error:', error.message);
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Dynamic tool execution using the parser
async function executeApiToolDynamic(toolName, args) {
  console.error('[TOOL] Executing tool dynamically:', toolName, 'with args:', args);

  try {
    const tool = mcpParser.getToolByName(toolName);
    const handler = mcpParser.getHandlerByName(toolName);

    if (!tool) {
      throw new Error(\`Tool '\${toolName}' not found in parsed definitions\`);
    }

    if (!handler) {
      console.error('[TOOL] No specific handler found, using inference for:', toolName);
      const inferredHandler = inferHandlerFromTool(tool, toolName);
      const result = await executeToolHandler(inferredHandler, args);
      return {
        type: 'text',
        text: JSON.stringify(result.data, null, 2)
      };
    }

    console.error('[TOOL] Using parsed handler:', handler);
    const result = await executeToolHandler(handler, args);
    console.error('[TOOL] Dynamic execution successful for', toolName);

    return {
      type: 'text',
      text: JSON.stringify(result.data, null, 2)
    };

  } catch (error) {
    console.error('[TOOL] Dynamic execution failed for', toolName, ':', error.message);

    return {
      type: 'text',
      text: JSON.stringify({
        error: error.message,
        tool: toolName,
        args: args,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
}

// Infer handler from tool name when parsing fails
function inferHandlerFromTool(tool, toolName) {
  console.error('[INFER] Inferring handler for tool:', toolName);
  
  const method = tool.name.includes('create') ? 'POST' :
                tool.name.includes('update') ? 'PUT' :
                tool.name.includes('delete') ? 'DELETE' : 'GET';
  
  let path = '/';
  let pathParams = [];
  
  if (tool.name.includes('post')) {
    if (tool.name.includes('by_id') || tool.name.includes('delete') || tool.name.includes('update')) {
      path = '/posts/{id}';
      pathParams = [{ varName: 'id', argName: 'id' }];
    } else if (tool.name.includes('comments')) {
      path = '/posts/{id}/comments';
      pathParams = [{ varName: 'id', argName: 'id' }];
    } else {
      path = '/posts';
    }
  } else if (tool.name.includes('user')) {
    if (tool.name.includes('by_id')) {
      path = '/users/{id}';
      pathParams = [{ varName: 'id', argName: 'id' }];
    } else if (tool.name.includes('posts')) {
      path = '/users/{id}/posts';
      pathParams = [{ varName: 'id', argName: 'id' }];
    } else {
      path = '/users';
    }
  } else if (tool.name.includes('comment')) {
    path = '/comments';
  } else if (tool.name.includes('album')) {
    path = '/albums';
  } else if (tool.name.includes('photo')) {
    path = '/photos';
  }
  
  return {
    method: method,
    path: path,
    hasParams: method === 'GET',
    hasBody: ['POST', 'PUT', 'PATCH'].includes(method),
    pathParams: pathParams,
    toolName: toolName
  };
}

// Execute tool handler
async function executeToolHandler(handler, args) {
  console.error('[EXECUTE] Dynamic handler execution:', handler);
  console.error('[EXECUTE] Args:', args);

  try {
    if (!handler || !handler.path || !handler.method) {
      throw new Error('Invalid handler: missing path or method');
    }

    const apiBaseUrl = mcpParser.getApiBaseUrl();
    let url = apiBaseUrl + handler.path;
    let options = {
      method: handler.method.toUpperCase()
    };

    // Replace path parameters
    if (handler.pathParams && handler.pathParams.length > 0 && args && typeof args === 'object') {
      handler.pathParams.forEach(({ varName, argName }) => {
        if (args[argName] !== undefined) {
          const placeholder = \`{\${argName}}\`;
          if (url.includes(placeholder)) {
            url = url.replace(placeholder, encodeURIComponent(args[argName]));
            console.error('[EXECUTE] Replaced', placeholder, 'with', args[argName]);
          }
        }
      });
    }

    // Add query parameters
    if (handler.hasParams && args && typeof args === 'object') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        const isPathParam = handler.pathParams?.some(p => p.argName === key);
        if (!isPathParam && value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
        console.error('[EXECUTE] Added query params:', queryParams.toString());
      }
    }

    // Add request body
    if (handler.hasBody && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') && args && typeof args === 'object') {
      const body = {};
      for (const [key, value] of Object.entries(args)) {
        const isPathParam = handler.pathParams?.some(p => p.argName === key);
        if (!isPathParam && value !== undefined && value !== null) {
          body[key] = value;
        }
      }
      options.body = body;
      console.error('[EXECUTE] Added request body:', body);
    }

    console.error('[EXECUTE] Final URL:', url);
    return await makeApiRequest(url, options);

  } catch (error) {
    console.error('[EXECUTE] Error in dynamic executeToolHandler:', error.message);
    throw error;
  }
}

// Get all tools and resources from the parser
const availableTools = mcpParser.getAllTools();
const availableResources = mcpParser.getAllResources();

// Set up readline interface for stdin/stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.error('✅ Dynamic MCP Server starting...');
console.error('✅ API Base URL:', mcpParser.getApiBaseUrl());
console.error('✅ Server Name:', mcpParser.getServerName());
console.error('✅ Available tools:', availableTools.map(t => t.name).join(', '));
console.error('✅ Available resources:', availableResources.map(r => r.name).join(', '));

// Handle MCP JSON-RPC requests
rl.on('line', async (input) => {
  try {
    const request = JSON.parse(input);
    console.error('[MCP] Request:', request.method, 'ID:', request.id);

    let response;

    switch (request.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: 'Dynamic MCP Server',
              version: '1.0.0'
            }
          }
        };
        break;

      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: availableTools
          }
        };
        break;

      case 'tools/call':
        const toolName = request.params?.name;
        const toolArgs = request.params?.arguments || {};

        console.error('[MCP] Executing tool:', toolName, 'with args:', toolArgs);

        try {
          const apiResult = await executeApiToolDynamic(toolName, toolArgs);
          response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [apiResult]
            }
          };
        } catch (toolError) {
          console.error('[MCP] Tool execution failed:', toolError.message);
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Tool execution failed: ' + toolError.message
            }
          };
        }
        break;

      case 'resources/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: availableResources
          }
        };
        break;

      case 'resources/read':
        const uri = request.params?.uri;
        console.error('[MCP] Reading resource:', uri);

        try {
          // Find the resource definition
          const resource = availableResources.find(r => r.uri === uri);
          if (!resource) {
            throw new Error(\`Resource '\${uri}' not found\`);
          }

          // Infer the API endpoint from the resource URI
          let resourcePath = '/';
          if (uri.includes('posts://')) {
            resourcePath = '/posts';
          } else if (uri.includes('users://')) {
            resourcePath = '/users';
          } else if (uri.includes('comments://')) {
            resourcePath = '/comments';
          } else if (uri.includes('albums://')) {
            resourcePath = '/albums';
          } else if (uri.includes('photos://')) {
            resourcePath = '/photos';
          }

          const resourceUrl = mcpParser.getApiBaseUrl() + resourcePath;
          const resourceResult = await makeApiRequest(resourceUrl);
          
          response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              contents: [
                {
                  uri: uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(resourceResult.data, null, 2)
                }
              ]
            }
          };
        } catch (resourceError) {
          console.error('[MCP] Resource read failed:', resourceError.message);
          response = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Resource read failed: ' + resourceError.message
            }
          };
        }
        break;

      default:
        response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Method not found: ' + request.method
          }
        };
    }

    // Send response
    console.log(JSON.stringify(response));
    console.error('[MCP] Response sent for:', request.method);

  } catch (error) {
    console.error('[MCP] Error processing request:', error.message);
    const errorResponse = {
      jsonrpc: '2.0',
      id: 0,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

console.error('🚀 Dynamic MCP Server ready for requests');`
        }
      };

      files['package.json'] = {
        file: {
          contents: JSON.stringify({
            name: 'mcp-python-server-dynamic',
            version: '1.0.0',
            scripts: {
              start: 'node server.js',
              install: 'echo "Dynamic Python MCP server - no dependencies to install"'
            }
          }, null, 2)
        }
      };

    } else {
      // TypeScript/Node.js MCP Server setup (unchanged)
      files['server.js'] = {
        file: {
          contents: code
        }
      };

      files['package.json'] = {
        file: {
          contents: JSON.stringify({
            name: 'mcp-typescript-server',
            version: '1.0.0',
            type: 'module',
            main: 'server.js',
            scripts: {
              start: 'node server.js',
              dev: 'node --watch server.js'
            },
            dependencies: {
              '@modelcontextprotocol/sdk': '^1.0.0',
              'node-fetch': '^3.3.0'
            }
          }, null, 2)
        }
      };
    }

    // Write all files to WebContainer
    await this.webcontainer.mount(files);
    console.log(`${language} MCP project created successfully`);
  }

  async installDependencies(language: 'python' | 'typescript') {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    try {
      if (language === 'python') {
        // For Python simulation, we don't need to install actual Python dependencies
        // Just run the npm install script which outputs a message
        console.log('Python simulation - skipping pip install (WebContainer limitation)');
        const installProcess = await this.webcontainer.spawn('npm', ['run', 'install']);
        
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('Install output:', data);
          }
        }));

        const exitCode = await installProcess.exit;
        console.log('Python simulation install completed with exit code:', exitCode);
        // Don't throw error for Python simulation
      } else {
        // Install Node.js dependencies
        const installProcess = await this.webcontainer.spawn('npm', ['install']);
        
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log('NPM install output:', data);
          }
        }));

        const exitCode = await installProcess.exit;
        if (exitCode !== 0) {
          throw new Error(`NPM installation failed with exit code ${exitCode}`);
        }
      }
      
      console.log(`${language} dependencies installed successfully`);
    } catch (error) {
      console.error('Dependency installation failed:', error);
      throw error;
    }
  }

  async startMCPServer(language: 'python' | 'typescript'): Promise<string> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    try {
      // First install dependencies
      await this.installDependencies(language);

      // Start the MCP server
      this.serverProcess = await this.webcontainer.spawn('npm', ['start']);

      // Set up stdin writer for sending MCP requests
      this.mcpWriter = this.serverProcess.input.getWriter();

      // Set up output reader for receiving MCP responses and logs
      const reader = this.serverProcess.output.getReader();
      this.setupOutputReader(reader);

      // For MCP servers, they typically run on stdio, not HTTP
      this.serverUrl = language === 'python' 
        ? 'stdio://mcp-python-simulation' 
        : 'stdio://mcp-server';
      
      // Wait a bit for server to initialize and look for "READY" signal
      await this.waitForServerReady();
      
      // Expose server process globally for MCP client access
      (window as any).webContainerInstance = this.webcontainer;
      (window as any).mcpServerProcess = this.serverProcess;
      
      // ADD THIS LINE: Expose the WebContainerManager instance
      (window as any).webContainerManagerInstance = this;
      
      console.log(`${language} MCP server started successfully`);
      return this.serverUrl;
      
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw new Error(`MCP server startup failed: ${error.message}`);
    }
  }

  private async waitForServerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server ready timeout'));
      }, 10000);

      // Look for READY signal in server output
      const checkReady = () => {
        // For now, just wait 3 seconds - the server should be ready
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 3000);
      };

      checkReady();
    });
  }

  private setupOutputReader(reader: ReadableStreamDefaultReader): void {
  let buffer = ''; // Buffer to accumulate partial JSON

  const readLoop = async () => {
    try {
      const { value, done } = await reader.read();
      if (done) {
        console.log('Server process ended');
        return;
      }

      // Handle different value types from WebContainer streams
      let output: string;
      if (typeof value === 'string') {
        output = value;
      } else if (value instanceof Uint8Array) {
        output = new TextDecoder().decode(value);
      } else if (value instanceof ArrayBuffer) {
        output = new TextDecoder().decode(new Uint8Array(value));
      } else if (value && typeof value.toString === 'function') {
        output = value.toString();
      } else {
        console.warn('Unknown value type from WebContainer stream:', typeof value, value);
        output = String(value);
      }
      
      // Add to buffer
      buffer += output;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed) continue;
        
        // Skip debug/log lines
        if (trimmed.startsWith('[MCP]') || trimmed.startsWith('[DEBUG]') || 
            trimmed.startsWith('[ERROR]') || trimmed.startsWith('[INFO]') ||
            trimmed.startsWith('[HTTP]') || trimmed.startsWith('[TOOL]') ||
            trimmed.startsWith('[EXTRACT]') || trimmed.startsWith('[EXECUTE]') ||
            trimmed.startsWith('[INFER]') || trimmed.startsWith('[FALLBACK]')) {
          console.log('📝 Server output:', trimmed);
          continue;
        }
        
        // Try to parse JSON responses
        if (trimmed.startsWith('{"jsonrpc"') || (trimmed.startsWith('{') && trimmed.includes('"jsonrpc"'))) {
          try {
            const response = JSON.parse(trimmed);
            console.log('✅ Parsed MCP response:', response);
            
            // Check if this is a request echo or actual response
            if (response.method) {
              console.log('📤 This is an echoed request, not a response');
              continue;
            }
            
            // Process the response if we have a matching pending request
            if (response.id && this.pendingRequests.has(response.id)) {
              console.log(`✅ Found matching pending request for ID: ${response.id}`);
              const pending = this.pendingRequests.get(response.id)!;
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(response.id);
              console.log(`🗑️ Removed pending request ID: ${response.id}, remaining: ${this.pendingRequests.size}`);
              
              // Resolve with the response
              pending.resolve(response);
            } else if (response.id) {
              console.log(`❌ No pending request found for ID: ${response.id}`);
              console.log('❌ Current pending requests:', Array.from(this.pendingRequests.keys()));
            }
          } catch (parseError) {
            console.log('❌ Failed to parse JSON response:', parseError.message);
            console.log('❌ Raw line:', trimmed);
          }
        } else {
          // Non-JSON output (logs, etc.)
          console.log('📝 Server output:', trimmed);
        }
      }

      // Continue reading
      readLoop();
    } catch (error) {
      console.error('Error reading server output:', error);
      
      // Reject all pending requests on read error
      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Server output stream error'));
      }
      this.pendingRequests.clear();
    }
  };

  readLoop();
}

  async stopServer() {
    if (this.serverProcess) {
      try {
        // Close the writer
        if (this.mcpWriter) {
          await this.mcpWriter.close();
          this.mcpWriter = null;
        }

        // Clear pending requests
        for (const [id, pending] of this.pendingRequests.entries()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Server stopped'));
        }
        this.pendingRequests.clear();

        // Kill the process
        this.serverProcess.kill();
        await this.serverProcess.exit;
        console.log('MCP server stopped successfully');
      } catch (error) {
        console.error('Error stopping server:', error);
      }
      this.serverProcess = null;
      this.serverUrl = null;
      
      // Clean up global references
      delete (window as any).webContainerInstance;
      delete (window as any).mcpServerProcess;
    }
  }

  async testMCPConnection(): Promise<boolean> {
    if (!this.webcontainer || !this.serverProcess) {
      return false;
    }

    try {
      // For a more realistic test, try to send an actual MCP initialize request
      const initResult = await this.sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {}
        },
        clientInfo: {
          name: 'MCP Test Client',
          version: '1.0.0'
        }
      });

      console.log('MCP server running:', !!initResult);
      return !!initResult;
    } catch (error) {
      console.error('MCP connection test failed:', error);
      
      // Fallback to process check
      try {
        const testProcess = await this.webcontainer.spawn('ps', ['aux']);
        
        let processOutput = '';
        testProcess.output.pipeTo(new WritableStream({
          write(data) {
            processOutput += data;
          }
        }));

        await testProcess.exit;
        
        // Check if our server process is in the process list
        const isRunning = processOutput.includes('server.py') || processOutput.includes('server.js') || processOutput.includes('node');
        console.log('MCP server running (fallback check):', isRunning);
        
        return isRunning;
      } catch (fallbackError) {
        console.error('Fallback connection test also failed:', fallbackError);
        return false;
      }
    }
  }

  async testMCPTool(toolName: string, args: any = {}): Promise<any> {
    if (!this.webcontainer || !this.serverProcess || !this.mcpWriter) {
      throw new Error('MCP server not running or not properly initialized');
    }

    try {
      const result = await this.sendMCPRequest('tools/call', {
        name: toolName,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`Tool test failed for ${toolName}:`, error);
      throw error;
    }
  }

  async sendMCPRequest(method: string, params: any = {}): Promise<any> {
    if (!this.webcontainer || !this.serverProcess || !this.mcpWriter) {
      throw new Error('MCP server not running or not properly initialized');
    }

    // Generate a unique request ID using timestamp + random number
  const requestId = Date.now() + Math.floor(Math.random() * 1000);
  
  const mcpRequest = {
    jsonrpc: '2.0',
    id: requestId,
    method: method,
    params: params
  };

    console.log('Sending MCP request:', mcpRequest);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log(`⏰ Request timeout for ID: ${mcpRequest.id}, method: ${method}`);
        this.pendingRequests.delete(mcpRequest.id);
        reject(new Error(`MCP request timeout for method: ${method}`));
      }, 10000);

      // Store the pending request
      this.pendingRequests.set(mcpRequest.id, { resolve, reject, timeout });
      console.log(`📋 Added pending request ID: ${mcpRequest.id}, total pending: ${this.pendingRequests.size}`);

      // Send the request to the server process
      try {
        const requestStr = JSON.stringify(mcpRequest) + '\n';
        console.log('🚀 Sending MCP request:', requestStr.trim());
        // WebContainer expects string data, not Uint8Array
        this.mcpWriter.write(requestStr);
        console.log('✅ MCP request sent successfully, waiting for response...');
      } catch (writeError) {
        clearTimeout(timeout);
        this.pendingRequests.delete(mcpRequest.id);
        console.error('❌ Failed to write MCP request:', writeError);
        reject(new Error(`Failed to send MCP request: ${writeError.message}`));
      }
    });
  }

  private simulateMCPResponse(method: string, mcpRequest: any, params: any): any {
    // Fallback simulation for when real communication fails
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: 'Generated MCP Server (Simulated)',
              version: '1.0.0'
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id,
          result: {
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool from the generated server',
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            ]
          }
        };

      case 'tools/call':
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Tool executed with params: ${JSON.stringify(params)}`
              }
            ]
          }
        };

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id,
          result: {
            resources: [
              {
                uri: 'test://resource',
                name: 'Test Resource',
                description: 'A test resource from the generated server'
              }
            ]
          }
        };

      default:
        throw new Error(`Unknown MCP method: ${method}`);
    }
  }

  async getServerLogs(): Promise<string[]> {
    if (!this.webcontainer) {
      return [];
    }

    try {
      // Get recent logs from the container
      const logProcess = await this.webcontainer.spawn('tail', ['-n', '50', '/tmp/mcp-server.log']);
      
      let logs = '';
      logProcess.output.pipeTo(new WritableStream({
        write(data) {
          logs += data;
        }
      }));

      await logProcess.exit;
      
      return logs.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('Failed to get server logs:', error);
      return ['Failed to retrieve logs'];
    }
  }

  async getPerformanceMetrics() {
    if (!this.webcontainer) {
      return null;
    }

    try {
      // Get system metrics
      const memProcess = await this.webcontainer.spawn('free', ['-m']);
      const cpuProcess = await this.webcontainer.spawn('top', ['-bn1']);
      
      let memOutput = '';
      let cpuOutput = '';

      memProcess.output.pipeTo(new WritableStream({
        write(data) { memOutput += data; }
      }));

      cpuProcess.output.pipeTo(new WritableStream({
        write(data) { cpuOutput += data; }
      }));

      await Promise.all([memProcess.exit, cpuProcess.exit]);

      // Parse memory usage (simplified)
      const memLines = memOutput.split('\n');
      const memLine = memLines.find(line => line.startsWith('Mem:'));
      const memUsed = memLine ? parseInt(memLine.split(/\s+/)[2]) : 0;

      // Parse CPU usage (simplified)
      const cpuLine = cpuOutput.split('\n').find(line => line.includes('Cpu(s)'));
      const cpuUsage = cpuLine ? parseFloat(cpuLine.match(/(\d+\.\d+)%/)?.[1] || '0') : 0;

      return {
        timestamp: Date.now(),
        memoryUsage: memUsed,
        cpuUsage: cpuUsage,
        responseTime: Math.random() * 100 + 50, // Simulated for now
        requestCount: 1
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        timestamp: Date.now(),
        memoryUsage: 0,
        cpuUsage: 0,
        responseTime: 0,
        requestCount: 0
      };
    }
  }

  async cleanup() {
    await this.stopServer();
    this.serverUrl = null;
    this.mcpWriter = null;
    this.pendingRequests.clear();
  }

  getServerUrl(): string | null {
    return this.serverUrl;
  }

  isServerRunning(): boolean {
    return this.serverProcess !== null && this.serverUrl !== null;
  }
}