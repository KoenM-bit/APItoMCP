/**
 * Advanced Context Store for MCP Systems
 * Handles conversation state, context compression, and relevance scoring
 */

export interface ConversationContext {
  id: string;
  messages: ContextMessage[];
  userProfile: UserProfile;
  sessionState: SessionState;
  domainKnowledge: DomainKnowledge[];
  lastUpdated: Date;
}

export interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: MessageMetadata;
  relevanceScore?: number;
  compressed?: boolean;
}

export interface MessageMetadata {
  mcpCalls?: MCPCall[];
  toolsUsed?: string[];
  resources?: string[];
  contextReferences?: string[];
  synthesizedFrom?: string[];
  confidence?: number;
}

export interface MCPCall {
  toolName: string;
  parameters: any;
  result: any;
  success: boolean;
  timestamp: Date;
  processingTime: number;
}

export interface UserProfile {
  preferences: Record<string, any>;
  expertise: string[];
  commonQueries: string[];
  responseStyle: 'concise' | 'detailed' | 'technical' | 'conversational';
}

export interface SessionState {
  currentTopic: string;
  activeTools: string[];
  contextWindow: number;
  compressionLevel: number;
  chainDepth: number;
}

export interface DomainKnowledge {
  domain: string;
  concepts: Record<string, any>;
  relationships: Array<{from: string; to: string; type: string}>;
  lastAccessed: Date;
}

export interface ContextRetrievalResult {
  relevantMessages: ContextMessage[];
  domainContext: DomainKnowledge[];
  userContext: UserProfile;
  totalRelevanceScore: number;
}

export class ContextStore {
  private conversations: Map<string, ConversationContext> = new Map();
  private compressionThreshold = 2000; // characters
  private maxContextWindow = 10; // messages
  private relevanceDecayFactor = 0.9;

  constructor() {
    this.initializeStore();
  }

