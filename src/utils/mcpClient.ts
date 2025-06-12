/**
 * Production MCP Client that dynamically discovers tools from the generated server
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface MCPClientSession {
  initialize(): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  listResources(): Promise<MCPResource[]>;
  callTool(name: string, args: any): Promise<any>;
  readResource(uri: string): Promise<any>;
  close(): Promise<void>;
}

/**
 * WebContainer MCP Client that dynamically discovers tools from the generated server
 */
export class WebContainerMCPClient implements MCPClientSession {
  private webContainer: any;
  private serverProcess: any;
  private webContainerManager: any = null;
  private isInitialized = false;
  private isDisposed = false;
  private cachedTools: MCPTool[] | null = null;
  private cachedResources: MCPResource[] | null = null;

  constructor(webContainer: any, serverProcess: any) {
    this.webContainer = webContainer;
    this.serverProcess = serverProcess;
  }

  private findWebContainerManager(): any {
    // Try multiple ways to find the WebContainerManager
    if (this.webContainerManager) {
      return this.webContainerManager;
    }

    if (typeof window !== 'undefined') {
      // Try global instance
      const globalManager = (window as any).webContainerManagerInstance;
      if (globalManager && typeof globalManager.sendMCPRequest === 'function') {
        this.webContainerManager = globalManager;
        return this.webContainerManager;
      }

      // Try other possible locations
      const altManager = (window as any).webContainerManager;
      if (altManager && typeof altManager.sendMCPRequest === 'function') {
        this.webContainerManager = altManager;
        return this.webContainerManager;
      }
    }

    return null;
  }

  private async sendMCPRequest(method: string, params: any = {}): Promise<any> {
    if (this.isDisposed) {
      throw new Error('MCP client has been disposed');
    }

    const manager = this.findWebContainerManager();
    if (!manager) {
      throw new Error('WebContainerManager not found - make sure it is exposed globally');
    }

    console.log(`📤 Sending MCP request via WebContainerManager: ${method}`);
    
    try {
      const result = await manager.sendMCPRequest(method, params);
      console.log(`✅ MCP request ${method} successful:`, result);
      return result;
    } catch (error) {
      console.error(`❌ MCP request ${method} failed:`, error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Find the WebContainerManager
      const manager = this.findWebContainerManager();
      if (!manager) {
        throw new Error('WebContainerManager not available');
      }

      console.log('✅ Found WebContainerManager, testing connection...');

      // Test the connection with an initialize request
      const result = await this.sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {}
        },
        clientInfo: {
          name: 'WebContainer MCP Client',
          version: '1.0.0'
        }
      });

      console.log('✅ MCP Client initialized successfully:', result);
      this.isInitialized = true;

      // Pre-fetch tools and resources to cache them
      await this.refreshToolsAndResources();
    } catch (error) {
      console.error('❌ MCP initialization failed:', error);
      throw error;
    }
  }

  private async refreshToolsAndResources(): Promise<void> {
    try {
      console.log('🔄 Refreshing tools and resources from MCP server...');
      
      // Clear cache
      this.cachedTools = null;
      this.cachedResources = null;

      // Fetch fresh data
      const [tools, resources] = await Promise.all([
        this.fetchToolsFromServer(),
        this.fetchResourcesFromServer()
      ]);

      this.cachedTools = tools;
      this.cachedResources = resources;

      console.log(`✅ Cached ${tools.length} tools and ${resources.length} resources`);
    } catch (error) {
      console.error('❌ Failed to refresh tools and resources:', error);
      // Don't throw here, let individual methods handle fallbacks
    }
  }

  private async fetchToolsFromServer(): Promise<MCPTool[]> {
  try {
    console.log('🔧 Fetching tools from MCP server...');
    const result = await this.sendMCPRequest('tools/list');
    
    // Handle different response formats from the generated server
    let tools = [];
    
    if (result?.result?.tools) {
      tools = result.result.tools;
    } else if (result?.tools) {
      tools = result.tools;
    } else if (Array.isArray(result)) {
      tools = result;
    } else {
      console.warn('Unexpected tools response format:', result);
      tools = [];
    }

    console.log('🔧 Raw tools from server:', tools);

    // Validate that tools is an array
    if (!Array.isArray(tools)) {
      console.warn('Tools is not an array:', typeof tools, tools);
      tools = [];
    }

    // Normalize tool format
    const normalizedTools = tools.map((tool: any) => {
      // Handle different tool object formats
      const normalizedTool = {
        name: tool.name || tool.toolName || 'unknown_tool',
        description: tool.description || tool.desc || 'No description available',
        inputSchema: tool.inputSchema || tool.input_schema || tool.schema || {
          type: 'object',
          properties: {}
        }
      };

      // Validate the tool has required fields
      if (!normalizedTool.name || normalizedTool.name === 'unknown_tool') {
        console.warn('Tool missing name:', tool);
      }

      return normalizedTool;
    }).filter((tool: any) => tool.name && tool.name !== 'unknown_tool'); // Filter out invalid tools

    console.log('🔧 Normalized tools:', normalizedTools);
    return normalizedTools;
  } catch (error) {
    console.error('❌ Failed to fetch tools from server:', error);
    return [];
  }
}

