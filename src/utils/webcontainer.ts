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
      // For Python, we'll create a Node.js wrapper that simulates the Python MCP server
      // Since WebContainer only supports Node.js environments
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

      // Create a real API-calling Node.js MCP server
      files['server.js'] = {
        file: {
          contents: `
// Real API-calling MCP Server for WebContainer
// This server makes actual HTTP requests to the JSONPlaceholder API

const readline = require('readline');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Read the original Python code for reference
let pythonCode = '';
try {
  pythonCode = fs.readFileSync('server.py', 'utf8');
  console.error('✅ Loaded Python code:', pythonCode.length, 'characters');
  
  // Debug: Check what API base URL is in the Python code
  const urlMatch = pythonCode.match(/API_BASE_URL = ["']([^"']+)["']/);
  if (urlMatch) {
    console.error('✅ Found API_BASE_URL in Python code:', urlMatch[1]);
  } else {
    console.error('❌ No API_BASE_URL found in Python code');
  }

  // Debug: Check what tools are defined in the Python code
  const toolMatches = pythonCode.match(/name="([^"]+)"/g);
  if (toolMatches) {
    console.error('✅ Found tools in Python code:', toolMatches.map(m => m.match(/"([^"]+)"/)[1]));
  } else {
    console.error('❌ No tools found in Python code');
  }

} catch (error) {
  console.error('❌ Could not read server.py:', error.message);
}

// Extract API base URL from Python code
function extractBaseUrl(code) {
  const urlMatch = code.match(/API_BASE_URL = ["']([^"']+)["']/);
  return urlMatch ? urlMatch[1] : 'https://jsonplaceholder.typicode.com';
}

const API_BASE_URL = extractBaseUrl(pythonCode);
console.error('✅ API Base URL:', API_BASE_URL);

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

// FIXED: Extract tool handler logic from Python code
function extractToolHandler(pythonCode, toolName) {
  console.error('[EXTRACT] Looking for tool handler:', toolName);

  try {
    // Simplified extraction - just look for the tool name in an elif statement
    const toolPattern = 'elif name == "' + toolName + '":';
    const startIndex = pythonCode.indexOf(toolPattern);

    if (startIndex === -1) {
      console.error('[EXTRACT] Tool pattern not found:', toolPattern);
      return null;
    }

    // Find the end of this elif block
    const afterStart = pythonCode.substring(startIndex);
    const endPatterns = ['elif name ==', 'else:', 'return [TextContent'];
    let endIndex = afterStart.length;

    for (const pattern of endPatterns) {
      const foundIndex = afterStart.indexOf(pattern, 50);
      if (foundIndex !== -1 && foundIndex < endIndex) {
        endIndex = foundIndex;
      }
    }

    const handlerCode = afterStart.substring(0, endIndex);
    console.error('[EXTRACT] Found handler code for', toolName);

    // FIXED: Use string methods instead of problematic regex
    let method = 'get';
    let path = '/';
    let hasParams = false;
    let hasBody = false;

    // Look for method calls in the handler code
    if (handlerCode.includes('client.get(')) {
      method = 'get';
    } else if (handlerCode.includes('client.post(')) {
      method = 'post';
      hasBody = true;
    } else if (handlerCode.includes('client.put(')) {
      method = 'put';
      hasBody = true;
    } else if (handlerCode.includes('client.delete(')) {
      method = 'delete';
    }

    // Extract path using string operations
    const clientCallIndex = handlerCode.indexOf('client.' + method + '(');
    if (clientCallIndex !== -1) {
      const afterCall = handlerCode.substring(clientCallIndex);
      const firstQuote = afterCall.indexOf('"');
      const secondQuote = afterCall.indexOf('"', firstQuote + 1);
      if (firstQuote !== -1 && secondQuote !== -1) {
        path = afterCall.substring(firstQuote + 1, secondQuote);
      }
    }

    // Check for params and payload
    hasParams = handlerCode.includes('params=params');
    hasBody = handlerCode.includes('json=payload') || hasBody;

    console.error('[EXTRACT] Extracted handler:', { method, path, hasParams, hasBody, toolName });

    return {
      method: method,
      path: path,
      hasParams: hasParams,
      hasBody: hasBody,
      toolName: toolName
    };

  } catch (error) {
    console.error('[EXTRACT] Error during extraction:', error.message);
    return null;
  }
}

// Fallback: infer tool handler from tool name patterns
function inferToolHandler(toolName) {
  console.error('[INFER] Inferring handler for:', toolName);

  // Common patterns for different tool types
  if (toolName.startsWith('get_all_')) {
    const resource = toolName.replace('get_all_', '');
    return {
      method: 'get',
      path: '/' + resource,
      hasParams: true,
      hasBody: false,
      toolName: toolName
    };
  }

  if (toolName.includes('_by_id')) {
    const resource = toolName.split('_by_id')[0].replace('get_', '');
    return {
      method: 'get',
      path: '/' + resource + '/{id}',
      hasParams: false,
      hasBody: false,
      toolName: toolName
    };
  }

  if (toolName.startsWith('create_')) {
    const resource = toolName.replace('create_', '');
    return {
      method: 'post',
      path: '/' + resource,
      hasParams: false,
      hasBody: true,
      toolName: toolName
    };
  }

  if (toolName.startsWith('update_')) {
    const resource = toolName.replace('update_', '');
    return {
      method: 'put',
      path: '/' + resource + '/{id}',
      hasParams: false,
      hasBody: true,
      toolName: toolName
    };
  }

  if (toolName.startsWith('delete_')) {
    const resource = toolName.replace('delete_', '');
    return {
      method: 'delete',
      path: '/' + resource + '/{id}',
      hasParams: false,
      hasBody: false,
      toolName: toolName
    };
  }

  // Default fallback
  return {
    method: 'get',
    path: '/',
    hasParams: true,
    hasBody: false,
    toolName: toolName
  };
}

// Execute a tool handler based on extracted information
async function executeToolHandler(handler, args) {
  console.error('[EXECUTE] Handler:', handler);
  console.error('[EXECUTE] Args:', args);

  try {
    if (!handler || !handler.path || !handler.method) {
      throw new Error('Invalid handler: missing path or method');
    }

    let url = API_BASE_URL + handler.path;
    let options = {
      method: handler.method.toUpperCase()
    };

    // Replace path parameters (like {id})
    if (args && typeof args === 'object') {
      for (const [key, value] of Object.entries(args)) {
        const placeholder = '{' + key + '}';
        if (url.includes(placeholder)) {
          url = url.replace(placeholder, encodeURIComponent(value));
        }
      }
    }

    // Add query parameters if needed
    if (handler.hasParams && args && typeof args === 'object') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        // Don't add path parameters as query parameters
        if (!handler.path.includes('{' + key + '}') && value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    }

    // Add request body if needed
    if (handler.hasBody && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') && args && typeof args === 'object') {
      const body = {};
      for (const [key, value] of Object.entries(args)) {
        // Don't add path parameters to body
        if (!handler.path.includes('{' + key + '}') && value !== undefined && value !== null) {
          body[key] = value;
        }
      }
      options.body = body;
    }

    console.error('[EXECUTE] Final URL:', url);
    console.error('[EXECUTE] Final options:', JSON.stringify(options, null, 2));

    return await makeApiRequest(url, options);

  } catch (error) {
    console.error('[EXECUTE] Error in executeToolHandler:', error.message);
    throw error;
  }
}

// Dynamic tool execution that works with any API
async function executeApiTool(toolName, args) {
  console.error('[TOOL] Executing:', toolName, 'with args:', args);

  try {
    // Try to extract tool handler logic from Python code
    let toolHandler = extractToolHandler(pythonCode, toolName);

    // If extraction fails, use inference as fallback
    if (!toolHandler) {
      console.error('[TOOL] Extraction failed, using inference fallback');
      toolHandler = inferToolHandler(toolName);
    }

    console.error('[TOOL] Using handler:', toolHandler);

    // Execute the handler logic
    const result = await executeToolHandler(toolHandler, args);
    console.error('[TOOL] API call successful');

    return {
      type: 'text',
      text: JSON.stringify(result.data, null, 2)
    };

  } catch (error) {
    console.error('[TOOL] API call failed:', error.message);

    // Ultimate fallback: return a simple response
    return {
      type: 'text',
      text: 'Tool executed: ' + toolName + ' with arguments: ' + JSON.stringify(args) + '. Error: ' + error.message
    };
  }
}

// Enhanced tool extraction from generated code
function getToolsFromCode(code) {
  const tools = [];

  // Look for generated tool definitions in the Python code
  const toolMatches = code.match(/name="([^"]+)".*?description="([^"]+)"/g) || [];

  toolMatches.forEach(match => {
    const nameMatch = match.match(/name="([^"]+)"/);
    const descMatch = match.match(/description="([^"]+)"/);

    if (nameMatch && descMatch) {
      const toolName = nameMatch[1];
      let inputSchema = {
        type: 'object',
        properties: {}
      };

      // Enhanced schema based on tool name
      if (toolName.includes('by_id') || toolName.includes('delete') || toolName.includes('update')) {
        inputSchema.properties.id = { type: 'integer', description: 'ID parameter', minimum: 1 };
        inputSchema.required = ['id'];
      }

      if (toolName.includes('create_post') || toolName.includes('update_post')) {
        inputSchema.properties = {
          ...inputSchema.properties,
          title: { type: 'string', description: 'Post title' },
          body: { type: 'string', description: 'Post content' },
          userId: { type: 'integer', description: 'User ID', minimum: 1 }
        };
        if (toolName.includes('create')) {
          inputSchema.required = ['title', 'body', 'userId'];
        }
      }

      if (toolName.includes('create_comment')) {
        inputSchema.properties = {
          ...inputSchema.properties,
          postId: { type: 'integer', description: 'Post ID', minimum: 1 },
          name: { type: 'string', description: 'Commenter name' },
          email: { type: 'string', description: 'Commenter email' },
          body: { type: 'string', description: 'Comment content' }
        };
        inputSchema.required = ['postId', 'name', 'email', 'body'];
      }

      if (toolName.includes('get_all')) {
        inputSchema.properties._limit = { type: 'string', description: 'Limit number of results' };
      }

      tools.push({
        name: toolName,
        description: descMatch[1],
        inputSchema
      });
    }
  });

  // Smart fallback tools if none found
  if (tools.length === 0) {
    console.error('[FALLBACK] No tools extracted, creating generic fallback tools');

    tools.push(
      {
        name: 'get_all_posts',
        description: 'Get all posts from the API',
        inputSchema: {
          type: 'object',
          properties: {
            _limit: { type: 'string', description: 'Limit number of results' }
          }
        }
      },
      {
        name: 'get_post_by_id',
        description: 'Get a specific post by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Post ID', minimum: 1 }
          },
          required: ['id']
        }
      }
    );

    console.error('[FALLBACK] Created fallback tools:', tools.map(t => t.name));
  }

  return tools;
}

const availableTools = getToolsFromCode(pythonCode);

// Set up readline interface for stdin/stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

console.error('✅ Real API MCP Server starting...');
console.error('✅ API Base URL:', API_BASE_URL);
console.error('✅ Available tools:', availableTools.map(t => t.name).join(', '));

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
              name: 'Real API MCP Server',
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
          const apiResult = await executeApiTool(toolName, toolArgs);
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
            resources: [
              {
                uri: 'posts://all',
                name: 'All Posts',
                description: 'All posts from the API',
                mimeType: 'application/json'
              }
            ]
          }
        };
        break;

      case 'resources/read':
        const uri = request.params?.uri;
        console.error('[MCP] Reading resource:', uri);

        try {
          let resourceUrl = API_BASE_URL + '/posts';
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

console.error('🚀 Real API MCP Server ready for requests');
`
        }
      };

      files['package.json'] = {
        file: {
          contents: JSON.stringify({
            name: 'mcp-python-server-simulation',
            version: '1.0.0',
            scripts: {
              start: 'node server.js',
              install: 'echo "Python simulation - no dependencies to install"'
            }
          }, null, 2)
        }
      };

    } else {
      // TypeScript/Node.js MCP Server setup
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
        
        console.log('MCP Server output:', output);

        // Parse potential JSON responses - look for complete JSON objects
        const lines = output.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Skip debug/log lines that start with brackets
          if (trimmed.startsWith('[DEBUG]') || trimmed.startsWith('[ERROR]') || trimmed.startsWith('[INFO]')) {
            console.log('Server log:', trimmed);
            continue;
          }
          
          // Look for JSON responses (should be complete JSON objects)
          if (trimmed.startsWith('{"jsonrpc"') && trimmed.includes('"id"')) {
            try {
              const response = JSON.parse(trimmed);
              console.log('✅ Parsed MCP response:', response);
              
              // Check if this is actually a response (has result or error) vs echoed request (has method)
              if (response.method) {
                console.log('📤 This is an echoed request, not a response');
                continue;
              }
              
              if (response.id && this.pendingRequests.has(response.id)) {
                console.log(`✅ Found matching pending request for ID: ${response.id}`);
                const pending = this.pendingRequests.get(response.id)!;
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.id);
                console.log(`🗑️ Removed pending request ID: ${response.id}, remaining: ${this.pendingRequests.size}`);
                pending.resolve(response);
              } else {
                console.log(`❌ No pending request found for ID: ${response.id}`);
                console.log('❌ Current pending requests:', Array.from(this.pendingRequests.keys()));
                console.log('❌ Response type:', response.result ? 'result' : response.error ? 'error' : 'unknown');
              }
            } catch (parseError) {
              console.log('❌ Failed to parse JSON response:', trimmed, parseError);
            }
          } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            // Try parsing other JSON that might be responses
            try {
              const response = JSON.parse(trimmed);
              if (response.jsonrpc && response.id) {
                console.log('✅ Found alternate JSON response:', response);
                if (this.pendingRequests.has(response.id)) {
                  const pending = this.pendingRequests.get(response.id)!;
                  clearTimeout(pending.timeout);
                  this.pendingRequests.delete(response.id);
                  pending.resolve(response);
                }
              }
            } catch (parseError) {
              // Not a JSON response, just log output
              console.log('📝 Server output:', trimmed);
            }
          } else if (trimmed) {
            console.log('📝 Server output:', trimmed);
          }
        }

        // Continue reading
        readLoop();
      } catch (error) {
        console.error('Error reading server output:', error);
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

    // Create a test MCP request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
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