  private initializeStore(): void {
    // Load persisted context if available
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('mcp_context_store');
        if (stored) {
          const data = JSON.parse(stored);
          data.forEach((context: ConversationContext) => {
            this.conversations.set(context.id, context);
          });
        }
      } catch (error) {
        console.warn('Failed to load context store:', error);
      }
    }
  }

  async createContext(sessionId: string, initialProfile?: Partial<UserProfile>): Promise<ConversationContext> {
    const context: ConversationContext = {
      id: sessionId,
      messages: [],
      userProfile: {
        preferences: {},
        expertise: [],
        commonQueries: [],
        responseStyle: 'conversational',
        ...initialProfile
      },
      sessionState: {
        currentTopic: '',
        activeTools: [],
        contextWindow: this.maxContextWindow,
        compressionLevel: 0,
        chainDepth: 0
      },
      domainKnowledge: [],
      lastUpdated: new Date()
    };

    this.conversations.set(sessionId, context);
    await this.persistStore();
    return context;
  }

  async addMessage(
    sessionId: string, 
    message: Omit<ContextMessage, 'id' | 'relevanceScore'>
  ): Promise<void> {
    const context = this.conversations.get(sessionId);
    if (!context) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const contextMessage: ContextMessage = {
      ...message,
      id: this.generateId(),
      relevanceScore: 1.0
    };

    context.messages.push(contextMessage);
    context.lastUpdated = new Date();

    // Update session state based on message
    await this.updateSessionState(context, contextMessage);

    // Trigger compression if needed
    if (context.messages.length > this.maxContextWindow) {
      await this.compressContext(context);
    }

    await this.persistStore();
  }

  async retrieveRelevantContext(
    sessionId: string, 
    query: string, 
    maxMessages: number = 5
  ): Promise<ContextRetrievalResult> {
    const context = this.conversations.get(sessionId);
    if (!context) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Score messages for relevance
    const scoredMessages = await this.scoreMessageRelevance(context.messages, query);
    
    // Get most relevant messages
    const relevantMessages = scoredMessages
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, maxMessages);

    // Get relevant domain knowledge
    const domainContext = this.getRelevantDomainKnowledge(context.domainKnowledge, query);

    const totalScore = relevantMessages.reduce((sum, msg) => sum + (msg.relevanceScore || 0), 0);

    return {
      relevantMessages,
      domainContext,
      userContext: context.userProfile,
      totalRelevanceScore: totalScore
    };
  }

  private async scoreMessageRelevance(messages: ContextMessage[], query: string): Promise<ContextMessage[]> {
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    return messages.map((message, index) => {
      let score = 0;
      const content = message.content.toLowerCase();
      
      // Term matching
      queryTerms.forEach(term => {
        if (content.includes(term)) {
          score += 0.3;
        }
      });
      
      // Recency boost
      const position = messages.length - index;
      score += (position / messages.length) * 0.4;
      
      // Role importance
      if (message.role === 'user') score += 0.2;
      if (message.role === 'assistant') score += 0.1;
      
      // MCP tool usage boost
      if (message.metadata.mcpCalls && message.metadata.mcpCalls.length > 0) {
        score += 0.3;
      }
      
      // Apply decay for older messages
      const ageHours = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60);
      score *= Math.pow(this.relevanceDecayFactor, ageHours / 24);
      
      return {
        ...message,
        relevanceScore: score
      };
    });
  }

  private async updateSessionState(context: ConversationContext, message: ContextMessage): Promise<void> {
    // Extract topics from message
    if (message.role === 'user') {
      context.sessionState.currentTopic = this.extractTopic(message.content);
    }
    
    // Track active tools
    if (message.metadata.toolsUsed) {
      context.sessionState.activeTools = [
        ...new Set([...context.sessionState.activeTools, ...message.metadata.toolsUsed])
      ].slice(-5); // Keep last 5 tools
    }
    
    // Update user profile based on patterns
    if (message.role === 'user') {
      this.updateUserProfile(context.userProfile, message);
    }
  }

  private extractTopic(content: string): string {
    // Simple topic extraction - could be enhanced with NLP
    const words = content.toLowerCase().split(/\s+/);
    const topicWords = words.filter(word => 
      word.length > 4 && 
      !['what', 'how', 'when', 'where', 'which', 'could'].includes(word)
    );
    return topicWords.slice(0, 3).join(' ');
  }

  private updateUserProfile(profile: UserProfile, message: ContextMessage): void {
    // Track common query patterns
    const query = message.content.toLowerCase();
    if (query.includes('how to')) {
      profile.commonQueries.push('how_to');
    }
    if (query.includes('what is')) {
      profile.commonQueries.push('definition');
    }
    
    // Keep unique queries only
    profile.commonQueries = [...new Set(profile.commonQueries)].slice(-10);
  }

  private async compressContext(context: ConversationContext): Promise<void> {
    const oldMessages = context.messages.slice(0, -this.maxContextWindow);
    const recentMessages = context.messages.slice(-this.maxContextWindow);
    
    // Compress older messages
    const compressedSummary = await this.createContextSummary(oldMessages);
    
    // Replace old messages with summary
    const summaryMessage: ContextMessage = {
      id: this.generateId(),
      role: 'system',
      content: compressedSummary,
      timestamp: new Date(),
      metadata: {
        synthesizedFrom: oldMessages.map(m => m.id)
      },
      compressed: true,
      relevanceScore: 0.5
    };
    
    context.messages = [summaryMessage, ...recentMessages];
    context.sessionState.compressionLevel++;
  }

  private async createContextSummary(messages: ContextMessage[]): Promise<string> {
    // Extract key information from messages
    const topics = new Set<string>();
    const toolsUsed = new Set<string>();
    const keyPoints: string[] = [];
    
    messages.forEach(message => {
      if (message.role === 'user') {
        const topic = this.extractTopic(message.content);
        if (topic) topics.add(topic);
        
        if (message.content.length > 100) {
          keyPoints.push(message.content.substring(0, 100) + '...');
        }
      }
      
      if (message.metadata.toolsUsed) {
        message.metadata.toolsUsed.forEach(tool => toolsUsed.add(tool));
      }
    });
    
    return `Previous conversation summary:
Topics discussed: ${Array.from(topics).join(', ')}
Tools used: ${Array.from(toolsUsed).join(', ')}
Key user queries: ${keyPoints.slice(0, 3).join('; ')}
Message count: ${messages.length}`;
  }

  private getRelevantDomainKnowledge(knowledge: DomainKnowledge[], query: string): DomainKnowledge[] {
    const queryLower = query.toLowerCase();
    
    return knowledge.filter(domain => {
      const domainMatch = queryLower.includes(domain.domain.toLowerCase());
      const conceptMatch = Object.keys(domain.concepts).some(concept =>
        queryLower.includes(concept.toLowerCase())
      );
      return domainMatch || conceptMatch;
    });
  }

  async updateDomainKnowledge(sessionId: string, domain: string, knowledge: Record<string, any>): Promise<void> {
    const context = this.conversations.get(sessionId);
    if (!context) return;
    
    const existingDomain = context.domainKnowledge.find(d => d.domain === domain);
    
    if (existingDomain) {
      existingDomain.concepts = { ...existingDomain.concepts, ...knowledge };
      existingDomain.lastAccessed = new Date();
    } else {
      context.domainKnowledge.push({
        domain,
        concepts: knowledge,
        relationships: [],
        lastAccessed: new Date()
      });
    }
    
    await this.persistStore();
  }

  private async persistStore(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = Array.from(this.conversations.values());
        localStorage.setItem('mcp_context_store', JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to persist context store:', error);
      }
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Context inheritance for chained prompts
  async createChainContext(parentSessionId: string, chainId: string): Promise<ConversationContext> {
    const parentContext = this.conversations.get(parentSessionId);
    if (!parentContext) {
      throw new Error(`Parent session ${parentSessionId} not found`);
    }

    // Inherit relevant context
    const chainContext: ConversationContext = {
      id: chainId,
      messages: [], // Start fresh but inherit context through retrieval
      userProfile: { ...parentContext.userProfile },
      sessionState: {
        ...parentContext.sessionState,
        chainDepth: parentContext.sessionState.chainDepth + 1
      },
      domainKnowledge: [...parentContext.domainKnowledge],
      lastUpdated: new Date()
    };

    this.conversations.set(chainId, chainContext);
    await this.persistStore();
    return chainContext;
  }

  // Cleanup old contexts
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [id, context] of this.conversations) {
      if (context.lastUpdated < cutoff) {
        this.conversations.delete(id);
      }
    }
    
    await this.persistStore();
  }
}