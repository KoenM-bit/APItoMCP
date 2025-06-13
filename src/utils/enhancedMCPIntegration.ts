/**
 * Enhanced MCP Integration - Complete Fixed Version
 * This file should completely replace your existing enhancedMCPIntegration.ts
 */

import { MCPClientSession } from './mcpClient';

// Simplified interfaces - no complex dependencies
export interface EnhancedMCPConfig {
  llmProvider?: 'huggingface' | 'openai' | 'anthropic';
  apiKey?: string;
  modelId?: string;
  maxResponseTime?: number;
}

export interface ProcessingResult {
  response: string;
  confidence: number;
  processingTime: number;
  toolsUsed: string[];
  metadata: ProcessingMetadata;
}

export interface ProcessingMetadata {
  mcpToolsCalled: string[];
  reasoningSteps: string[];
  sourcesUsed: string[];
  userPersonalization: boolean;
  queryType: 'new_request' | 'clarification' | 'follow_up';
}

// Simple conversation history interface
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class EnhancedMCPIntegration {
  private mcpClient: MCPClientSession;
  private config: EnhancedMCPConfig;
  private sessionId: string;
  private lastToolResult: any = null;
  private lastQuery: string = '';
  private conversationHistory: ConversationMessage[] = [];

  constructor(
    mcpClient: MCPClientSession,
    config: EnhancedMCPConfig = {},
    sessionId: string = 'default'
  ) {
    this.mcpClient = mcpClient;
    this.config = {
      maxResponseTime: 30000,
      ...config
    };
    this.sessionId = sessionId;

    console.log('✅ Enhanced MCP Integration initialized successfully');
  }

  /**
   * Main entry point - simplified and reliable
   */
  async processQuery(
    userMessage: string,
    conversationHistory: any[] = []
  ): Promise<string> {
    const startTime = Date.now();

    try {
      console.log('🔍 Processing query:', userMessage);

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Analyze query intent
      const queryAnalysis = this.analyzeQueryIntent(userMessage);
      console.log('🎯 Query analysis:', queryAnalysis);

      let response: string;

      // Route based on intent
      switch (queryAnalysis.type) {
        case 'new_mcp_request':
          response = await this.handleNewMCPRequest(userMessage, queryAnalysis);
          break;

        case 'clarification_about_last_result':
          response = await this.handleClarificationRequest(userMessage, queryAnalysis);
          break;

        case 'general_conversation':
          response = await this.handleGeneralConversation(userMessage);
          break;

        default:
          response = await this.handleNewMCPRequest(userMessage, queryAnalysis);
      }

      // Add response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      // Keep history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      console.log('✅ Query processed successfully');
      return response;

    } catch (error) {
      console.error('❌ Enhanced MCP processing failed:', error);
      return this.createFallbackResponse(userMessage, error);
    }
  }

  /**
   * Analyze query intent without complex dependencies
   */
  private analyzeQueryIntent(query: string): {
    type: 'new_mcp_request' | 'clarification_about_last_result' | 'general_conversation';
    confidence: number;
    mcpIndicators: string[];
    clarificationIndicators: string[];
    extractedParameters: Record<string, any>;
  } {
    const lowerQuery = query.toLowerCase().trim();

    // MCP request indicators
    const mcpIndicators = [
      'get', 'fetch', 'retrieve', 'show me', 'find', 'list',
      'create', 'post', 'add', 'update', 'modify', 'delete',
      'call', 'api', 'tool', 'use the', 'try the'
    ];

    // Clarification indicators
    const clarificationIndicators = [
      'what about', 'tell me more', 'explain', 'clarify',
      'more details', 'elaborate', 'expand on', 'about that',
      'summary', 'summarize', 'overview'
    ];

    const mcpMatches = mcpIndicators.filter(indicator => lowerQuery.includes(indicator));
    const clarificationMatches = clarificationIndicators.filter(indicator => lowerQuery.includes(indicator));

    const extractedParameters = this.extractParameters(query);

    // Simple decision logic
    let type: 'new_mcp_request' | 'clarification_about_last_result' | 'general_conversation';
    let confidence = 0;

    if (this.hasSpecificToolReference(query) || mcpMatches.length >= 2) {
      type = 'new_mcp_request';
      confidence = 0.9;
    } else if (clarificationMatches.length > 0 && this.lastToolResult) {
      type = 'clarification_about_last_result';
      confidence = 0.8;
    } else if (mcpMatches.length > 0 || Object.keys(extractedParameters).length > 0) {
      type = 'new_mcp_request';
      confidence = 0.7;
    } else {
      type = 'general_conversation';
      confidence = 0.6;
    }

    return {
      type,
      confidence,
      mcpIndicators: mcpMatches,
      clarificationIndicators: clarificationMatches,
      extractedParameters
    };
  }

  private hasSpecificToolReference(query: string): boolean {
    const toolPatterns = [
      /get_\w+/,
      /create_\w+/,
      /update_\w+/,
      /delete_\w+/,
      /list_\w+/,
      /post\s+\d+/,
      /user\s+\d+/,
      /id\s*:?\s*\d+/
    ];

    return toolPatterns.some(pattern => pattern.test(query.toLowerCase()));
  }

  private extractParameters(query: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract IDs
    const idMatch = query.match(/\b(?:id|ID)\s*:?\s*(\d+)/);
    if (idMatch) {
      params.id = parseInt(idMatch[1]);
    }

    // Extract post numbers
    const postMatch = query.match(/\bpost\s+(\d+)/i);
    if (postMatch) {
      params.postId = parseInt(postMatch[1]);
    }

    // Extract user IDs
    const userMatch = query.match(/\buser\s+(?:id\s+)?(\d+)/i);
    if (userMatch) {
      params.userId = parseInt(userMatch[1]);
    }

    // Extract quoted strings
    const quotedMatch = query.match(/"([^"]+)"/);
    if (quotedMatch) {
      params.searchTerm = quotedMatch[1];
    }

    return params;
  }

  /**
   * Handle new MCP requests
   */
  private async handleNewMCPRequest(query: string, analysis: any): Promise<string> {
    try {
      // Clear previous result for new requests
      this.lastToolResult = null;
      this.lastQuery = query;

      // Get available tools
      const tools = await this.mcpClient.listTools();
      console.log('🔧 Available tools:', tools.length);

      if (tools.length === 0) {
        return "I'm connected to the MCP server, but no tools are currently available. The server might still be initializing.";
      }

      // Select best tool
      const selectedTool = this.selectBestTool(query, tools, analysis.extractedParameters);

      if (!selectedTool) {
        const toolsList = tools.map(t => `• **${t.name}**: ${t.description || 'No description'}`).join('\n');
        return `I couldn't determine which tool to use for your request. Here are the available tools:\n\n${toolsList}\n\nPlease be more specific about which tool you'd like me to use.`;
      }

      // Prepare arguments
      const toolArgs = this.prepareToolArguments(query, selectedTool, analysis.extractedParameters);

      console.log(`🔧 Using tool: ${selectedTool.name} with args:`, toolArgs);

      // Call the tool
      const toolResult = await this.mcpClient.callTool(selectedTool.name, toolArgs);

      // Store result for potential follow-up questions
      this.lastToolResult = {
        tool: selectedTool,
        args: toolArgs,
        result: toolResult,
        timestamp: Date.now()
      };

      // Format the response
      return this.formatToolResponse(query, selectedTool, toolResult, analysis);

    } catch (error) {
      console.error('❌ MCP tool execution failed:', error);
      return `I encountered an error while executing the tool: ${error.message}. Please try rephrasing your request.`;
    }
  }

  private selectBestTool(query: string, tools: any[], extractedParams: Record<string, any>): any | null {
    const lowerQuery = query.toLowerCase();

    console.log('🎯 Tool selection for:', query);
    console.log('🎯 Extracted params:', extractedParams);

    // Direct tool name matching
    for (const tool of tools) {
      if (lowerQuery.includes(tool.name.toLowerCase().replace(/_/g, ' '))) {
        console.log(`🎯 Direct tool name match: ${tool.name}`);
        return tool;
      }
    }

    // Parameter-based selection
    if (extractedParams.postId || extractedParams.id) {
      const getPostTool = tools.find(t =>
        t.name.includes('get') &&
        t.name.includes('post') &&
        !t.name.includes('all') &&
        !t.name.includes('comment')
      );
      if (getPostTool) {
        console.log(`🎯 Post ID detected, using: ${getPostTool.name}`);
        return getPostTool;
      }
    }

    if (extractedParams.userId) {
      const getUserTool = tools.find(t =>
        t.name.includes('get') &&
        t.name.includes('user') &&
        !t.name.includes('all')
      );
      if (getUserTool) {
        console.log(`🎯 User ID detected, using: ${getUserTool.name}`);
        return getUserTool;
      }
    }

    // Action-based selection
    const scoredTools = tools.map(tool => {
      let score = 0;
      const toolName = tool.name.toLowerCase();

      if (lowerQuery.includes('get') && toolName.includes('get')) score += 5;
      if (lowerQuery.includes('create') && toolName.includes('create')) score += 5;
      if (lowerQuery.includes('update') && toolName.includes('update')) score += 5;
      if (lowerQuery.includes('delete') && toolName.includes('delete')) score += 5;
      if (lowerQuery.includes('list') && toolName.includes('get') && toolName.includes('all')) score += 5;

      if (lowerQuery.includes('post') && toolName.includes('post')) score += 3;
      if (lowerQuery.includes('user') && toolName.includes('user')) score += 3;
      if (lowerQuery.includes('comment') && toolName.includes('comment')) score += 3;

      return { tool, score };
    });

    const bestTool = scoredTools.sort((a, b) => b.score - a.score)[0];

    if (bestTool && bestTool.score > 3) {
      console.log(`🎯 Selected tool: ${bestTool.tool.name} (${bestTool.score} points)`);
      return bestTool.tool;
    }

    return null;
  }

  private prepareToolArguments(query: string, tool: any, extractedParams: Record<string, any>): any {
    const args: any = {};

    // Use extracted parameters
    if (extractedParams.postId) {
      args.id = extractedParams.postId;
    } else if (extractedParams.id) {
      args.id = extractedParams.id;
    }

    if (extractedParams.userId) {
      args.userId = extractedParams.userId;
    }

    if (extractedParams.searchTerm) {
      args.q = extractedParams.searchTerm;
    }

    // Tool-specific defaults
    if (tool.name.includes('create') && tool.name.includes('post')) {
      args.title = args.title || 'New Post';
      args.body = args.body || 'Created via MCP Integration';
      args.userId = args.userId || 1;
    }

    // Add limits for list operations
    if (tool.name.includes('get') && tool.name.includes('all') && !extractedParams.searchTerm) {
      const limitMatch = query.match(/(\d+)/);
      if (limitMatch) {
        args._limit = limitMatch[1];
      }
    }

    return args;
  }

  /**
   * Handle clarification requests
   */
  private async handleClarificationRequest(query: string, analysis: any): Promise<string> {
    if (!this.lastToolResult) {
      return "I don't have any recent tool results to clarify. Please make a new request.";
    }

    const timeSinceLastTool = Date.now() - this.lastToolResult.timestamp;
    if (timeSinceLastTool > 300000) { // 5 minutes
      return "The previous tool result is too old. Please make a new request.";
    }

    const resultContent = this.extractToolResultContent(this.lastToolResult.result);

    if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
      return this.createResultSummary(resultContent, this.lastToolResult.tool.name);
    }

    return `Based on the previous result from **${this.lastToolResult.tool.name}**, here's what I can tell you:\n\n${this.formatToolOutputConcise(resultContent)}\n\nWhat specific aspect would you like me to explain further?`;
  }

  /**
   * Handle general conversation
   */
  private async handleGeneralConversation(query: string): Promise<string> {
    if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
      return "Hello! I'm here to help you interact with MCP tools and answer your questions. What can I help you with today?";
    }

    if (query.toLowerCase().includes('help')) {
      return await this.getHelpResponse();
    }

    return "I'm designed to help you interact with MCP tools and services. If you need to fetch data, create content, or perform other operations, just let me know what you'd like to do!";
  }

  /**
   * Format tool responses
   */
  private formatToolResponse(query: string, tool: any, result: any, analysis: any): string {
    const resultContent = this.extractToolResultContent(result);

    // For specific item requests
    if (analysis.extractedParameters.postId || analysis.extractedParameters.id) {
      return this.formatSpecificItemResponse(resultContent, tool.name, analysis.extractedParameters);
    }

    // For list requests
    if (tool.name.includes('all') || tool.name.includes('list')) {
      return this.formatListResponse(resultContent, tool.name, query);
    }

    // Default formatting
    return `Here's the result from **${tool.name}**:\n\n${this.formatToolOutputConcise(resultContent)}`;
  }

  private formatSpecificItemResponse(content: string, toolName: string, params: Record<string, any>): string {
    try {
      const data = JSON.parse(content);

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const itemId = params.postId || params.id || data.id;
        const title = data.title || data.name || `Item ${itemId}`;

        let response = `Here's the information for **${title}**`;
        if (itemId) response += ` (ID: ${itemId})`;
        response += ':\n\n';

        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'id' && value && String(value).length > 0) {
            const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
            response += `**${displayKey}:** ${value}\n`;
          }
        });

        return response.trim();
      }
    } catch (e) {
      // Not JSON, return as-is
    }

    return `Here's the result:\n\n${content}`;
  }

  private formatListResponse(content: string, toolName: string, originalQuery: string): string {
    try {
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        const count = data.length;
        let response = `Found **${count} items** using ${toolName}:\n\n`;

        const preview = data.slice(0, 5).map((item, index) => {
          if (typeof item === 'object') {
            const title = item.title || item.name || `Item ${index + 1}`;
            const id = item.id ? ` (ID: ${item.id})` : '';
            return `${index + 1}. **${title}**${id}`;
          }
          return `${index + 1}. ${item}`;
        }).join('\n');

        response += preview;

        if (count > 5) {
          response += `\n\n...and ${count - 5} more items.`;
        }

        response += '\n\nWould you like me to show you details about any specific item?';

        return response;
      }
    } catch (e) {
      // Not JSON array
    }

    return `Here are the results:\n\n${this.formatToolOutputConcise(content)}`;
  }

  private extractToolResultContent(result: any): string {
    if (result?.content?.[0]?.text) {
      return result.content[0].text;
    } else if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    } else {
      return String(result);
    }
  }

  private formatToolOutputConcise(content: string): string {
    try {
      const parsed = JSON.parse(content);

      if (Array.isArray(parsed)) {
        if (parsed.length <= 3) {
          return JSON.stringify(parsed, null, 2);
        } else {
          return `Array with ${parsed.length} items. First few:\n${JSON.stringify(parsed.slice(0, 3), null, 2)}\n...and ${parsed.length - 3} more.`;
        }
      } else if (typeof parsed === 'object') {
        return JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Not JSON
    }

    if (content.length > 1000) {
      return content.substring(0, 1000) + '...\n\n*(Content truncated for readability)*';
    }

    return content;
  }

  private createResultSummary(content: string, toolName: string): string {
    try {
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        return `**Summary from ${toolName}:**\n\n• Total items: ${data.length}\n• Data type: Array of objects\n• Sample item: ${data[0] ? JSON.stringify(data[0], null, 2) : 'None'}`;
      } else if (typeof data === 'object') {
        const fields = Object.keys(data);
        return `**Summary from ${toolName}:**\n\n• Fields: ${fields.join(', ')}\n• Data type: Single object\n• Key information: ${JSON.stringify(data, null, 2)}`;
      }
    } catch (e) {
      // Not JSON
    }

    return `**Summary from ${toolName}:**\n\n• Content length: ${content.length} characters\n• Data type: Text\n• Preview: ${content.substring(0, 200)}...`;
  }

  private async getHelpResponse(): Promise<string> {
    try {
      const tools = await this.mcpClient.listTools();
      const toolsList = tools.map(t => `• **${t.name}**: ${t.description || 'No description'}`).join('\n');

      return `I can help you interact with these MCP tools:\n\n${toolsList}\n\nJust tell me what you'd like to do in natural language. For example:\n• "Get post 76"\n• "Show me all users"\n• "Create a new post"`;
    } catch (error) {
      return "I'm here to help you interact with MCP tools and answer questions. What would you like to do?";
    }
  }

  private createFallbackResponse(query: string, error: any): string {
    return `I encountered an issue processing your request: "${query}". ${error.message || 'Unknown error occurred'}. Please try rephrasing your question.`;
  }
}