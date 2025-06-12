/**
 * Enhanced MCP Integration with Context-Aware Chained Prompting
 * This replaces the existing HuggingFaceMCPIntegration with a sophisticated system
 */

import { MCPClientSession } from './mcpClient';
import { ContextStore, ConversationContext } from './contextStore';
import { PromptChainOrchestrator } from './promptChainOrchestrator';
import { ResponseSynthesisEngine, SynthesisConfig } from './responseSynthesisEngine';

export interface EnhancedMCPConfig {
  llmProvider: 'huggingface' | 'openai' | 'anthropic';
  apiKey: string;
  modelId: string;
  synthesisConfig?: Partial<SynthesisConfig>;
  enableChaining: boolean;
  enableContextManagement: boolean;
  maxResponseTime: number;
}

export interface ProcessingResult {
  response: string;
  confidence: number;
  processingTime: number;
  chainsUsed: number;
  contextUsed: boolean;
  metadata: ProcessingMetadata;
}

export interface ProcessingMetadata {
  mcpToolsCalled: string[];
  reasoningSteps: string[];
  sourcesUsed: string[];
  contradictionsResolved: number;
  userPersonalization: boolean;
}

export class EnhancedMCPIntegration {
  private mcpClient: MCPClientSession;
  private contextStore: ContextStore;
  private chainOrchestrator: PromptChainOrchestrator;
  private synthesisEngine: ResponseSynthesisEngine;
  private config: EnhancedMCPConfig;
  private sessionId: string;

  constructor(
    mcpClient: MCPClientSession, 
    config: EnhancedMCPConfig,
    sessionId: string = 'default'
  ) {
    this.mcpClient = mcpClient;
    this.config = config;
    this.sessionId = sessionId;
    
    // Initialize core components
    this.contextStore = new ContextStore();
    this.chainOrchestrator = new PromptChainOrchestrator(this.contextStore, this.mcpClient);
    this.synthesisEngine = new ResponseSynthesisEngine();
    
    // Initialize session context
    this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    try {
      await this.contextStore.createContext(this.sessionId, {
        responseStyle: 'conversational',
        preferences: { enhancedProcessing: true }
      });
    } catch (error) {
      // Session might already exist
      console.log('Session already initialized or error:', error);
    }
  }

