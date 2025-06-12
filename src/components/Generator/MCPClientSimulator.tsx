import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Zap, 
  Database, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  Code,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';

interface MCPClientSimulatorProps {
  tools: any[];
  resources: any[];
  serverUrl: string;
  serverStatus: string;
  onToolTest: (toolName: string, parameters: any) => void;
  testResults: any[];
}

export const MCPClientSimulator: React.FC<MCPClientSimulatorProps> = ({
  tools,
  resources,
  serverUrl,
  serverStatus,
  onToolTest,
  testResults
}) => {
  // Add this debugging
  console.log('🎨 MCPClientSimulator rendering with:');
  console.log('🎨 testResults:', testResults);
  console.log('🎨 testResults length:', testResults.length);
  console.log('🎨 activeView will be set to:', useState('tools')[0]);

  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [toolParameters, setToolParameters] = useState<Record<string, any>>({});
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [activeView, setActiveView] = useState<'tools' | 'resources' | 'results'>('tools');

  // Add this to see when activeView changes
  console.log('🎨 Current activeView:', activeView);

  const handleParameterChange = (paramName: string, value: any) => {
    setToolParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleToolTest = () => {
    if (selectedTool) {
      onToolTest(selectedTool.name, toolParameters);
      setToolParameters({});
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
          />
        );
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Tools & Resources */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* View Selector */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveView('tools')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'tools'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Tools</span>
            </button>
            <button
              onClick={() => setActiveView('resources')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'resources'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Resources</span>
            </button>
            <button
              onClick={() => setActiveView('results')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'results'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Results</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeView === 'tools' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Available Tools</h3>
              {tools.map((tool, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedTool?.name === tool.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-gray-900">{tool.name}</span>
                  </div>
                  <p className="text-xs text-gray-600">{tool.description}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeView === 'resources' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Available Resources</h3>
              {resources.map((resource, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedResource?.name === resource.name
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => setSelectedResource(resource)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-gray-900">{resource.name}</span>
                  </div>
                  <p className="text-xs text-gray-600">{resource.description}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeView === 'results' && (
  <div className="space-y-3">
    <h3 className="font-semibold text-gray-900 mb-3">Test Results</h3>
    {testResults.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No test results yet</p>
        <p className="text-xs">Run some tool tests to see results here</p>
      </div>
    ) : (
      testResults.slice().reverse().map((result) => (
        <div
          key={result.id}
          className={`p-3 rounded-lg border ${
            result.status === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {result.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium text-gray-900">{result.toolName}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{result.responseTime}ms</span>
            </div>
          </div>

          {/* Add detailed result display */}
          <div className="mt-3 space-y-2">
            {/* Parameters used */}
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Parameters:</div>
              <div className="bg-gray-100 rounded p-2 text-xs font-mono">
                {JSON.stringify(result.parameters, null, 2)}
              </div>
            </div>

            {/* Response/Error */}
            {result.status === 'success' ? (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">Response:</div>
                <div className="bg-white rounded border p-2 text-xs font-mono max-h-40 overflow-y-auto">
                  {result.result ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-gray-500">No response data</span>
                  )}
                </div>

                {/* Extract and highlight the actual API response */}
                {result.result?.result?.content?.[0]?.text && (
                  <div>
                    <div className="text-xs font-medium text-green-700 mb-1">API Response:</div>
                    <div className="bg-green-50 rounded border border-green-200 p-2 text-xs">
                      {result.result.result.content[0].text}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-xs font-medium text-red-700 mb-1">Error:</div>
                <div className="bg-red-50 rounded border border-red-200 p-2 text-xs">
                  {result.error || 'Unknown error'}
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-600 mt-2">
            {new Date(result.timestamp).toLocaleTimeString()}
          </div>
        </div>
      ))
    )}
  </div>
)}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {serverStatus !== 'running' ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Server Not Running</h3>
              <p className="text-gray-600 mb-4">Start the MCP server to begin testing</p>
              <Button disabled className="opacity-50">
                Start Server First
              </Button>
            </div>
          </div>
        ) : selectedTool ? (
          <div className="flex-1 p-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedTool.name}</h2>
                      <p className="text-gray-600">{selectedTool.description}</p>
                    </div>
                  </div>
                  <Button onClick={handleToolTest} className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Test Tool</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Parameters</h3>
                  {selectedTool.inputSchema?.properties ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedTool.inputSchema.properties).map(([key, schema]: [string, any]) => 
                        renderParameterInput({
                          name: key,
                          type: schema.type,
                          description: schema.description,
                          required: selectedTool.inputSchema.required?.includes(key)
                        })
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No parameters required</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : selectedResource ? (
          <div className="flex-1 p-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedResource.name}</h2>
                    <p className="text-gray-600">{selectedResource.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resource URI
                    </label>
                    <div className="bg-gray-100 rounded-lg p-3 font-mono text-sm">
                      {selectedResource.uri}
                    </div>
                  </div>
                  <Button className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Fetch Resource</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Tool or Resource</h3>
              <p className="text-gray-600">Choose from the sidebar to start testing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};