import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Terminal, 
  Trash2, 
  Download, 
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface DebugConsoleProps {
  logs: any[];
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({
  logs,
  onClear
}) => {
  const consoleRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = React.useState<'all' | 'info' | 'warn' | 'error'>('all');

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter(log => 
    filter === 'all' || log.level === filter
  );

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'warn':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}${
        log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-debug-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Debug Console</h2>
            <span className="text-sm text-gray-500">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter Buttons */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              {['all', 'info', 'warn', 'error'].map((level) => (
                <button
                  key={level}
                  onClick={() => setFilter(level as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === level
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm" onClick={onClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Console Content */}
      <div className="flex-1 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Terminal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {logs.length === 0 ? 'No Debug Logs' : 'No Matching Logs'}
              </h3>
              <p className="text-gray-600">
                {logs.length === 0 
                  ? 'Debug information will appear here when you test your MCP server'
                  : 'Try adjusting the filter to see more logs'
                }
              </p>
            </div>
          </div>
        ) : (
          <div 
            ref={consoleRef}
            className="h-full overflow-y-auto p-4 space-y-3 font-mono text-sm"
          >
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-3 ${getLogColor(log.level)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium uppercase text-xs tracking-wide">
                        {log.level}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="mb-2">
                      {log.message}
                    </div>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                          Show Details
                        </summary>
                        <pre className="mt-2 p-2 bg-black/10 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};