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
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { WebContainerManager } from '../../utils/webcontainer';
import { MCPClientSimulator } from './MCPClientSimulator';
import { PerformanceMetrics } from './PerformanceMetrics';
import { DebugConsole } from './DebugConsole';

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
  const [activeTab, setActiveTab] = useState<'simulator' | 'debug' | 'metrics' | 'terminal'>('simulator');
  const [webContainer, setWebContainer] = useState<WebContainerManager | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [initializationProgress, setInitializationProgress] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

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

  const handleToolTest = async (toolName: string, parameters: any) => {
  if (!webContainer || serverStatus !== 'running') {
    addDebugLog('error', 'Cannot test tool: server not running');
    return;
  }

  const startTime = Date.now();
  addDebugLog('info', `Testing MCP tool: ${toolName}`, parameters);
  addTerminalOutput(`Testing tool: ${toolName}`);

  try {
    // Add comprehensive debugging
    console.log('🚀 About to send MCP request...');
    console.log('🔧 Tool name:', toolName);
    console.log('🔧 Parameters:', parameters);
    console.log('🔧 WebContainer instance:', webContainer);
    console.log('🔧 Server status:', serverStatus);

    // Send actual MCP request
    const result = await webContainer.sendMCPRequest('tools/call', {
      name: toolName,
      arguments: parameters
    });

    // Debug the response
    console.log('📦 Raw result from sendMCPRequest:', result);
    console.log('📦 Result type:', typeof result);
    console.log('📦 Result keys:', Object.keys(result || {}));
    console.log('📦 Full result structure:', JSON.stringify(result, null, 2));

    // Check if result has the expected MCP structure
    if (result && result.result && result.result.content) {
      console.log('✅ Result has proper MCP structure');
      console.log('📄 Content:', result.result.content);
    } else {
      console.log('⚠️ Result does not have expected MCP structure');
      console.log('📄 Looking for result.result.content, but got:', {
        hasResult: !!result,
        hasResultProperty: !!(result && result.result),
        hasContent: !!(result && result.result && result.result.content)
      });
    }

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

    console.log('📋 Created test result object:', testResult);
    console.log('📋 Test result ID:', testResult.id);
    console.log('📋 Test result status:', testResult.status);

    // Debug state update
    setTestResults(prev => {
      console.log('📊 Previous test results:', prev);
      console.log('📊 Previous results length:', prev.length);

      const newResults = [...prev, testResult];

      console.log('📊 New test results array:', newResults);
      console.log('📊 New results length:', newResults.length);
      console.log('📊 Last result in array:', newResults[newResults.length - 1]);

      return newResults;
    });

    addDebugLog('info', `MCP tool test completed: ${toolName}`, { responseTime, result });
    addTerminalOutput(`Tool test completed: ${toolName} (${responseTime}ms)`);

    console.log('✅ handleToolTest completed successfully');

  } catch (error) {
    console.log('❌ Error in handleToolTest:', error);
    console.log('❌ Error message:', error.message);
    console.log('❌ Error stack:', error.stack);

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

    console.log('📋 Created error test result:', testResult);

    setTestResults(prev => {
      console.log('📊 Adding error result to previous results:', prev);
      const newResults = [...prev, testResult];
      console.log('📊 New results with error:', newResults);
      return newResults;
    });

    addDebugLog('error', `MCP tool test failed: ${toolName}`, error);
    addTerminalOutput(`Tool test failed: ${toolName} - ${error.message}`);

    console.log('❌ handleToolTest completed with error');
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

  const tabs = [
    { id: 'simulator', label: 'MCP Simulator', icon: Monitor },
    { id: 'debug', label: 'Debug Console', icon: Terminal },
    { id: 'metrics', label: 'Performance', icon: BarChart3 },
    { id: 'terminal', label: 'Terminal', icon: Code }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack}>
              ← Back to Generator
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MCP Server Testing</h1>
              <p className="text-sm text-gray-600">
                Test your generated {language} MCP server locally
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Server Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                serverStatus === 'running' ? 'bg-green-500' :
                serverStatus === 'starting' ? 'bg-yellow-500 animate-pulse' :
                serverStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className="text-sm font-medium capitalize">{serverStatus}</span>
              {initializationProgress && (
                <span className="text-xs text-gray-500">({initializationProgress})</span>
              )}
            </div>

            {/* Server Controls */}
            {serverStatus === 'stopped' || serverStatus === 'error' ? (
              <Button 
                onClick={handleStartServer}
                disabled={!webContainer || isRunning}
                className="flex items-center space-x-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Server</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleInitializeMCP}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Initialize MCP</span>
                </Button>
                <Button 
                  onClick={handleStopServer}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Server</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'simulator' && (
              <MCPClientSimulator
                tools={tools}
                resources={resources}
                serverUrl={serverUrl}
                serverStatus={serverStatus}
                onToolTest={handleToolTest}
                testResults={testResults}
              />
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
              <div className="h-full bg-gray-900 text-white p-4">
                <div ref={terminalRef} className="h-full font-mono text-sm">
                  <div className="mb-4">
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
  );
};