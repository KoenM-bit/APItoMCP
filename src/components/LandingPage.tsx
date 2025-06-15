import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Play, 
  Zap, 
  Shield, 
  Globe, 
  Code2, 
  Users, 
  Star,
  CheckCircle2,
  Sparkles,
  Bot,
  Cpu,
  Database,
  Cloud,
  Timer,
  Target,
  TrendingUp,
  Award,
  Rocket
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from './auth/GoogleSignInButton';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate('/generator');
    } else {
      setIsSigningIn(true);
    }
  };

  const features = [
    {
      icon: Code2,
      title: 'Visual API Mapping',
      description: 'Drag-and-drop interface to map your API endpoints to MCP tools and resources.',
      color: 'blue'
    },
    {
      icon: Zap,
      title: 'Instant Generation',
      description: 'Generate production-ready MCP servers in Python or TypeScript within seconds.',
      color: 'yellow'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Built-in authentication, rate limiting, and security best practices.',
      color: 'green'
    },
    {
      icon: Globe,
      title: 'One-Click Deploy',
      description: 'Deploy to our cloud infrastructure or download for self-hosting.',
      color: 'purple'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Servers Generated', icon: Cpu },
    { number: '500+', label: 'Happy Developers', icon: Users },
    { number: '99.9%', label: 'Uptime', icon: TrendingUp },
    { number: '< 30s', label: 'Generation Time', icon: Timer }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Senior Developer at TechCorp',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face',
      content: 'MCP Studio saved us weeks of development time. The generated servers are production-ready and well-documented.',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'CTO at StartupXYZ',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
      content: 'The visual mapping interface is intuitive and powerful. Our team can now create MCP servers without deep protocol knowledge.',
      rating: 5
    },
    {
      name: 'Emily Watson',
      role: 'AI Engineer at DataFlow',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face',
      content: 'Excellent tool for connecting our APIs to Claude. The authentication and deployment features are top-notch.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span>Now supporting Claude 3.5 Sonnet</span>
              <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full text-xs">New</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Turn any API into an
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                {' '}MCP Server
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Connect your APIs to Claude and other AI models in minutes. 
              No coding required – just drag, drop, and deploy.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {user ? (
                <Button 
                  size="lg" 
                  className="px-8 py-4 text-lg shadow-xl hover:shadow-2xl"
                  onClick={() => navigate('/generator')}
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
              ) : (
                <GoogleSignInButton
                  onSuccess={() => navigate('/generator')}
                  size="lg"
                  className="px-8 py-4 text-lg shadow-xl hover:shadow-2xl"
                />
              )}
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-4 text-lg border-2"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-8 text-gray-500 mb-16">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="font-medium">4.9/5 rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">500+ developers</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span className="font-medium">10K+ servers generated</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
              {/* Browser Chrome */}
              <div className="bg-gray-100 px-6 py-4 flex items-center space-x-2 border-b border-gray-200">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div className="flex-1 bg-white rounded-md px-4 py-1 ml-4">
                  <span className="text-gray-500 text-sm">mcpstudio.dev</span>
                </div>
              </div>
              
              {/* App Interface */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white">
                <div className="grid grid-cols-3 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="bg-white/20 rounded-lg p-4">
                      <Database className="w-8 h-8 mb-2" />
                      <div className="text-sm font-medium">REST API</div>
                      <div className="text-xs opacity-75">Import & Analyze</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-white/20 rounded-full p-4 inline-block mb-4">
                      <ArrowRight className="w-8 h-8" />
                    </div>
                    <div className="text-sm font-medium">Visual Mapping</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/20 rounded-lg p-4">
                      <Bot className="w-8 h-8 mb-2" />
                      <div className="text-sm font-medium">MCP Server</div>
                      <div className="text-xs opacity-75">Deploy & Connect</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to build
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> MCP servers</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From API analysis to deployment, our platform handles the entire workflow
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                blue: 'from-blue-500 to-blue-600',
                yellow: 'from-yellow-500 to-yellow-600',
                green: 'from-green-500 to-green-600',
                purple: 'from-purple-500 to-purple-600'
              };
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                    <CardContent className="p-8">
                      <div className={`w-14 h-14 bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center mb-6`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How it works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your APIs into powerful MCP servers in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Import your API',
                description: 'Upload OpenAPI spec, paste URL, or define manually. We support REST, GraphQL, and more.',
                icon: Database,
                color: 'blue'
              },
              {
                step: '02',
                title: 'Visual mapping',
                description: 'Drag and drop to create MCP tools and resources. No coding required.',
                icon: Target,
                color: 'purple'
              },
              {
                step: '03',
                title: 'Deploy & connect',
                description: 'Generate production-ready code and deploy with one click. Connect to Claude instantly.',
                icon: Cloud,
                color: 'green'
              }
            ].map((step, index) => {
              const Icon = step.icon;
              const colorClasses = {
                blue: 'from-blue-500 to-blue-600',
                purple: 'from-purple-500 to-purple-600',
                green: 'from-green-500 to-green-600'
              };
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="text-center relative"
                >
                  {/* Step connector line */}
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent z-0"></div>
                  )}
                  
                  <div className="relative z-10">
                    <div className={`w-16 h-16 bg-gradient-to-r ${colorClasses[step.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center mx-auto mb-6 relative`}>
                      <Icon className="w-8 h-8 text-white" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold text-gray-900 shadow-lg">
                        {step.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Loved by developers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of developers who trust MCP Studio for their AI integrations
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
                    <div className="flex items-center">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Join thousands of developers building the future of AI-powered applications
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="px-8 py-4 text-lg"
                  onClick={() => navigate('/generator')}
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <GoogleSignInButton
                  onSuccess={() => navigate('/generator')}
                  variant="secondary"
                  size="lg"
                  className="px-8 py-4 text-lg"
                />
              )}
              <Button 
                variant="ghost" 
                size="lg" 
                className="px-8 py-4 text-lg text-white border-white hover:bg-white/10"
              >
                Schedule Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;