  /**
   * Main entry point for processing user queries with context-aware chained prompting
   */
  async processQuery(
    userMessage: string, 
    conversationHistory: any[] = []
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Add user message to context store
      await this.contextStore.addMessage(this.sessionId, {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        metadata: {}
      });

      // Determine query complexity
      const complexity = this.analyzeQueryComplexity(userMessage);
      
      // Process based on configuration
      let finalResponse: string;
      
      if (this.config.enableChaining && complexity !== 'simple') {
        // Use sophisticated chained prompting
        finalResponse = await this.processWithChaining(userMessage, complexity);
      } else {
        // Use direct processing with context awareness
        finalResponse = await this.processDirectly(userMessage);
      }
      
      // If we have an API key and the response seems to be raw MCP data, process it through LLM
      if (this.config.apiKey && this.looksLikeRawData(finalResponse)) {
        console.log('🧠 Post-processing raw MCP response through LLM...');
        finalResponse = await this.postProcessWithLLM(userMessage, finalResponse);
      }
      
      // Add assistant response to context
      await this.contextStore.addMessage(this.sessionId, {
        role: 'assistant',
        content: finalResponse,
        timestamp: new Date(),
        metadata: {
          processingTime: Date.now() - startTime
        }
      });
      
      return finalResponse;
      
    } catch (error) {
      console.error('Enhanced MCP processing failed:', error);
      return this.createFallbackResponse(userMessage, error);
    }
  }

  private analyzeQueryComplexity(query: string): 'simple' | 'medium' | 'complex' {
    const lowerQuery = query.toLowerCase();
    
    // For now, let's use direct processing for better reliability
    // Complex chaining will be enabled later once the basic flow works
    return 'simple';
    
    // Complex indicators (disabled for now)
    // const complexIndicators = [
    //   'analyze', 'compare', 'explain how', 'what are the differences',
    //   'step by step', 'multiple', 'various', 'comprehensive',
    //   'detailed analysis', 'in depth'
    // ];
    
    // Medium indicators (disabled for now)
    // const mediumIndicators = [
    //   'how to', 'what is', 'can you', 'show me', 'get me',
    //   'create', 'generate', 'find', 'search'
    // ];
  }

  private async processWithChaining(
    query: string, 
    complexity: 'medium' | 'complex'
  ): Promise<string> {
    console.log(`🔗 Processing with chained prompting (${complexity} complexity)`);
    
    // Use the orchestrator to handle the complex query
    const response = await this.chainOrchestrator.orchestrateQuery(
      this.sessionId,
      query,
      complexity
    );
    
    return response;
  }

  private async processDirectly(query: string): Promise<string> {
    console.log('⚡ Processing with direct context-aware response');
    
    // Get relevant context
    const contextResult = await this.contextStore.retrieveRelevantContext(
      this.sessionId,
      query,
      3
    );
    
    // Check if MCP tools are needed
    const needsMCP = this.queryNeedsMCPTools(query);
    
    if (needsMCP) {
      return await this.processWithMCPTools(query, contextResult);
    } else {
      return await this.processWithLLMOnly(query, contextResult);
    }
  }

  private queryNeedsMCPTools(query: string): boolean {
    const mcpKeywords = [
      'get', 'fetch', 'retrieve', 'show', 'list', 'find',
      'create', 'post', 'add', 'update', 'modify',
      'delete', 'remove', 'call', 'api', 'data'
    ];
    
    const lowerQuery = query.toLowerCase();
    return mcpKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private async processWithMCPTools(query: string, contextResult: any): Promise<string> {
    try {
      // Discover available tools
      const tools = await this.mcpClient.listTools();
      
      if (tools.length === 0) {
        return "I'm connected to the MCP server, but no tools are currently available. Please ensure the server has been properly initialized with tools.";
      }
      
      // Select appropriate tool based on query
      const selectedTool = this.selectBestTool(query, tools);
      
      if (!selectedTool) {
        const toolsList = tools.map(t => `• ${t.name}: ${t.description}`).join('\n');
        return `I couldn't find a specific tool for your request. Here are the available tools:\n\n${toolsList}\n\nPlease specify which tool you'd like me to use or rephrase your request.`;
      }
      
      // Prepare tool arguments
      const toolArgs = this.prepareToolArguments(query, selectedTool);
      
      // Call the tool
      console.log(`🔧 Calling MCP tool: ${selectedTool.name}`);
      const toolResult = await this.mcpClient.callTool(selectedTool.name, toolArgs);
      
      // Process and synthesize the result
      return await this.synthesizeToolResult(query, selectedTool, toolResult, contextResult);
      
    } catch (error) {
      console.error('MCP tool processing failed:', error);
      return `I encountered an error while using the MCP tools: ${error.message}. Please try rephrasing your request or check if the MCP server is properly configured.`;
    }
  }

  private selectBestTool(query: string, tools: any[]): any | null {
    const lowerQuery = query.toLowerCase();
    
    // Score each tool based on relevance
    const scoredTools = tools.map(tool => {
      let score = 0;
      const toolName = tool.name.toLowerCase();
      const toolDesc = tool.description.toLowerCase();
      
      // Direct name matching
      if (lowerQuery.includes(toolName.replace(/_/g, ' '))) {
        score += 10;
      }
      
      // Action matching
      if (lowerQuery.includes('get') && toolName.includes('get')) score += 8;
      if (lowerQuery.includes('create') && toolName.includes('create')) score += 8;
      if (lowerQuery.includes('post') && toolName.includes('post')) score += 8;
      if (lowerQuery.includes('user') && toolName.includes('user')) score += 6;
      if (lowerQuery.includes('comment') && toolName.includes('comment')) score += 6;
      
      // Special handling for search/count queries
      if ((lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('check')) 
          && (lowerQuery.includes('post') || lowerQuery.includes('comment'))) {
        
        // Prefer tools that get ALL posts/comments, not specific ones
        if (toolName.includes('get') && toolName.includes('all') && toolName.includes('post')) {
          score += 20; // Highest priority for get all posts
        } else if (toolName.includes('get') && toolName.includes('post') && !toolName.includes('comment')) {
          score += 15; // High priority for get posts (but not specific post comments)
        } else if (toolName.includes('get') && toolName.includes('all') && toolName.includes('comment')) {
          score += 18; // High priority for get all comments
        } else if (toolName.includes('get') && toolName.includes('comment') && !toolName.includes('post')) {
          score += 12; // Medium priority for get comments
        }
        
        // Lower score for tools that need specific IDs (like get post comments)
        if (toolName.includes('get') && toolName.includes('post') && toolName.includes('comment')) {
          score -= 5; // This is probably get_post_comments which needs an ID
        }
      }
      
      // Description matching
      const queryWords = lowerQuery.split(/\s+/);
      queryWords.forEach(word => {
        if (word.length > 3 && toolDesc.includes(word)) {
          score += 2;
        }
      });
      
      return { tool, score };
    });
    
    // Log scoring for debugging
    console.log('🎯 Tool scoring for query:', query);
    scoredTools.forEach(({ tool, score }) => {
      console.log(`  ${tool.name}: ${score} points`);
    });
    
    // Return the highest scoring tool if it has a reasonable score
    const bestTool = scoredTools.sort((a, b) => b.score - a.score)[0];
    return bestTool && bestTool.score > 2 ? bestTool.tool : null;
  }

  private prepareToolArguments(query: string, tool: any): any {
    const args: any = {};
    
    // Extract common parameters from query
    const lowerQuery = query.toLowerCase();
    
    console.log(`🔧 Preparing arguments for tool: ${tool.name}`);
    console.log(`🔧 Query: ${query}`);
    
    // Handle arguments based on tool type
    if (tool.name.includes('create') || tool.name.includes('add')) {
      // For create operations, extract content
      if (lowerQuery.includes('post')) {
        args.title = 'Generated Post';
        args.body = 'This post was created through the Enhanced MCP Integration system.';
        args.userId = 1;
      }
    } else {
      // For get/list/retrieve operations - only add what's specifically requested
      
      // Look for specific ID parameters in the query
      const idMatch = query.match(/id\s*:?\s*(\d+)/i);
      if (idMatch) {
        args.id = idMatch[1];
      }
      
      // Look for specific user ID requests
      const userIdMatch = query.match(/user\s*id\s*:?\s*(\d+)/i) || query.match(/userId\s*:?\s*(\d+)/i);
      if (userIdMatch) {
        args.userId = userIdMatch[1];
      }
      
      // Handle limit parameters for non-search queries
      if (!(lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('check'))) {
        const limitMatch = query.match(/(\d+)/);
        if (limitMatch && (lowerQuery.includes('show') || lowerQuery.includes('get'))) {
          args._limit = limitMatch[1];
        } else if (lowerQuery.includes('few') || lowerQuery.includes('some')) {
          args._limit = '5';
        }
      } else {
        console.log(`🔧 Search/count query detected, not limiting results for ${tool.name}`);
      }
    }
    
    console.log(`🔧 Final arguments for ${tool.name}:`, args);
    return args;
  }

  private async synthesizeToolResult(
    query: string,
    tool: any,
    result: any,
    contextResult: any
  ): Promise<string> {
    // Extract meaningful content from tool result
    let resultContent = '';
    
    if (result?.content?.[0]?.text) {
      resultContent = result.content[0].text;
    } else if (typeof result === 'object') {
      resultContent = JSON.stringify(result, null, 2);
    } else {
      resultContent = String(result);
    }
    
    // Handle search/count queries specially
    if (query.toLowerCase().includes('how many') || query.toLowerCase().includes('count') || query.toLowerCase().includes('check')) {
      return this.synthesizeSearchResult(query, tool, resultContent);
    }
    
    // Create a context-aware response
    const contextInfo = contextResult.relevantMessages.length > 0 
      ? `Based on our previous conversation and your request, ` 
      : `Based on your request, `;
    
    // Format the response naturally
    const response = `${contextInfo}I used the **${tool.name}** tool to get the information you requested.\n\n**Result:**\n${this.formatToolOutput(resultContent)}\n\nIs there anything specific about this data you'd like me to explain or help you with?`;
    
    return this.cleanResponse(response);
  }

  private synthesizeSearchResult(query: string, tool: any, resultContent: string): string {
    try {
      // Parse the result to count items
      const parsed = JSON.parse(resultContent);
      
      if (Array.isArray(parsed)) {
        const searchTerm = this.extractSearchTerm(query);
        const matchingItems = this.searchInArray(parsed, searchTerm);
        
        const totalCount = parsed.length;
        const matchCount = matchingItems.length;
        
        let response = `I searched through ${totalCount} ${tool.name.includes('post') ? 'posts' : 'items'} using the **${tool.name}** tool.\n\n`;
        
        if (searchTerm) {
          response += `**Found ${matchCount} items containing "${searchTerm}":**\n\n`;
          
          if (matchCount > 0) {
            // Show up to 5 matching examples
            const examples = matchingItems.slice(0, 5).map((item, index) => {
              const title = item.title || item.name || `Item ${index + 1}`;
              const body = item.body || item.content || '';
              const preview = body ? ` - ${body.substring(0, 100)}...` : '';
              return `• **${title}**${preview}`;
            }).join('\n');
            
            response += examples;
            
            if (matchCount > 5) {
              response += `\n\n...and ${matchCount - 5} more items.`;
            }
          } else {
            response += `No items found containing "${searchTerm}".`;
          }
        } else {
          response += `Total items found: ${totalCount}`;
        }
        
        return response;
      }
    } catch (e) {
      // Fallback to regular formatting
    }
    
    return `Here's what I found using the **${tool.name}** tool:\n\n${this.formatToolOutput(resultContent)}`;
  }

  private extractSearchTerm(query: string): string {
    // Extract quoted terms or specific keywords
    const quotedMatch = query.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    
    // Look for common search patterns - improved patterns
    const patterns = [
      /word\s+"([^"]+)"/i,
      /contains?\s+"([^"]+)"/i,
      /with\s+"([^"]+)"/i,
      /have.*word\s+"([^"]+)"/i,
      /have.*word\s+(\w+)/i,
      /word\s+(\w+)/i,
      /contains?\s+(\w+)/i,
      /"([^"]+)"/,  // Any quoted term
      /\b(\w+)\s+in\s+it/i  // "test in it" pattern
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        console.log(`🔍 Extracted search term "${match[1]}" using pattern:`, pattern);
        return match[1];
      }
    }
    
    // Fallback: look for specific words that might be search terms
    const words = query.toLowerCase().split(/\s+/);
    const searchWords = words.filter(word => 
      word.length > 2 && 
      !['the', 'and', 'or', 'but', 'how', 'many', 'can', 'you', 'check', 'posts', 'comments', 'have', 'with', 'word', 'in', 'it'].includes(word)
    );
    
    if (searchWords.length > 0) {
      console.log(`🔍 Fallback extracted search term: "${searchWords[0]}"`);
      return searchWords[0];
    }
    
    return '';
  }

  private searchInArray(items: any[], searchTerm: string): any[] {
    if (!searchTerm) return items;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return items.filter(item => {
      if (typeof item === 'string') {
        return item.toLowerCase().includes(lowerSearchTerm);
      }
      
      if (typeof item === 'object') {
        // Search in title, body, content, name fields
        const searchableFields = ['title', 'body', 'content', 'name', 'text'];
        return searchableFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(lowerSearchTerm);
        });
      }
      
      return false;
    });
  }

  private formatToolOutput(content: string): string {
    try {
      // Try to parse as JSON and format nicely
      const parsed = JSON.parse(content);
      
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5).map((item, index) => {
          if (typeof item === 'object') {
            const title = item.title || item.name || `Item ${index + 1}`;
            const details = Object.entries(item)
              .filter(([key]) => key !== 'title' && key !== 'name')
              .slice(0, 3)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
            return `• **${title}**${details ? ` - ${details}` : ''}`;
          }
          return `• ${item}`;
        }).join('\n');
      } else if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .slice(0, 10)
          .map(([key, value]) => `• **${key}**: ${value}`)
          .join('\n');
      }
    } catch (e) {
      // Not JSON, return as-is with some formatting
    }
    
    // Format as plain text with line breaks
    return content
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 10)
      .map(line => `• ${line.trim()}`)
      .join('\n');
  }

  private async processWithLLMOnly(query: string, contextResult: any): Promise<string> {
    // Build context-aware prompt
    const systemPrompt = await this.buildSystemPrompt();
    const contextPrompt = this.buildContextPrompt(query, contextResult);
    
    // Call LLM
    const llmResponse = await this.callLLM(systemPrompt, contextPrompt);
    
    return this.cleanResponse(llmResponse);
  }

  private async buildSystemPrompt(): Promise<string> {
    try {
      // Get available MCP tools for system prompt
      const tools = await this.mcpClient.listTools();
      const resources = await this.mcpClient.listResources();
      
      const toolsDesc = tools.length > 0 
        ? tools.map(t => `• ${t.name}: ${t.description}`).join('\n')
        : 'No tools currently available';
        
      const resourcesDesc = resources.length > 0
        ? resources.map(r => `• ${r.name}: ${r.description}`).join('\n')
        : 'No resources currently available';
      
      return `You are an AI assistant with access to MCP (Model Context Protocol) tools and resources. 

Available MCP Tools:
${toolsDesc}

Available MCP Resources:
${resourcesDesc}

Guidelines:
- Provide helpful, accurate, and context-aware responses
- Be conversational and natural
- If the user asks for data that requires MCP tools, suggest using the appropriate tool
- Focus on being helpful rather than explaining internal processes
- Keep responses clean and user-focused

Remember: You should sound like a knowledgeable assistant, not a system describing its internal operations.`;
      
    } catch (error) {
      return `You are a helpful AI assistant. Provide clear, accurate, and conversational responses to user queries.`;
    }
  }

  private buildContextPrompt(query: string, contextResult: any): string {
    let prompt = `User Query: ${query}\n\n`;
    
    // Add relevant conversation context if available
    if (contextResult.relevantMessages.length > 0) {
      prompt += `Relevant Context from Conversation:\n`;
      prompt += contextResult.relevantMessages
        .slice(-3) // Last 3 relevant messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      prompt += '\n\n';
    }
    
    // Add user profile context if relevant
    if (contextResult.userContext.responseStyle && contextResult.userContext.responseStyle !== 'conversational') {
      prompt += `User prefers ${contextResult.userContext.responseStyle} responses.\n\n`;
    }
    
    prompt += `Please provide a helpful response to the user's query.`;
    
    return prompt;
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      
      switch (this.config.llmProvider) {
        case 'huggingface':
          return await this.callHuggingFaceAPI(messages);
        case 'openai':
          return await this.callOpenAIAPI(messages);
        case 'anthropic':
          return await this.callAnthropicAPI(messages);
        default:
          throw new Error(`Unsupported LLM provider: ${this.config.llmProvider}`);
      }
    } catch (error) {
      console.error('LLM API call failed:', error);
      return `I'm having trouble processing your request right now. ${this.config.enableChaining ? 'Please try again in a moment.' : 'The MCP server is available for direct tool calls if needed.'}`;
    }
  }

  private async callHuggingFaceAPI(messages: any[]): Promise<string> {
    const apiUrl = `https://api-inference.huggingface.co/models/${this.config.modelId}`;
    
    // Try chat completions first for newer models
    try {
      const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
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

    // Fallback to inference API
    const conversationText = messages.map(msg => 
      `${msg.role === 'user' ? 'User' : msg.role === 'system' ? 'System' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
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
      throw new Error(`Hugging Face API error: ${response.status}`);
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

  private async callOpenAIAPI(messages: any[]): Promise<string> {
    // Placeholder for OpenAI integration
    throw new Error('OpenAI integration not implemented yet');
  }

  private async callAnthropicAPI(messages: any[]): Promise<string> {
    // Placeholder for Anthropic integration  
    throw new Error('Anthropic integration not implemented yet');
  }

  private cleanResponse(response: string): string {
    // Remove any system artifacts, debug info, or raw LLM metadata
    let cleaned = response;
    
    // Remove system tags and metadata
    cleaned = cleaned.replace(/\[SYSTEM\].*?\[\/SYSTEM\]/gs, '');
    cleaned = cleaned.replace(/\[DEBUG\].*?\[\/DEBUG\]/gs, '');
    cleaned = cleaned.replace(/\[METADATA\].*?\[\/METADATA\]/gs, '');
    cleaned = cleaned.replace(/\[TOOL_CALL\].*?\[\/TOOL_CALL\]/gs, '');
    
    // Remove confidence scores and internal reasoning
    cleaned = cleaned.replace(/\(confidence: [\d.]+\)/g, '');
    cleaned = cleaned.replace(/\[reasoning:.*?\]/gs, '');
    cleaned = cleaned.replace(/Chain step \d+:/g, '');
    
    // Remove JSON artifacts that aren't user data
    cleaned = cleaned.replace(/^```json\s*\{[\s\S]*?\}\s*```$/gm, '');
    
    // Remove prompt artifacts
    cleaned = cleaned.replace(/^(System|User|Assistant):\s*/gm, '');
    cleaned = cleaned.replace(/LLM Response:/g, '');
    cleaned = cleaned.replace(/Processing.*?:/g, '');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/^\s+|\s+$/g, '');
    
    // Ensure response starts naturally
    if (cleaned.startsWith('I ') || cleaned.startsWith('Based on ') || cleaned.startsWith('The ')) {
      return cleaned;
    }
    
    return cleaned;
  }

  private createFallbackResponse(query: string, error: any): string {
    return `I encountered an issue processing your request: "${query}". ${error.message || 'Unknown error occurred'}. Please try rephrasing your question or check if the MCP server is properly configured.`;
  }

  private looksLikeRawData(response: string): boolean {
    // Check if response looks like raw MCP tool output that should be processed
    return (
      response.includes('**Result:**') ||
      response.includes('using the **') ||
      response.length > 500 ||
      /\{[\s\S]*\}/.test(response) // Contains JSON-like structure
    );
  }

  private async postProcessWithLLM(originalQuery: string, rawResponse: string): Promise<string> {
    try {
      const prompt = `The user asked: "${originalQuery}"

I got this raw response from the MCP tools:
${rawResponse}

Please provide a clean, natural response that directly answers the user's question. Focus on the key information and present it conversationally. If this was a search/count query, highlight the key findings clearly.`;

      const processedResponse = await this.callLLM(
        'You are a helpful assistant that provides clear, concise responses based on data retrieved from APIs.',
        prompt
      );
      
      return this.cleanResponse(processedResponse);
    } catch (error) {
      console.warn('LLM post-processing failed:', error);
      return rawResponse; // Fallback to raw response
    }
  }

  // Public utility methods
  async getSessionStats(): Promise<any> {
    const context = await this.contextStore.retrieveRelevantContext(this.sessionId, '', 10);
    return {
      totalMessages: context.relevantMessages.length,
      userProfile: context.userContext,
      lastUpdated: new Date()
    };
  }

  async updateUserPreferences(preferences: any): Promise<void> {
    // This would update the user profile in the context store
    console.log('Updating user preferences:', preferences);
  }

  async clearSession(): Promise<void> {
    // This would clear the session context
    console.log('Clearing session:', this.sessionId);
  }
}