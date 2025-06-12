import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Settings, 
  Zap,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Cpu,
  Database,
  RefreshCw,
  Key,
  ExternalLink,
  Brain,
  Activity,
  Link,
  Search,
  List
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { WebContainerMCPClient, createMCPClient } from '../../utils/mcpClient';
import { EnhancedMCPIntegration, EnhancedMCPConfig } from '../../utils/enhancedMCPIntegration';

interface LLMChatInterfaceProps {
  mcpServerUrl: string;
  serverStatus: string;
  tools: any[];
  resources: any[];
  onMCPCall: (method: string, params: any) => Promise<any>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mcpCalls?: any[];
  error?: string;
  thinking?: boolean;
}

export const LLMChatInterface: React.FC<LLMChatInterfaceProps> = ({
  mcpServerUrl,
  serverStatus,
  tools,
  resources,
  onMCPCall
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: '🤖 I\'m a production MCP client that dynamically discovers tools from your generated server! I can use real MCP tools through the Model Context Protocol. Ask me anything!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hfApiKey, setHfApiKey] = useState(localStorage.getItem('hf_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [mcpClient, setMcpClient] = useState<any | null>(null);
  const [mcpConnectionStatus, setMcpConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [selectedModel, setSelectedModel] = useState('meta-llama/Llama-3.3-70B-Instruct');
  const [llmStatus, setLlmStatus] = useState<'idle' | 'thinking' | 'calling_tools' | 'error'>('idle');
  const [enhancedIntegration, setEnhancedIntegration] = useState<EnhancedMCPIntegration | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<any[]>([]);
  const [discoveredResources, setDiscoveredResources] = useState<any[]>([]);
  const [sessionId] = useState(`session_${Date.now()}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mcpClientRef = useRef<any | null>(null);

  // Available Hugging Face models for chat
  const availableModels = [
    {
      id: 'meta-llama/Llama-3.3-70B-Instruct',
      name: 'Llama 3.3 70B Instruct',
      description: 'Latest Llama model - excellent for function calling',
      type: 'chat'
    },
    {
      id: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
      name: 'Llama 3.2 11B Instruct',
      description: 'Smaller, faster Llama model',
      type: 'chat'
    },
    {
      id: 'mistralai/Mistral-7B-Instruct-v0.3',
      name: 'Mistral 7B Instruct',
      description: 'Fast and capable instruction-following model',
      type: 'chat'
    },
    {
      id: 'HuggingFaceH4/zephyr-7b-beta',
      name: 'Zephyr 7B Beta',
      description: 'Fine-tuned for helpful conversations',
      type: 'chat'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup function for MCP client
  const cleanupMCPClient = useCallback(async () => {
    if (mcpClientRef.current) {
      try {
        console.log('🧹 Cleaning up MCP client...');
        await mcpClientRef.current.close();
        // Wait a bit longer to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
      mcpClientRef.current = null;
      setMcpClient(null);
      setEnhancedIntegration(null);
    }
    setMcpConnectionStatus('disconnected');
    setDiscoveredTools([]);
    setDiscoveredResources([]);
  }, []);

  // Enhanced initializeMCPClient with simplified status updates
  const initializeMCPClient = useCallback(async (forceReconnect = false) => {
    // Don't create multiple clients unless forced
    if (mcpClientRef.current && !forceReconnect) {
      console.log('MCP client already exists, skipping initialization');
      return;
    }

    // Clean up any existing client first
    await cleanupMCPClient();

    try {
      // Show connecting status (only in header)
      setMcpConnectionStatus('connecting');

      // Get the WebContainer and server process from the parent component
      const webContainer = (window as any).webContainerInstance;
      const serverProcess = (window as any).mcpServerProcess;
      const webContainerManager = (window as any).webContainerManagerInstance;

      if (!webContainer || !serverProcess) {
        throw new Error('WebContainer or MCP server process not available');
      }

      if (!webContainerManager) {
        console.warn('⚠️ WebContainerManager not found - make sure it is exposed globally');
        throw new Error('WebContainerManager not available');
      }

      console.log('🔌 Creating new MCP client...');
      const client = createMCPClient(webContainer, serverProcess);

      // Store reference before initializing
      mcpClientRef.current = client;
      setMcpClient(client);

      // Initialize the client with retry logic
      let initSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Initializing MCP client (attempt ${attempt}/3)...`);
          await client.initialize();
          initSuccess = true;
          break;
        } catch (initError) {
          console.warn(`❌ MCP initialization attempt ${attempt} failed:`, initError.message);
          if (attempt === 3) throw initError;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between attempts
        }
      }

      if (!initSuccess) {
        throw new Error('Failed to initialize MCP client after 3 attempts');
      }

      // Update to connected status
      setMcpConnectionStatus('connected');

      // Discover tools and resources with sequential calls to avoid ID conflicts
      console.log('🔍 Discovering tools and resources from MCP server...');

      // Call tools/list first, then resources/list with a delay
      const discoveredToolsList = await client.listTools();
      console.log('🔧 Discovered tools:', discoveredToolsList);

      // Small delay to avoid request ID conflicts
      await new Promise(resolve => setTimeout(resolve, 1000));

      const discoveredResourcesList = await client.listResources();
      console.log('📊 Discovered resources:', discoveredResourcesList);

      setDiscoveredTools(discoveredToolsList);
      setDiscoveredResources(discoveredResourcesList);

      // Initialize Enhanced MCP integration if API key is available
      if (hfApiKey) {
        const config: EnhancedMCPConfig = {
          llmProvider: 'huggingface',
          apiKey: hfApiKey,
          modelId: selectedModel,
          enableChaining: true,
          enableContextManagement: true,
          maxResponseTime: 60000
        };
        const integration = new EnhancedMCPIntegration(client, config, sessionId);
        setEnhancedIntegration(integration);
      }

      console.log('✅ MCP Client initialized successfully');

      // Add a single success message to chat
      const toolsList = discoveredToolsList.map(t => t.name).join(', ');
      const resourcesList = discoveredResourcesList.map(r => r.name).join(', ');

      const connectionMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `🔗 Successfully connected to MCP server!\n\n🔧 **Discovered ${discoveredToolsList.length} Tools:**\n${toolsList || 'None'}\n\n📊 **Discovered ${discoveredResourcesList.length} Resources:**\n${resourcesList || 'None'}\n\nI can now use these real MCP tools and resources dynamically!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, connectionMessage]);

    } catch (error) {
      console.error('❌ Failed to initialize MCP client:', error);
      setMcpConnectionStatus('error');

      // Clean up on error
      await cleanupMCPClient();

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `❌ Failed to connect to MCP server: ${error.message}\n\n💡 Try using the "Force Reconnect" button if the issue persists.`,
        timestamp: new Date(),
        error: error.message
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [hfApiKey, selectedModel, cleanupMCPClient]);

  // Effect for server status changes with automatic connection
  useEffect(() => {
    if (serverStatus === 'running') {
      // Show connecting status immediately (only in header)
      setMcpConnectionStatus('connecting');

      // Add a longer delay to ensure server is fully ready
      const timer = setTimeout(() => {
        initializeMCPClient();
      }, 3000); // Increased delay for dynamic parsing

      return () => clearTimeout(timer);
    } else {
      cleanupMCPClient();
    }
  }, [serverStatus]);

  // Effect for API key and model changes
  useEffect(() => {
    if (hfApiKey) {
      localStorage.setItem('hf_api_key', hfApiKey);
      // Reinitialize Enhanced integration if MCP client exists
      if (mcpClient) {
        const config: EnhancedMCPConfig = {
          llmProvider: 'huggingface',
          apiKey: hfApiKey,
          modelId: selectedModel,
          enableChaining: true,
          enableContextManagement: true,
          maxResponseTime: 60000
        };
        setEnhancedIntegration(new EnhancedMCPIntegration(mcpClient, config, sessionId));
      }
    }
  }, [hfApiKey, selectedModel, mcpClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMCPClient();
    };
  }, [cleanupMCPClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Enhanced test connection with visual feedback
  const testMCPConnection = async () => {
    if (!mcpClient) {
      // If no client exists, do a full reconnect with visual feedback
      const reconnectMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: '🔄 No existing connection found. Attempting to connect...',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, reconnectMessage]);

      await initializeMCPClient(true); // Force reconnect
      return;
    }

    try {
      setMcpConnectionStatus('connecting');

      // Add test message
      const testMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: '🧪 Testing MCP connection...',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, testMessage]);

      const [tools, resources] = await Promise.all([
        mcpClient.listTools(),
        mcpClient.listResources()
      ]);

      setDiscoveredTools(tools);
      setDiscoveredResources(resources);
      setMcpConnectionStatus('connected');

      const toolsList = tools.map((t: any) => t.name).join(', ');
      const resourcesList = resources.map((r: any) => r.name).join(', ');

      // Update test message with results
      setMessages(prev => prev.map(msg =>
        msg.id === testMessage.id
          ? {
              ...msg,
              content: `✅ MCP Connection Test Successful!\n\n🔧 **Available Tools (${tools.length}):**\n${toolsList || 'None'}\n\n📊 **Available Resources (${resources.length}):**\n${resourcesList || 'None'}`
            }
          : msg
      ));

    } catch (error) {
      console.error('MCP connection test failed:', error);
      setMcpConnectionStatus('error');

      setMessages(prev => prev.map(msg =>
        msg.content.includes('🧪 Testing MCP connection')
          ? {
              ...msg,
              content: `❌ MCP Connection Test Failed: ${error.message}`,
              error: error.message
            }
          : msg
      ));
    }
  };

  const forceReconnect = async () => {
    const reconnectMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: '🔄 Force reconnecting to MCP server and rediscovering tools...',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, reconnectMessage]);

    await initializeMCPClient(true); // Force reconnect
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setLlmStatus('thinking');

    try {
      let response: string;

      if (enhancedIntegration && hfApiKey) {
        // Use enhanced MCP integration with context-aware chained prompting
        setLlmStatus('thinking');

        // Get conversation history (excluding system messages)
        const conversationHistory = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({ role: msg.role, content: msg.content }));

        response = await enhancedIntegration.processQuery(inputMessage, conversationHistory);

      } else if (mcpClient) {
        // Use MCP client with simulated responses but real tool discovery
        response = await simulateIntelligentMCPResponse(inputMessage);
      } else {
        // Fallback to basic simulation
        response = await simulateBasicResponse(inputMessage);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      setLlmStatus('error');

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${error.message}\n\n${!hfApiKey ? '💡 Try configuring a Hugging Face API key in settings for enhanced AI responses.' : ''}`,
        timestamp: new Date(),
        error: error.message
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLlmStatus('idle');
    }
  };

  const simulateIntelligentMCPResponse = async (userMessage: string): Promise<string> => {
    if (!mcpClient) {
      throw new Error('MCP client not available');
    }

    const message = userMessage.toLowerCase();

    try {
      // Get the actual tools from the server
      const availableTools = await mcpClient.listTools();
      console.log('🔧 Available tools for simulation:', availableTools);

      if (availableTools.length === 0) {
        return `The MCP server is connected but no tools were discovered. This might mean:\n\n1. The server hasn't fully initialized yet\n2. The generated server doesn't expose any tools\n3. There's an issue with tool discovery\n\nTry asking me to "list available tools" or reconnect to the server.`;
      }

      // Try to match user intent with available tools
      let selectedTool = null;
      let toolArgs = {};

      // Smart tool matching based on user message and available tools
      for (const tool of availableTools) {
        const toolName = tool.name.toLowerCase();

        if (message.includes('post') && toolName.includes('post')) {
          if (message.includes('get') || message.includes('show') || message.includes('list') || message.includes('fetch')) {
            if (toolName.includes('get') || toolName.includes('all')) {
              selectedTool = tool;
              toolArgs = { _limit: '5' };
              break;
            }
          } else if (message.includes('create') && toolName.includes('create')) {
            selectedTool = tool;
            toolArgs = {
              title: 'New Post from MCP Client',
              body: 'This post was created through the real MCP client integration!',
              userId: 1
            };
            break;
          }
        } else if (message.includes('user') && toolName.includes('user')) {
          if (message.includes('get') || message.includes('show') || message.includes('list') || message.includes('fetch')) {
            selectedTool = tool;
            toolArgs = {};
            break;
          }
        } else if (message.includes('comment') && toolName.includes('comment')) {
          selectedTool = tool;
          toolArgs = {};
          break;
        }
      }

      if (selectedTool) {
        setLlmStatus('calling_tools');
        console.log(`🎯 Selected tool: ${selectedTool.name} with args:`, toolArgs);

        const result = await mcpClient.callTool(selectedTool.name, toolArgs);

        let resultText = '';
        if (result?.content?.[0]?.text) {
          resultText = result.content[0].text;
        } else {
          resultText = JSON.stringify(result, null, 2);
        }

        return `I'll use the **${selectedTool.name}** tool from your generated MCP server.\n\n📊 **Result:**\n\`\`\`\n${resultText}\n\`\`\``;

      } else if (message.includes('tool') || message.includes('function') || message.includes('available')) {
        const toolsList = availableTools.map(tool => `• **${tool.name}**: ${tool.description}`).join('\n');

        return `Here are the real MCP tools discovered from your generated server:\n\n**🔧 Available Tools (${availableTools.length}):**\n${toolsList}\n\nYou can ask me to use any of these tools! For example:\n- "Use the ${availableTools[0]?.name} tool"\n- "Call ${availableTools[1]?.name}"\n- "Execute ${availableTools[2]?.name}"`;

      } else {
        const toolsList = availableTools.map(tool => `• ${tool.name}`).join('\n');

        return `I'm connected to your generated MCP server and discovered ${availableTools.length} tools!\n\n**Available Tools:**\n${toolsList}\n\nTry asking me to:\n- Use any of these specific tools\n- "Show me what tools are available"\n- "Call the [tool_name] tool"\n\n${!hfApiKey ? '💡 **Tip**: Configure a Hugging Face API key in settings for enhanced AI processing!' : '🤖 **Enhanced**: Using advanced context-aware AI with chained reasoning!'}`;
      }
    } catch (error) {
      throw new Error(`MCP operation failed: ${error.message}`);
    }
  };

  const simulateBasicResponse = async (userMessage: string): Promise<string> => {
    return `I need to connect to the MCP server first. Please start the MCP server and I'll be able to discover and use real MCP tools dynamically.\n\nOnce connected, I can:\n- Discover tools from your generated server\n- Call MCP tools directly\n- Access MCP resources\n- Use the Model Context Protocol properly\n\nCurrent status: ${mcpConnectionStatus}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    switch (llmStatus) {
      case 'thinking':
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'calling_tools':
        return <Zap className="w-4 h-4 text-purple-500 animate-bounce" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (llmStatus) {
      case 'thinking':
        return 'LLM processing...';
      case 'calling_tools':
        return 'Calling MCP tools...';
      case 'error':
        return 'Error occurred';
      default:
        return 'Ready';
    }
  };

  const getMCPStatusIcon = () => {
    switch (mcpConnectionStatus) {
      case 'connected':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'connecting':
        return <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Link className="w-3 h-3 text-gray-400" />;
    }
  };

  const getMCPStatusText = () => {
    switch (mcpConnectionStatus) {
      case 'connected':
        return `connected (${discoveredTools.length} tools)`;
      case 'connecting':
        return 'connecting & discovering...';
      case 'error':
        return 'connection failed';
      default:
        return 'disconnected';
    }
  };

  const getMCPStatusColor = () => {
    switch (mcpConnectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Generate quick actions based on discovered tools
  const generateQuickActions = () => {
    if (discoveredTools.length === 0) return [];

    const actions = [];

    // Add actions based on discovered tools
    discoveredTools.slice(0, 4).forEach(tool => {
      let actionText = '';
      let actionLabel = '';

      if (tool.name.includes('get') && tool.name.includes('post')) {
        actionText = `Use the ${tool.name} tool to get posts`;
        actionLabel = '📝 Get Posts';
      } else if (tool.name.includes('get') && tool.name.includes('user')) {
        actionText = `Use the ${tool.name} tool to get users`;
        actionLabel = '👥 Get Users';
      } else if (tool.name.includes('create')) {
        actionText = `Use the ${tool.name} tool to create something`;
        actionLabel = `✨ ${tool.name}`;
      } else {
        actionText = `Use the ${tool.name} tool`;
        actionLabel = `🔧 ${tool.name}`;
      }

      actions.push({ text: actionText, label: actionLabel });
    });

    // Always add the tools list action
    actions.push({
      text: 'What MCP tools and resources are available?',
      label: '🔧 List Tools'
    });

    return actions;
  };

  const quickActions = generateQuickActions();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Enhanced MCP Client</h2>
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1">
                  {getMCPStatusIcon()}
                  <span className={`${getMCPStatusColor()}`}>
                    MCP {getMCPStatusText()}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusIcon()}
                  <span className="text-gray-600">{getStatusText()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Search className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {discoveredTools.length} tools discovered
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Key className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {hfApiKey ? 'Enhanced AI' : 'Simulated'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testMCPConnection}
              disabled={serverStatus !== 'running'}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Test MCP
            </Button>
            {mcpConnectionStatus === 'error' && (
              <Button
                variant="outline"
                size="sm"
                onClick={forceReconnect}
                disabled={serverStatus !== 'running'}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Force Reconnect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        {/* Remove the Connection Progress Indicator - keeping only header spinner */}

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-200"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Hugging Face API Key"
                    type="password"
                    placeholder="hf_..."
                    value={hfApiKey}
                    onChange={(e) => setHfApiKey(e.target.value)}
                    className="text-sm"
                    icon={<Key className="w-4 h-4" />}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      LLM Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {availableModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <ExternalLink className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1 text-sm">Enhanced MCP Integration with Context-Aware Chaining</h4>
                      <p className="text-xs text-blue-700 mb-2">
                        Advanced MCP integration with sophisticated response processing:
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Context-aware conversation management</li>
                        <li>• Multi-step reasoning with prompt chaining</li>
                        <li>• Response synthesis from multiple sources</li>
                        <li>• Automatic removal of system artifacts</li>
                        <li>• Dynamic tool discovery and intelligent selection</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1 text-sm">
                        MCP Status: {mcpConnectionStatus} | Tools: {discoveredTools.length} | Resources: {discoveredResources.length}
                      </h4>
                      <p className="text-xs text-green-700">
                        {mcpConnectionStatus === 'connected'
                          ? `✅ Connected with ${discoveredTools.length} tools and ${discoveredResources.length} resources discovered`
                          : mcpConnectionStatus === 'connecting'
                          ? '🔄 Establishing MCP connection and discovering tools...'
                          : '❌ MCP server not connected - start the server to enable dynamic tool discovery'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-gray-800 border border-purple-200'
                  : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
              } rounded-lg p-3`}>
                <div className="flex items-center space-x-2 mb-2">
                  {message.role === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : message.role === 'system' ? (
                    <Cpu className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                  <span className="text-xs font-medium capitalize">{message.role}</span>
                  <span className="text-xs opacity-75">{formatTime(message.timestamp)}</span>
                  {message.role === 'assistant' && mcpConnectionStatus === 'connected' && (
                    <span className="text-xs bg-green-100 text-green-800 px-1 rounded">Enhanced AI</span>
                  )}
                </div>

                <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>

                {/* MCP Calls Indicator */}
                {message.mcpCalls && message.mcpCalls.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="space-y-2">
                      {message.mcpCalls.map((call, index) => (
                        <div key={index} className="flex items-center space-x-2 text-xs">
                          {call.success ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-600" />
                          )}
                          <span className="text-gray-600">
                            MCP Call: <code className="bg-gray-100 px-1 rounded text-purple-600">
                              {call.function.name}
                            </code>
                            {call.success ? ' ✓' : ` ✗ ${call.error}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Indicator */}
                {message.error && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Error: {message.error}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">
                  {llmStatus === 'thinking' ? 'LLM processing...' :
                   llmStatus === 'calling_tools' ? 'Processing with enhanced AI...' :
                   'Processing...'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-3">
        {serverStatus !== 'running' ? (
          <div className="text-center py-4">
            <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Start the MCP server to begin chatting</p>
          </div>
        ) : (
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={mcpConnectionStatus === 'connected' 
                  ? `Ask me to use any of the ${discoveredTools.length} discovered MCP tools...` 
                  : "Connecting to MCP server..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={2}
                disabled={isLoading || mcpConnectionStatus !== 'connected'}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || mcpConnectionStatus !== 'connected'}
              size="sm"
              className="px-4 py-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Dynamic Quick Actions based on discovered tools */}
        {serverStatus === 'running' && mcpConnectionStatus === 'connected' && !isLoading && quickActions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(action.text)}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};