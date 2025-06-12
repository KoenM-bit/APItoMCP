import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Clock, 
  Cpu, 
  HardDrive, 
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformanceMetricsProps {
  data: any[];
  serverStatus: string;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  data,
  serverStatus
}) => {
  const latestMetrics = data[data.length - 1] || {
    responseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    requestCount: 0
  };

  const averageResponseTime = data.length > 0 
    ? data.reduce((sum, item) => sum + item.responseTime, 0) / data.length 
    : 0;

  const totalRequests = data.reduce((sum, item) => sum + item.requestCount, 0);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: {
    title: string;
    value: number;
    unit: string;
    icon: any;
    trend?: 'up' | 'down';
    color?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center space-x-2 mt-2">
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? value.toFixed(1) : value}
              </p>
              <span className="text-sm text-gray-500">{unit}</span>
              {trend && (
                <div className={`flex items-center ${
                  trend === 'up' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (serverStatus !== 'running') {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Metrics Available</h3>
          <p className="text-gray-600">Start the server to see performance metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Response Time"
            value={latestMetrics.responseTime}
            unit="ms"
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Memory Usage"
            value={latestMetrics.memoryUsage}
            unit="MB"
            icon={HardDrive}
            color="green"
          />
          <MetricCard
            title="CPU Usage"
            value={latestMetrics.cpuUsage}
            unit="%"
            icon={Cpu}
            color="yellow"
          />
          <MetricCard
            title="Total Requests"
            value={totalRequests}
            unit="req"
            icon={Zap}
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
              <p className="text-sm text-gray-600">
                Average: {averageResponseTime.toFixed(1)}ms
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTime}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatTime(value)}
                      formatter={(value: number) => [`${value.toFixed(1)}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage Chart */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Resource Usage</h3>
              <p className="text-sm text-gray-600">Memory and CPU utilization</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTime}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatTime(value)}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}${name === 'memoryUsage' ? 'MB' : '%'}`, 
                        name === 'memoryUsage' ? 'Memory' : 'CPU'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="memoryUsage" 
                      stackId="1"
                      stroke="#10B981" 
                      fill="#10B981"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cpuUsage" 
                      stackId="2"
                      stroke="#F59E0B" 
                      fill="#F59E0B"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Rate Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Request Rate</h3>
            <p className="text-sm text-gray-600">Requests per second over time</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => formatTime(value)}
                    formatter={(value: number) => [`${value}`, 'Requests']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="requestCount" 
                    stroke="#8B5CF6" 
                    fill="#8B5CF6"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {data.filter(d => d.responseTime < 100).length}
                </div>
                <div className="text-sm text-gray-600">Fast Responses (&lt;100ms)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {data.filter(d => d.responseTime >= 100 && d.responseTime < 500).length}
                </div>
                <div className="text-sm text-gray-600">Medium Responses (100-500ms)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {data.filter(d => d.responseTime >= 500).length}
                </div>
                <div className="text-sm text-gray-600">Slow Responses (&gt;500ms)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};