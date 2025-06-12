import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Link2, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Globe,
  Code,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface APIInputFormProps {
  onNext: (data: any) => void;
}

export const APIInputForm: React.FC<APIInputFormProps> = ({ onNext }) => {
  const [inputMethod, setInputMethod] = useState<'upload' | 'url' | 'manual'>('upload');
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/json': ['.json'],
      'application/x-yaml': ['.yaml', '.yml'],
      'text/yaml': ['.yaml', '.yml']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadedFile(acceptedFiles[0]);
        setError(null);
      }
    }
  });

  const parseOpenAPISpec = (spec: any) => {
    const endpoints = [];
    
    if (!spec.paths) {
      throw new Error('Invalid OpenAPI specification: missing paths');
    }

    for (const [path, pathItem] of Object.entries(spec.paths as any)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          const endpoint = {
            id: `${method.toUpperCase()}_${path}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            path,
            method: method.toUpperCase(),
            description: operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
            parameters: [],
            responses: [],
            tags: operation.tags || []
          };

          // Parse parameters
          if (operation.parameters) {
            endpoint.parameters = operation.parameters.map((param: any) => ({
              name: param.name,
              type: param.schema?.type || 'string',
              required: param.required || false,
              description: param.description,
              location: param.in,
              example: param.example || param.schema?.example
            }));
          }

          // Parse request body for POST/PUT/PATCH
          if (operation.requestBody && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            const content = operation.requestBody.content;
            if (content) {
              const mediaType = Object.keys(content)[0];
              const schema = content[mediaType]?.schema;
              if (schema?.properties) {
                Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
                  endpoint.parameters.push({
                    name: propName,
                    type: propSchema.type || 'string',
                    required: schema.required?.includes(propName) || false,
                    description: propSchema.description,
                    location: 'body',
                    example: propSchema.example
                  });
                });
              }
            }
          }

          // Parse responses
          if (operation.responses) {
            endpoint.responses = Object.entries(operation.responses).map(([statusCode, response]: [string, any]) => ({
              statusCode: parseInt(statusCode),
              description: response.description || `Response ${statusCode}`,
              schema: response.content ? Object.values(response.content)[0] : null
            }));
          }

          endpoints.push(endpoint);
        }
      }
    }

    return {
      info: spec.info || {},
      servers: spec.servers || [],
      endpoints,
      security: spec.security || [],
      components: spec.components || {}
    };
  };

  const discoverAPIFromURL = async (url: string) => {
    const commonPaths = [
      '/swagger.json',
      '/openapi.json',
      '/api-docs',
      '/docs/swagger.json',
      '/v1/swagger.json',
      '/api/v1/swagger.json',
      '/swagger/v1/swagger.json'
    ];

    // Clean URL
    const baseUrl = url.replace(/\/$/, '');
    
    for (const path of commonPaths) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (response.ok) {
          const spec = await response.json();
          return parseOpenAPISpec(spec);
        }
      } catch (error) {
        // Continue to next path
        console.log(`Failed to fetch from ${baseUrl}${path}:`, error);
      }
    }

    // If no OpenAPI spec found, try to discover endpoints manually
    throw new Error('Could not find OpenAPI specification. Please upload the spec file manually or provide the direct URL to your OpenAPI/Swagger documentation.');
  };

  const handleUrlSubmit = async () => {
    if (!apiUrl.trim()) {
      setError('Please enter a valid API URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiData = await discoverAPIFromURL(apiUrl);
      onNext({
        method: 'url',
        url: apiUrl,
        ...apiData
      });
    } catch (error) {
      console.error('API discovery failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to discover API endpoints');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;

    setLoading(true);
    setError(null);

    try {
      const fileContent = await uploadedFile.text();
      let spec;

      if (uploadedFile.name.endsWith('.json')) {
        spec = JSON.parse(fileContent);
      } else if (uploadedFile.name.endsWith('.yaml') || uploadedFile.name.endsWith('.yml')) {
        // For YAML files, we'll need to parse them
        // For now, we'll assume JSON format or ask user to convert
        throw new Error('YAML files are not yet supported. Please convert to JSON format.');
      } else {
        throw new Error('Unsupported file format. Please upload a JSON file.');
      }

      const apiData = parseOpenAPISpec(spec);
      
      onNext({
        method: 'upload',
        file: uploadedFile,
        ...apiData
      });
    } catch (error) {
      console.error('File parsing failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to parse API specification');
    } finally {
      setLoading(false);
    }
  };

  const inputMethods = [
    {
      id: 'upload',
      title: 'Upload OpenAPI Spec',
      description: 'Upload your OpenAPI/Swagger JSON file',
      icon: Upload,
      recommended: true
    },
    {
      id: 'url',
      title: 'Enter API URL',
      description: 'Provide your API base URL for automatic discovery',
      icon: Link2,
      recommended: false
    },
    {
      id: 'manual',
      title: 'Manual Definition',
      description: 'Define your API endpoints manually',
      icon: FileText,
      recommended: false
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Import Your API
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose how you'd like to import your API. We'll analyze your endpoints and help you map them to MCP tools and resources.
        </p>
      </motion.div>

      {/* Input Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {inputMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = inputMethod === method.id;
          
          return (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 shadow-lg bg-blue-50' 
                    : 'hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => setInputMethod(method.id as any)}
              >
                <CardContent className="p-6 text-center">
                  <div className="relative mb-4">
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {method.recommended && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Recommended
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{method.title}</h3>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 mb-1">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Input Form Based on Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">
            {inputMethods.find(m => m.id === inputMethod)?.title}
          </h2>
        </CardHeader>
        <CardContent className="p-6">
          {inputMethod === 'upload' && (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : uploadedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center">
                  {uploadedFile ? (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                      <p className="text-lg font-medium text-green-700 mb-2">
                        File uploaded successfully!
                      </p>
                      <p className="text-sm text-green-600 mb-4">
                        {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {isDragActive ? 'Drop your file here' : 'Drag & drop your OpenAPI file'}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Supports JSON format (YAML support coming soon)
                      </p>
                    </>
                  )}
                  <Button variant="outline" type="button">
                    Choose File
                  </Button>
                </div>
              </div>
              
              {uploadedFile && (
                <Button 
                  onClick={handleFileUpload} 
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing API Specification...
                    </>
                  ) : (
                    'Analyze API Specification'
                  )}
                </Button>
              )}
            </div>
          )}

          {inputMethod === 'url' && (
            <div className="space-y-6">
              <Input
                label="API Base URL"
                placeholder="https://api.example.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                icon={<Globe className="w-4 h-4" />}
              />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">How URL Discovery Works</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      We'll attempt to discover your API endpoints by checking common paths like:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">/swagger.json</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">/openapi.json</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">/api-docs</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">/docs/swagger.json</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleUrlSubmit} 
                loading={loading}
                disabled={!apiUrl.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering API Endpoints...
                  </>
                ) : (
                  'Discover API Endpoints'
                )}
              </Button>
            </div>
          )}

          {inputMethod === 'manual' && (
            <div className="text-center py-8">
              <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Manual API Definition
              </h3>
              <p className="text-gray-600 mb-6">
                This feature will allow you to manually define your API endpoints.
              </p>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};