private async fetchResourcesFromServer(): Promise<MCPResource[]> {
  try {
    console.log('📊 Fetching resources from MCP server...');
    const result = await this.sendMCPRequest('resources/list');
    
    // Handle different response formats from the generated server
    let resources = [];
    
    if (result?.result?.resources) {
      resources = result.result.resources;
    } else if (result?.resources) {
      resources = result.resources;
    } else if (Array.isArray(result)) {
      resources = result;
    } else {
      console.warn('Unexpected resources response format:', result);
      resources = [];
    }

    console.log('📊 Raw resources from server:', resources);

    // Validate that resources is an array
    if (!Array.isArray(resources)) {
      console.warn('Resources is not an array:', typeof resources, resources);
      resources = [];
    }

    // Normalize resource format
    const normalizedResources = resources.map((resource: any) => ({
      uri: resource.uri || resource.url || 'unknown://resource',
      name: resource.name || resource.title || 'Unknown Resource',
      description: resource.description || resource.desc || 'No description available',
      mimeType: resource.mimeType || resource.mime_type || resource.contentType || 'application/json'
    })).filter((resource: any) => resource.uri && resource.uri !== 'unknown://resource'); // Filter out invalid resources

    console.log('📊 Normalized resources:', normalizedResources);
    return normalizedResources;
  } catch (error) {
    console.error('❌ Failed to fetch resources from server:', error);
    return [];
  }
}

  async listTools(): Promise<MCPTool[]> {
    try {
      // Return cached tools if available
      if (this.cachedTools) {
        console.log('🔧 Returning cached tools:', this.cachedTools);
        return this.cachedTools;
      }

      // Fetch fresh tools
      const tools = await this.fetchToolsFromServer();
      this.cachedTools = tools;
      return tools;
    } catch (error) {
      console.error('❌ Failed to list MCP tools:', error);
      throw error;
    }
  }

  async listResources(): Promise<MCPResource[]> {
    try {
      // Return cached resources if available
      if (this.cachedResources) {
        console.log('📊 Returning cached resources:', this.cachedResources);
        return this.cachedResources;
      }

      // Fetch fresh resources
      const resources = await this.fetchResourcesFromServer();
      this.cachedResources = resources;
      return resources;
    } catch (error) {
      console.error('❌ Failed to list MCP resources:', error);
      throw error;
    }
  }

  async callTool(name: string, args: any): Promise<any> {
    try {
      console.log(`🔧 Calling MCP tool: ${name} with args:`, args);
      
      // Validate that the tool exists
      const tools = await this.listTools();
      const tool = tools.find(t => t.name === name);
      
      if (!tool) {
        const availableTools = tools.map(t => t.name).join(', ');
        throw new Error(`Tool '${name}' not found. Available tools: ${availableTools}`);
      }

      console.log(`✅ Tool '${name}' found, calling...`);
      
      const result = await this.sendMCPRequest('tools/call', {
        name,
        arguments: args
      });
      
      console.log(`✅ MCP tool ${name} result:`, result);
      
      // Return the result, handling different response formats
      return result?.result || result;
    } catch (error) {
      console.error(`❌ MCP tool ${name} failed:`, error);
      throw error;
    }
  }

  async readResource(uri: string): Promise<any> {
    try {
      console.log(`📊 Reading MCP resource: ${uri}`);
      
      // Validate that the resource exists
      const resources = await this.listResources();
      const resource = resources.find(r => r.uri === uri);
      
      if (!resource) {
        const availableResources = resources.map(r => r.uri).join(', ');
        throw new Error(`Resource '${uri}' not found. Available resources: ${availableResources}`);
      }

      console.log(`✅ Resource '${uri}' found, reading...`);
      
      const result = await this.sendMCPRequest('resources/read', { uri });
      console.log(`✅ MCP resource ${uri} result:`, result);
      return result?.result || result;
    } catch (error) {
      console.error(`❌ MCP resource ${uri} failed:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.isDisposed = true;
    this.isInitialized = false;
    this.webContainerManager = null;
    this.cachedTools = null;
    this.cachedResources = null;
    console.log('🔌 MCP Client closed');
  }
}

/**
 * Fallback MCP Client for when the real server is not available
 */
export class FallbackMCPClient implements MCPClientSession {
  private isInitialized = false;

  async initialize(): Promise<void> {
    console.log('🔄 Using fallback MCP client (simulated responses)');
    this.isInitialized = true;
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'fallback_tool',
        description: 'Fallback tool - MCP server not connected',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Test message' }
          }
        }
      }
    ];
  }

  async listResources(): Promise<MCPResource[]> {
    return [
      {
        uri: 'fallback://resource',
        name: 'Fallback Resource',
        description: 'Fallback resource - MCP server not connected'
      }
    ];
  }

  async callTool(name: string, args: any): Promise<any> {
    console.log(`🔧 Fallback tool call: ${name}`, args);
    
    return {
      content: [{
        text: `Fallback response for tool '${name}' with arguments: ${JSON.stringify(args, null, 2)}\n\nNote: This is a simulated response. Connect to the real MCP server for actual functionality.`
      }]
    };
  }

  async readResource(uri: string): Promise<any> {
    return {
      content: [{
        text: `Fallback resource content for: ${uri}\n\nNote: This is simulated content. Connect to the real MCP server for actual data.`
      }]
    };
  }

  async close(): Promise<void> {
    console.log('🔌 Fallback MCP Client closed');
  }
}

/**
 * Factory function that creates the appropriate MCP client
 */
export function createMCPClient(webContainer: any, serverProcess: any): MCPClientSession {
  try {
    console.log('🏭 Creating WebContainer MCP Client...');
    return new WebContainerMCPClient(webContainer, serverProcess);
  } catch (error) {
    console.warn('Failed to create WebContainer MCP client, using fallback:', error);
    return new FallbackMCPClient();
  }
}

/**
 * Enhanced Hugging Face MCP Integration with dynamic tool discovery
 */
export class HuggingFaceMCPIntegration {
  private mcpClient: MCPClientSession;
  private apiKey: string;
  private modelId: string;

  constructor(mcpClient: MCPClientSession, apiKey: string, modelId: string = 'meta-llama/Llama-3.3-70B-Instruct') {
    this.mcpClient = mcpClient;
    this.apiKey = apiKey;
    this.modelId = modelId;
  }

  private async generateSystemPrompt(): Promise<string> {
    try {
      console.log('🧠 Generating dynamic system prompt from MCP server...');
      
      const [tools, resources] = await Promise.all([
        this.mcpClient.listTools(),
        this.mcpClient.listResources()
      ]);

      console.log('🔧 Available tools for LLM:', tools);
      console.log('📊 Available resources for LLM:', resources);

      const toolsDescription = tools.length > 0 
        ? tools.map(tool => 
            `- ${tool.name}: ${tool.description}
    Parameters: ${JSON.stringify(tool.inputSchema, null, 2)}`
          ).join('\n\n')
        : 'No tools available';

      const resourcesDescription = resources.length > 0
        ? resources.map(resource => 
            `- ${resource.name} (${resource.uri}): ${resource.description}`
          ).join('\n')
        : 'No resources available';

      const systemPrompt = `You are an AI assistant with access to a Model Context Protocol (MCP) server. You can call functions to interact with APIs and retrieve data.

AVAILABLE TOOLS (${tools.length}):
${toolsDescription}

AVAILABLE RESOURCES (${resources.length}):
${resourcesDescription}

INSTRUCTIONS:
1. When users ask for information that can be retrieved using these tools, call the appropriate tool
2. Always explain what you're doing before calling tools
3. Present the results in a clear, user-friendly format
4. If a tool call fails, explain the error and suggest alternatives
5. Be conversational and helpful
6. Use the EXACT tool names as listed above

TOOL CALLING FORMAT:
When you need to call a tool, use this exact format:
[TOOL_CALL]
{
  "name": "exact_tool_name",
  "arguments": {
    "parameter": "value"
  }
}
[/TOOL_CALL]

Example:
User: "Show me some posts"
Assistant: I'll fetch some posts for you using the API.

[TOOL_CALL]
{
  "name": "get_all_posts",
  "arguments": {
    "_limit": "5"
  }
}
[/TOOL_CALL]

Remember to be natural and conversational while using these tools effectively. Always use the exact tool names from the list above.`;

      console.log('✅ Generated dynamic system prompt');
      return systemPrompt;
    } catch (error) {
      console.error('Failed to generate system prompt:', error);
      return 'You are an AI assistant. The MCP server is not available, so I cannot access any tools or resources right now.';
    }
  }

  async processQuery(userMessage: string, conversationHistory: any[] = []): Promise<string> {
    try {
      console.log('🤖 Processing query with dynamic MCP integration...');
      
      const systemPrompt = await this.generateSystemPrompt();
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      let llmResponse = await this.callHuggingFaceAPI(messages);
      llmResponse = await this.processToolCalls(llmResponse);

      return llmResponse;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  private async callHuggingFaceAPI(messages: any[]): Promise<string> {
    const apiUrl = `https://api-inference.huggingface.co/models/${this.modelId}`;
    
    // Try chat completions API first for Llama models
    if (this.modelId.includes('llama') || this.modelId.includes('Llama')) {
      try {
        const response = await fetch(`${apiUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: false
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.choices?.[0]?.message?.content) {
            return result.choices[0].message.content.trim();
          }
        }
      } catch (error) {
        console.log('Chat completions failed, trying inference API...');
      }
    }

    // Fallback to inference API
    const conversationText = messages.map(msg => 
      `${msg.role === 'user' ? 'User' : msg.role === 'system' ? 'System' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: conversationText + '\nAssistant:',
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false,
          stop: ['User:', 'Human:', '\nUser:', '\nHuman:']
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (Array.isArray(result) && result[0]?.generated_text) {
      return result[0].generated_text.trim();
    } else if (result.generated_text) {
      return result.generated_text.trim();
    } else {
      throw new Error('Unexpected response format from Hugging Face API');
    }
  }

  private async processToolCalls(llmResponse: string): Promise<string> {
    const toolCallRegex = /\[TOOL_CALL\](.*?)\[\/TOOL_CALL\]/gs;
    let processedResponse = llmResponse;
    let match;

    while ((match = toolCallRegex.exec(llmResponse)) !== null) {
      try {
        const toolCall = JSON.parse(match[1].trim());
        console.log('🔧 Processing dynamic tool call:', toolCall);

        // Validate tool exists
        const tools = await this.mcpClient.listTools();
        const tool = tools.find(t => t.name === toolCall.name);
        
        if (!tool) {
          const availableTools = tools.map(t => t.name).join(', ');
          throw new Error(`Tool '${toolCall.name}' not found. Available tools: ${availableTools}`);
        }

        const result = await this.mcpClient.callTool(toolCall.name, toolCall.arguments || {});
        
        let resultText = '';
        if (result?.content?.[0]?.text) {
          resultText = result.content[0].text;
        } else {
          resultText = JSON.stringify(result, null, 2);
        }

        const toolCallText = match[0];
        const resultSection = `\n\n📊 **${toolCall.name} Result:**\n\`\`\`\n${resultText}\n\`\`\``;
        
        processedResponse = processedResponse.replace(toolCallText, resultSection);
        
      } catch (error) {
        console.error('Tool call failed:', error);
        const errorSection = `\n\n❌ **Tool Error:** ${error.message}`;
        processedResponse = processedResponse.replace(match[0], errorSection);
      }
    }

    return processedResponse;
  }
}