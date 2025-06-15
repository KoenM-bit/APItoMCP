import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Zap, 
  Database, 
  Globe, 
  Calendar,
  TrendingUp,
  Users,
  Server,
  Activity,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getUserProjects, Project, getPlanLimits } from '../utils/firebase';

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      if (user) {
        try {
          const userProjects = await getUserProjects(user.uid);
          setProjects(userProjects);
        } catch (error) {
          console.error('Failed to load projects:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProjects();
  }, [user]);

  const planLimits = getPlanLimits(userProfile?.plan || 'free');
  const usage = userProfile?.usage || { endpointsUsed: 0, serversGenerated: 0, deploymentsCreated: 0 };

  const stats = [
    {
      name: 'Total Projects',
      value: projects.length,
      limit: planLimits.projects,
      icon: Database,
      color: 'blue'
    },
    {
      name: 'Servers Generated',
      value: usage.serversGenerated,
      limit: planLimits.servers,
      icon: Server,
      color: 'green'
    },
    {
      name: 'Deployments',
      value: usage.deploymentsCreated,
      limit: planLimits.deployments,
      icon: Globe,
      color: 'purple'
    },
    {
      name: 'Endpoints Used',
      value: usage.endpointsUsed,
      limit: planLimits.endpoints,
      icon: Activity,
      color: 'yellow'
    }
  ];

  const recentProjects = projects.slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userProfile?.displayName?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your MCP servers and track your usage
              </p>
            </div>
            <Link to="/generator">
              <Button size="lg" className="shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isUnlimited = stat.limit === -1;
            const percentage = isUnlimited ? 0 : (stat.value / stat.limit) * 100;
            
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600',
              green: 'from-green-500 to-green-600',
              purple: 'from-purple-500 to-purple-600',
              yellow: 'from-yellow-500 to-yellow-600'
            };

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {!isUnlimited && percentage > 80 && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Near limit
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                      {!isUnlimited && (
                        <span className="text-sm font-normal text-gray-500">
                          /{stat.limit}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">{stat.name}</div>
                    {!isUnlimited && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${colorClasses[stat.color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
                  <Link to="/projects" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-600 mb-6">
                      Create your first MCP server to get started
                    </p>
                    <Link to="/generator">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{project.name}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{project.endpoints.length} endpoints</span>
                              <span>{project.tools.length} tools</span>
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(project.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            project.status === 'deployed' 
                              ? 'bg-green-100 text-green-800'
                              : project.status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                          </span>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions & Plan Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/generator">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    New MCP Server
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Import API Spec
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  Deploy Existing
                </Button>
              </CardContent>
            </Card>

            {/* Plan Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold capitalize">
                    {userProfile?.plan || 'Free'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Projects</span>
                    <span className="font-medium">
                      {planLimits.projects === -1 ? 'Unlimited' : `${projects.length}/${planLimits.projects}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Endpoints</span>
                    <span className="font-medium">
                      {planLimits.endpoints === -1 ? 'Unlimited' : `${usage.endpointsUsed}/${planLimits.endpoints}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Deployments</span>
                    <span className="font-medium">
                      {planLimits.deployments === -1 ? 'Unlimited' : `${usage.deploymentsCreated}/${planLimits.deployments}`}
                    </span>
                  </div>
                  
                  {userProfile?.plan === 'free' && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button className="w-full">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Account created</span>
                    <span className="text-gray-400 ml-auto">
                      {userProfile?.createdAt && new Date(userProfile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Last login</span>
                    <span className="text-gray-400 ml-auto">
                      {userProfile?.lastLoginAt && new Date(userProfile.lastLoginAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;