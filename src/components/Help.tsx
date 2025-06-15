import React from 'react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  Search,
  Zap,
  Database,
  Globe,
  Code
} from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';

const Help: React.FC = () => {
  const faqs = [
    {
      question: 'What is the Model Context Protocol (MCP)?',
      answer: 'MCP is a protocol that allows AI models like Claude to securely connect to external data sources and tools. It enables AI assistants to access real-time information and perform actions on your behalf.'
    },
    {
      question: 'How do I connect my API to Claude?',
      answer: 'Upload your API specification, map your endpoints to MCP tools using our visual interface, generate the server code, and deploy it. Then configure Claude Desktop to connect to your MCP server.'
    },
    {
      question: 'What API formats are supported?',
      answer: 'We support OpenAPI/Swagger specifications, REST APIs, GraphQL endpoints, and manual API definitions. You can upload JSON files or provide API URLs for automatic discovery.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, all data is encrypted in transit and at rest. Your API credentials are securely stored and never shared. MCP servers run in isolated environments with proper authentication.'
    },
    {
      question: 'Can I customize the generated code?',
      answer: 'Absolutely! You can add custom methods, modify the generated code, and implement custom business logic. The generated code is production-ready and fully customizable.'
    },
    {
      question: 'What are the pricing limits?',
      answer: 'Free plan includes 3 projects and 10 endpoints. Pro plan offers unlimited projects and endpoints. Enterprise plan includes custom deployment options and dedicated support.'
    }
  ];

  const resources = [
    {
      title: 'Getting Started Guide',
      description: 'Learn the basics of creating your first MCP server',
      icon: Book,
      link: '#'
    },
    {
      title: 'API Documentation',
      description: 'Complete reference for all MCP Studio features',
      icon: Code,
      link: '#'
    },
    {
      title: 'Video Tutorials',
      description: 'Step-by-step video guides and examples',
      icon: Zap,
      link: '#'
    },
    {
      title: 'Community Forum',
      description: 'Connect with other developers and get help',
      icon: MessageCircle,
      link: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
            <p className="text-gray-600 mt-2">Find answers to common questions and get support</p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for help articles..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Help */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                      <Button variant="outline" size="sm">
                        Learn More
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  {faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
                    >
                      <h3 className="font-medium text-gray-900 mb-2">{faq.question}</h3>
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Contact Support */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Need More Help?</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Live Chat Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Book className="w-4 h-4 mr-2" />
                    Documentation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Status</h3>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">All systems operational</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Globe className="w-4 h-4 mr-2" />
                    View Status Page
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Help;