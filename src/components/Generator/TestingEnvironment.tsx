import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  Database,
  Settings,
  RefreshCw,
  AlertTriangle,
  Code,
  Monitor,
  Send,
  Eye,
  BarChart3,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  MessageSquare,
  Bot
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { WebContainerManager } from '../../utils/webcontainer';
import { MCPClientSimulator } from './MCPClientSimulator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { DebugConsole } from './DebugConsole';
import { LLMChatInterface } from './LLMChatInterface';

interface TestingEnvironmentProps {
  generatedCode: string;
  language: 'python' | 'typescript';
  tools: any[];
  resources: any[];
  onBack: () => void;
}

export const TestingEnvironment: React.FC<TestingEnvironmentProps> = ({
  generatedCode,
  language,
  tools,
  resources,
  onBack
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [activeTab, setActiveTab] = useState<'chat' | 'simulator' | 'debug' | 'metrics' | 'terminal'>('chat');
  const [webContainer, setWebContainer] = useState<WebContainerManager | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [initializationProgress, setInitializationProgress] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [toolParameters, setToolParameters] = useState<Record<string, any>>({});
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [responseExpanded, setResponseExpanded] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const performanceInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Initialize WebContainer
    const initWebContainer = async () => {
      try {
        if (!isMounted) return;
        
        setInitializationProgress('Initializing WebContainer...');
        addDebugLog('info', 'Starting WebContainer initialization');
        
        const container = WebContainerManager.getInstance();
        
        await container.initialize();
        
        if (!isMounted) return;
        
        setWebContainer(container);
        (window as any).webContainerManagerInstance = container;
        setInitializationProgress('WebContainer ready');
        addDebugLog('info', 'WebContainer initialized successfully');
        addTerminalOutput('WebContainer initialized successfully');
        
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Failed to initialize WebContainer:', error);
        setServerStatus('error');
        setInitializationProgress('Failed to initialize WebContainer');
        addDebugLog('error', 'WebContainer initialization failed', error);
        addTerminalOutput(`Error: ${error.message}`);
      }
    };

    initWebContainer();

    return () => {
      isMounted = false;
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
      }
    };
  }, []);

  // Clear tool parameters when switching tools
  useEffect(() => {
    if (selectedTool) {
      console.log('🔄 Tool changed to:', selectedTool.name, '- clearing previous parameters');
      addDebugLog('info', `Switched to ${selectedTool.name} - parameters cleared`);
      setToolParameters({});
      setLastTestResult(null); // Also clear previous results for clarity
    }
  }, [selectedTool]);

  const addDebugLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const log = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    setDebugLogs(prev => [...prev, log].slice(-100)); // Keep last 100 logs
  };

  const addTerminalOutput = (output: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput(prev => [...prev, `[${timestamp}] ${output}`].slice(-50));
  };

  const handleToolSelection = (tool: any) => {
    console.log('🔄 Selecting new tool:', tool.name);

    // Only clear if actually switching to a different tool
    if (!selectedTool || selectedTool.name !== tool.name) {
      console.log('🧹 Clearing parameters for new tool');
      addDebugLog('info', `Switched to ${tool.name} - parameters cleared`);
      setToolParameters({});
      setLastTestResult(null);
    }

    setSelectedTool(tool);
  };

  const handleStartServer = async () => {
    if (!webContainer) {
      addDebugLog('error', 'WebContainer not available');
      return;
    }

    setIsRunning(true);
    setServerStatus('starting');
    setInitializationProgress('Creating MCP project...');

    try {
      // Create the MCP project files
      addDebugLog('info', 'Creating MCP project files');
      addTerminalOutput('Creating MCP project files...');
      await webContainer.createMCPProject(language, generatedCode);

      setInitializationProgress('Installing dependencies...');
      addTerminalOutput('Installing dependencies...');

      // Start the server
      setInitializationProgress('Starting MCP server...');
      addTerminalOutput('Starting MCP server...');
      const url = await webContainer.startMCPServer(language);

      setServerUrl(url);
      setServerStatus('running');
      setInitializationProgress('Server running');

      addDebugLog('info', 'MCP server started successfully', { url, language });
      addTerminalOutput(`MCP server started successfully at ${url}`);

      // Test MCP connection
      const isConnected = await webContainer.testMCPConnection();
      if (isConnected) {
        addDebugLog('info', 'MCP connection test passed');
        addTerminalOutput('MCP connection test: PASSED');
      } else {
        addDebugLog('warn', 'MCP connection test failed');
        addTerminalOutput('MCP connection test: FAILED');
      }

      // Start performance monitoring
      startPerformanceMonitoring();

    } catch (error) {
      console.error('Failed to start server:', error);
      setServerStatus('error');
      setInitializationProgress('Failed to start server');
      addDebugLog('error', 'Failed to start MCP server', error);
      addTerminalOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopServer = async () => {
    if (!webContainer) return;

    try {
      addTerminalOutput('Stopping MCP server...');
      await webContainer.stopServer();
      setServerStatus('stopped');
      setServerUrl('');
      setInitializationProgress('Server stopped');

      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
        performanceInterval.current = null;
      }

      addDebugLog('info', 'MCP server stopped successfully');
      addTerminalOutput('MCP server stopped successfully');

    } catch (error) {
      console.error('Failed to stop server:', error);
      addDebugLog('error', 'Failed to stop MCP server', error);
      addTerminalOutput(`Error stopping server: ${error.message}`);
    }
  };

  const startPerformanceMonitoring = () => {
    if (performanceInterval.current) {
      clearInterval(performanceInterval.current);
    }

    performanceInterval.current = setInterval(async () => {
      if (webContainer && serverStatus === 'running') {
        try {
          const metrics = await webContainer.getPerformanceMetrics();
          if (metrics) {
            setPerformanceData(prev => [...prev.slice(-19), metrics]);
          }
        } catch (error) {
          console.error('Failed to get performance metrics:', error);
        }
      }
    }, 2000);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setToolParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleToolTest = async (toolName: string, parameters: any) => {
    if (!webContainer || serverStatus !== 'running') {
      addDebugLog('error', 'Cannot test tool: server not running');
      return;
    }

    const startTime = Date.now();
    addDebugLog('info', `Testing MCP tool: ${toolName}`, parameters);
    addTerminalOutput(`Testing tool: ${toolName}`);

    try {
      console.log('🚀 About to send MCP request...');
      console.log('🔧 Tool name:', toolName);
      console.log('🔧 Parameters:', parameters);

      // Send actual MCP request
      const result = await webContainer.sendMCPRequest('tools/call', {
        name: toolName,
        arguments: parameters
      });

      console.log('📦 Raw result from sendMCPRequest:', result);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const testResult = {
        id: Date.now(),
        toolName,
        parameters,
        result,
        responseTime,
        status: 'success',
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [...prev, testResult]);
      setLastTestResult(testResult);

      addDebugLog('info', `MCP tool test completed: ${toolName}`, { responseTime, result });
      addTerminalOutput(`Tool test completed: ${toolName} (${responseTime}ms)`);

    } catch (error) {
      console.log('❌ Error in handleToolTest:', error);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const testResult = {
        id: Date.now(),
        toolName,
        parameters,
        error: error.message,
        responseTime,
        status: 'error',
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [...prev, testResult]);
      setLastTestResult(testResult);

      addDebugLog('error', `MCP tool test failed: ${toolName}`, error);
      addTerminalOutput(`Tool test failed: ${toolName} - ${error.message}`);
    }
  };

  const handleMCPCall = async (method: string, params: any) => {
    if (!webContainer || serverStatus !== 'running') {
      throw new Error('MCP server not running');
    }

    try {
      const result = await webContainer.sendMCPRequest(method, params);
      addDebugLog('info', `LLM MCP call: ${method}`, { params, result });
      return result;
    } catch (error) {
      addDebugLog('error', `LLM MCP call failed: ${method}`, error);
      throw error;
    }
  };

  const handleInitializeMCP = async () => {
    if (!webContainer || serverStatus !== 'running') return;

    try {
      addTerminalOutput('Initializing MCP connection...');
      const result = await webContainer.sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {}
        },
        clientInfo: {
          name: 'MCP Studio Test Client',
          version: '1.0.0'
        }
      });

      addDebugLog('info', 'MCP initialization successful', result);
      addTerminalOutput('MCP initialization: SUCCESS');

    } catch (error) {
      addDebugLog('error', 'MCP initialization failed', error);
      addTerminalOutput(`MCP initialization failed: ${error.message}`);
    }
  };

  const renderParameterInput = (param: any) => {
    const value = toolParameters[param.name] || '';

    switch (param.type) {
      case 'string':
        return (
          <Input
            key={param.name}
            label={param.name}
            placeholder={param.description || `Enter ${param.name}`}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="text-sm"
          />
        );
      case 'number':
        return (
          <Input
            key={param.name}
            type="number"
            label={param.name}
            placeholder={param.description || `Enter ${param.name}`}
            value={value}
            onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
            className="text-sm"
          />
        );
      case 'boolean':
        return (
          <div key={param.name} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={param.name}
              checked={value || false}
              onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={param.name} className="text-sm font-medium text-gray-700">
              {param.name}
            </label>
          </div>
        );
      default:
        return (
          <Input
            key={param.name}
            label={param.name}
            placeholder={param.description || `Enter ${param.name}`}
            value={value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="text-sm"
          />
        );
    }
  };

  const tabs = [
    { id: 'chat', label: 'LLM Chat', icon: MessageSquare },
    { id: 'simulator', label: 'Tools', icon: Zap },
    { id: 'debug', label: 'Debug', icon: Terminal },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'terminal', label: 'Terminal', icon: Code }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">MCP Testing</h1>
              <p className="text-xs text-gray-600">
                {language} server • {tools.length} tools • {resources.length} resources
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Compact Server Status */}
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                serverStatus === 'running' ? 'bg-green-500' :
                serverStatus === 'starting' ? 'bg-yellow-500 animate-pulse' :
                serverStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className="font-medium capitalize">{serverStatus}</span>
              {initializationProgress && (
                <span className="text-xs text-gray-500">({initializationProgress})</span>
              )}
            </div>

            {/* Compact Server Controls */}
            {serverStatus === 'stopped' || serverStatus === 'error' ? (
              <Button
                onClick={handleStartServer}
                disabled={!webContainer || isRunning}
                size="sm"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleInitializeMCP}
                  variant="outline"
                  size="sm"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Init MCP
                </Button>
                <Button
                  onClick={handleStopServer}
                  variant="outline"
                  size="sm"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar - Only show for simulator tab */}
        {activeTab === 'simulator' && (
          <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'w-12' : 'w-80'
          }`}>
            {/* Sidebar Header */}
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              {!sidebarCollapsed && (
                <h2 className="font-semibold text-gray-900 text-sm">Tools & Resources</h2>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded hover:bg-gray-100"
              >
                {sidebarCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 overflow-y-auto p-3">
                {/* Tools Section */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Available Tools ({tools.length})
                  </h3>
                  <div className="space-y-2">
                    {tools.map((tool, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.01 }}
                        className={`p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          selectedTool?.name === tool.name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => handleToolSelection(tool)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Zap className="w-3 h-3 text-purple-600" />
                          <span className="font-medium text-gray-900 text-xs">{tool.name}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{tool.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Resources Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Resources ({resources.length})
                  </h3>
                  <div className="space-y-2">
                    {resources.map((resource, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Database className="w-3 h-3 text-emerald-600" />
                          <span className="font-medium text-gray-900 text-xs">{resource.name}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{resource.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.id === 'chat' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'chat' && (
                  <LLMChatInterface
                    mcpServerUrl={serverUrl}
                    serverStatus={serverStatus}
                    tools={tools}
                    resources={resources}
                    onMCPCall={handleMCPCall}
                  />
                )}

                {activeTab === 'simulator' && (
                  <>
                    {serverStatus !== 'running' ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Play className="w-6 h-6 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Server Not Running</h3>
                          <p className="text-gray-600 mb-4">Start the MCP server to begin testing</p>
                          <Button disabled className="opacity-50">
                            Start Server First
                          </Button>
                        </div>
                      </div>
                    ) : selectedTool ? (
                      <div className="flex-1 flex flex-col">
                        {/* Tool Testing Area */}
                        <div className="p-4 border-b border-gray-200 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Zap className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <h2 className="text-lg font-bold text-gray-900">{selectedTool.name}</h2>
                                <p className="text-sm text-gray-600">{selectedTool.description}</p>
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleToolTest(selectedTool.name, toolParameters)} 
                              size="sm"
                              disabled={serverStatus !== 'running'}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Test Tool
                            </Button>
                          </div>

                          {/* Parameters */}
                          {selectedTool.inputSchema?.properties && (
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Parameters</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.entries(selectedTool.inputSchema.properties).map(([key, schema]: [string, any]) => 
                                  renderParameterInput({
                                    name: key,
                                    type: schema.type,
                                    description: schema.description,
                                    required: selectedTool.inputSchema.required?.includes(key)
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Response Area */}
                        <div className="flex-1 flex flex-col bg-gray-50">
                          {lastTestResult ? (
                            <div className="flex-1 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-900">Latest Test Result</h3>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => setResponseExpanded(!responseExpanded)}
                                    className="p-1 rounded hover:bg-gray-200"
                                  >
                                    {responseExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                  </button>
                                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{lastTestResult.responseTime}ms</span>
                                  </div>
                                  {lastTestResult.status === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                </div>
                              </div>

                              <div className={`bg-white rounded-lg border ${
                                responseExpanded ? 'h-full' : 'max-h-96'
                              } overflow-hidden flex flex-col`}>
                                {/* Parameters Used */}
                                <div className="p-3 border-b border-gray-200">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Parameters:</div>
                                  <div className="bg-gray-100 rounded p-2 text-xs font-mono">
                                    {JSON.stringify(lastTestResult.parameters, null, 2)}
                                  </div>
                                </div>

                                {/* Response/Error */}
                                <div className="flex-1 p-3 overflow-y-auto">
                                  {lastTestResult.status === 'success' ? (
                                    <div>
                                      <div className="text-xs font-medium text-gray-700 mb-2">Response:</div>
                                      {lastTestResult.result?.result?.content?.[0]?.text ? (
                                        <div className="bg-green-50 rounded border border-green-200 p-3">
                                          <div className="text-xs font-medium text-green-700 mb-2">API Response:</div>
                                          <pre className="text-xs whitespace-pre-wrap text-green-800">
                                            {lastTestResult.result.result.content[0].text}
                                          </pre>
                                        </div>
                                      ) : (
                                        <div className="bg-gray-50 rounded border p-3 text-xs font-mono">
                                          <pre className="whitespace-pre-wrap">
                                            {JSON.stringify(lastTestResult.result, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-xs font-medium text-red-700 mb-2">Error:</div>
                                      <div className="bg-red-50 rounded border border-red-200 p-3 text-xs text-red-800">
                                        {lastTestResult.error || 'Unknown error'}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="p-3 border-t border-gray-200 text-xs text-gray-600">
                                  {new Date(lastTestResult.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center">
                              <div className="text-center">
                                <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Results Yet</h3>
                                <p className="text-gray-600">Run a tool test to see the response here</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Zap className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Tool to Test</h3>
                          <p className="text-gray-600">Choose a tool from the sidebar to start testing</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'debug' && (
                  <DebugConsole
                    logs={debugLogs}
                    onClear={() => setDebugLogs([])}
                  />
                )}

                {activeTab === 'metrics' && (
                  <PerformanceMetrics
                    data={performanceData}
                    serverStatus={serverStatus}
                  />
                )}

                {activeTab === 'terminal' && (
                  <div className="h-full bg-gray-900 text-white p-3">
                    <div ref={terminalRef} className="h-full font-mono text-xs">
                      <div className="mb-2">
                        <span className="text-green-400">$</span> MCP Server Terminal - {language.toUpperCase()}
                      </div>
                      <div className="space-y-1 max-h-full overflow-y-auto">
                        {terminalOutput.map((line, index) => (
                          <div key={index} className="text-gray-300">
                            {line}
                          </div>
                        ))}
                        {serverStatus === 'running' && (
                          <div className="text-green-400 animate-pulse">
                            Server is running... Ready for MCP requests
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};