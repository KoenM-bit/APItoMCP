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
  Loader2,
  Search,
  ExternalLink,
  Info,
  Zap
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
  const [discoveryProgress, setDiscoveryProgress] = useState<string>('');
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<any[]>([]);
  
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
    console.log('🔍 Parsing OpenAPI spec:', spec);
    
    const endpoints = [];
    
    if (!spec.paths) {
      throw new Error('Invalid OpenAPI specification: missing paths');
    }

    // Extract base URL from servers
    let baseUrl = '';
    if (spec.servers && spec.servers.length > 0) {
      baseUrl = spec.servers[0].url;
    }

    console.log('📊 Found paths:', Object.keys(spec.paths));

    for (const [path, pathItem] of Object.entries(spec.paths as any)) {
      console.log(`🔍 Processing path: ${path}`, pathItem);
      
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
          console.log(`  📝 Processing ${method.toUpperCase()} ${path}`, operation);
          
          const endpoint = {
            id: `${method.toUpperCase()}_${path}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            path,
            method: method.toUpperCase(),
            description: operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
            parameters: [],
            responses: [],
            tags: operation.tags || [],
            baseUrl: baseUrl
          };

          // Parse parameters from path, query, header
          if (operation.parameters) {
            endpoint.parameters = operation.parameters.map((param: any) => ({
              name: param.name,
              type: param.schema?.type || param.type || 'string',
              required: param.required || false,
              description: param.description || '',
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
                    description: propSchema.description || '',
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
          console.log(`✅ Added endpoint: ${endpoint.method} ${endpoint.path}`);
        }
      }
    }

    console.log(`🎯 Total endpoints parsed: ${endpoints.length}`);

    return {
      info: spec.info || {},
      servers: spec.servers || [{ url: baseUrl }],
      endpoints,
      security: spec.security || [],
      components: spec.components || {}
    };
  };

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, application/yaml, text/yaml, text/plain',
          'User-Agent': 'MCP-Studio-API-Discovery/1.0',
          ...options.headers
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const discoverAPIFromURL = async (url: string) => {
    setDiscoveryProgress('Validating URL...');
    
    // Clean and validate URL
    let baseUrl = url.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    try {
      new URL(baseUrl);
    } catch {
      throw new Error('Invalid URL format. Please provide a valid URL.');
    }

    baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash

    setDiscoveryProgress('Discovering OpenAPI specification...');

    // Comprehensive list of common OpenAPI/Swagger documentation paths
    const commonPaths = [
      '/swagger.json',
      '/openapi.json',
      '/api-docs',
      '/docs/swagger.json',
      '/v1/swagger.json',
      '/api/v1/swagger.json',
      '/swagger/v1/swagger.json',
      '/api/swagger.json',
      '/docs/openapi.json',
      '/openapi/openapi.json',
      '/swagger/swagger.json',
      '/api/docs/swagger.json',
      '/api/openapi.json',
      '/docs.json',
      '/swagger-ui/swagger.json',
      '/api/v2/swagger.json',
      '/v2/swagger.json',
      '/api/v3/swagger.json',
      '/v3/swagger.json',
      '/swagger/doc.json',
      '/api/swagger/doc.json',
      '/docs/api.json',
      '/documentation/swagger.json',
      '/api/documentation/swagger.json'
    ];

    let discoveredSpec = null;
    let discoveredUrl = '';
    let attempts = 0;
    const maxAttempts = commonPaths.length;

    for (const path of commonPaths) {
      attempts++;
      setDiscoveryProgress(`Checking ${path} (${attempts}/${maxAttempts})...`);
      
      try {
        const testUrl = `${baseUrl}${path}`;
        console.log(`🔍 Trying: ${testUrl}`);
        
        const response = await fetchWithTimeout(testUrl, {
          method: 'GET',
        }, 8000);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          let spec;
          
          try {
            if (contentType.includes('application/json') || contentType.includes('text/json')) {
              spec = await response.json();
            } else if (contentType.includes('yaml') || contentType.includes('yml')) {
              const yamlText = await response.text();
              throw new Error('YAML format detected. Please convert to JSON or provide a JSON endpoint.');
            } else {
              // Try to parse as JSON anyway
              const text = await response.text();
              spec = JSON.parse(text);
            }
          } catch (parseError) {
            console.log(`❌ Failed to parse response from ${testUrl}:`, parseError);
            continue; // Not valid JSON, try next path
          }

          // Validate that this looks like an OpenAPI spec
          if (spec && (spec.openapi || spec.swagger || (spec.paths && typeof spec.paths === 'object'))) {
            console.log(`✅ Found valid OpenAPI spec at ${testUrl}`);
            console.log('📋 Spec info:', {
              title: spec.info?.title,
              version: spec.info?.version,
              pathCount: Object.keys(spec.paths || {}).length
            });
            
            discoveredSpec = spec;
            discoveredUrl = testUrl;
            setDiscoveryProgress(`Found OpenAPI spec at ${path}!`);
            break;
          } else {
            console.log(`❌ Invalid OpenAPI spec at ${testUrl}:`, spec);
          }
        }
      } catch (error) {
        console.log(`❌ Failed to fetch from ${baseUrl}${path}:`, error.message);
        // Continue to next path
      }
    }

    if (!discoveredSpec) {
      setDiscoveryProgress('Attempting direct API exploration...');
      
      // Try to explore the API directly by making a request to common endpoints
      const explorationEndpoints = ['/', '/api', '/v1', '/api/v1', '/health', '/status', '/docs', '/swagger'];
      
      for (const endpoint of explorationEndpoints) {
        try {
          const testUrl = `${baseUrl}${endpoint}`;
          setDiscoveryProgress(`Exploring ${endpoint}...`);
          
          const response = await fetchWithTimeout(testUrl, {
            method: 'GET',
          }, 5000);

          if (response.ok) {
            const responseText = await response.text();
            
            // Check if response contains links to documentation
            const docLinks = extractDocumentationLinks(responseText, baseUrl);
            
            if (docLinks.length > 0) {
              setDiscoveryProgress(`Found potential documentation links...`);
              
              // Try the discovered documentation links
              for (const docLink of docLinks) {
                try {
                  const docResponse = await fetchWithTimeout(docLink, {
                    method: 'GET',
                  }, 5000);
                  
                  if (docResponse.ok) {
                    const docSpec = await docResponse.json();
                    if (docSpec && (docSpec.openapi || docSpec.swagger || docSpec.paths)) {
                      discoveredSpec = docSpec;
                      discoveredUrl = docLink;
                      setDiscoveryProgress(`Found OpenAPI spec via exploration!`);
                      break;
                    }
                  }
                } catch {
                  // Continue to next link
                }
              }
              
              if (discoveredSpec) break;
            }
          }
        } catch {
          // Continue to next endpoint
        }
      }
    }

    if (!discoveredSpec) {
      // Final attempt: try to create a basic spec from manual exploration
      setDiscoveryProgress('Creating basic API structure...');
      
      try {
        const basicSpec = await createBasicAPISpec(baseUrl);
        if (basicSpec.endpoints.length > 0) {
          return {
            method: 'url',
            url: baseUrl,
            discoveredUrl: baseUrl,
            ...basicSpec
          };
        }
      } catch (error) {
        console.log('Basic API exploration failed:', error);
      }

      throw new Error(`Could not find OpenAPI specification at ${baseUrl}. 

Tried the following paths:
${commonPaths.slice(0, 10).map(p => `• ${baseUrl}${p}`).join('\n')}
...and ${commonPaths.length - 10} more paths.

Please ensure:
1. The API has OpenAPI/Swagger documentation available
2. The documentation is publicly accessible
3. CORS is enabled for the documentation endpoint
4. Or provide the direct URL to your OpenAPI JSON file

Common examples that work:
• https://jsonplaceholder.typicode.com (has no OpenAPI spec, but we can explore)
• https://petstore.swagger.io/v2 (has OpenAPI spec at /swagger.json)
• https://api.github.com (GitHub API - we can explore basic structure)`);
    }

    setDiscoveryProgress('Parsing API specification...');
    const apiData = parseOpenAPISpec(discoveredSpec);
    
    // Store discovered endpoints for preview
    setDiscoveredEndpoints(apiData.endpoints);
    
    setDiscoveryProgress(`Successfully discovered ${apiData.endpoints.length} endpoints!`);
    
    return {
      method: 'url',
      url: baseUrl,
      discoveredUrl,
      ...apiData
    };
  };

  const extractDocumentationLinks = (html: string, baseUrl: string): string[] => {
    const links: string[] = [];
    
    // Common patterns for documentation links
    const patterns = [
      /href=["']([^"']*(?:swagger|openapi|docs|api-docs)[^"']*)["']/gi,
      /["']([^"']*\/(?:swagger|openapi|docs|api-docs)[^"']*)["']/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        let link = match[1];
        
        // Convert relative URLs to absolute
        if (link.startsWith('/')) {
          link = baseUrl + link;
        } else if (!link.startsWith('http')) {
          link = baseUrl + '/' + link;
        }
        
        if (!links.includes(link)) {
          links.push(link);
        }
      }
    });
    
    return links;
  };

  const createBasicAPISpec = async (baseUrl: string) => {
    // For APIs without OpenAPI specs, try to discover basic endpoints
    // This is particularly useful for simple REST APIs like JSONPlaceholder
    
    const commonEndpoints = [
      { path: '/posts', method: 'GET', description: 'Get all posts' },
      { path: '/posts/1', method: 'GET', description: 'Get post by ID' },
      { path: '/users', method: 'GET', description: 'Get all users' },
      { path: '/users/1', method: 'GET', description: 'Get user by ID' },
      { path: '/comments', method: 'GET', description: 'Get all comments' },
      { path: '/albums', method: 'GET', description: 'Get all albums' },
      { path: '/photos', method: 'GET', description: 'Get all photos' },
      { path: '/todos', method: 'GET', description: 'Get all todos' },
      { path: '/products', method: 'GET', description: 'Get all products' },
      { path: '/items', method: 'GET', description: 'Get all items' },
      { path: '/data', method: 'GET', description: 'Get data' },
      { path: '/api/posts', method: 'GET', description: 'Get all posts (API)' },
      { path: '/api/users', method: 'GET', description: 'Get all users (API)' },
      { path: '/v1/posts', method: 'GET', description: 'Get all posts (v1)' },
      { path: '/v1/users', method: 'GET', description: 'Get all users (v1)' },
    ];

    const discoveredEndpoints = [];
    
    for (const endpoint of commonEndpoints) {
      try {
        const testUrl = `${baseUrl}${endpoint.path}`;
        setDiscoveryProgress(`Testing ${endpoint.path}...`);
        
        const response = await fetchWithTimeout(testUrl, {
          method: endpoint.method,
        }, 3000);

        if (response.ok) {
          // Try to analyze the response to understand the data structure
          let responseData = null;
          try {
            responseData = await response.json();
          } catch {
            // Not JSON, but endpoint exists
          }

          const endpointDef = {
            id: `${endpoint.method}_${endpoint.path}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            path: endpoint.path,
            method: endpoint.method,
            description: endpoint.description,
            parameters: [],
            responses: [{
              statusCode: response.status,
              description: `Response ${response.status}`,
              schema: responseData ? { type: 'object' } : null
            }],
            tags: [],
            baseUrl: baseUrl
          };

          // Add common parameters based on endpoint patterns
          if (endpoint.path.includes('/1') || endpoint.path.includes('{id}')) {
            endpointDef.parameters.push({
              name: 'id',
              type: 'integer',
              required: true,
              description: 'Resource ID',
              location: 'path',
              example: 1
            });
          }

          // For list endpoints, add common query parameters
          if (!endpoint.path.includes('/1') && !endpoint.path.includes('{id}')) {
            endpointDef.parameters.push(
              {
                name: '_limit',
                type: 'integer',
                required: false,
                description: 'Limit the number of results',
                location: 'query',
                example: 10
              },
              {
                name: '_page',
                type: 'integer',
                required: false,
                description: 'Page number for pagination',
                location: 'query',
                example: 1
              }
            );

            // Add filtering parameters based on endpoint type
            if (endpoint.path.includes('posts')) {
              endpointDef.parameters.push({
                name: 'userId',
                type: 'integer',
                required: false,
                description: 'Filter posts by user ID',
                location: 'query',
                example: 1
              });
            }
          }

          discoveredEndpoints.push(endpointDef);
          console.log(`✅ Discovered working endpoint: ${endpoint.method} ${endpoint.path}`);
          
        } else if (response.status === 401 || response.status === 403) {
          // Even if we get auth errors, the endpoint exists
          discoveredEndpoints.push({
            id: `${endpoint.method}_${endpoint.path}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            path: endpoint.path,
            method: endpoint.method,
            description: endpoint.description + ' (requires authentication)',
            parameters: [],
            responses: [{
              statusCode: response.status,
              description: `Response ${response.status} - Authentication required`,
              schema: null
            }],
            tags: ['auth-required'],
            baseUrl: baseUrl
          });
          console.log(`🔒 Found protected endpoint: ${endpoint.method} ${endpoint.path}`);
        }
      } catch {
        // Endpoint doesn't exist or is not accessible
        console.log(`❌ Endpoint not accessible: ${endpoint.method} ${endpoint.path}`);
      }
    }

    // If we found endpoints, also add common write operations
    if (discoveredEndpoints.length > 0) {
      const writeEndpoints = [
        { path: '/posts', method: 'POST', description: 'Create a new post' },
        { path: '/posts/1', method: 'PUT', description: 'Update a post' },
        { path: '/posts/1', method: 'DELETE', description: 'Delete a post' },
        { path: '/users', method: 'POST', description: 'Create a new user' },
        { path: '/users/1', method: 'PUT', description: 'Update a user' },
        { path: '/users/1', method: 'DELETE', description: 'Delete a user' },
      ];

      for (const writeEndpoint of writeEndpoints) {
        const endpointDef = {
          id: `${writeEndpoint.method}_${writeEndpoint.path}`.replace(/[^a-zA-Z0-9_]/g, '_'),
          path: writeEndpoint.path,
          method: writeEndpoint.method,
          description: writeEndpoint.description,
          parameters: [],
          responses: [{
            statusCode: 201,
            description: 'Created successfully',
            schema: { type: 'object' }
          }],
          tags: [],
          baseUrl: baseUrl
        };

        // Add parameters for write operations
        if (writeEndpoint.method === 'POST' && writeEndpoint.path.includes('posts')) {
          endpointDef.parameters.push(
            {
              name: 'title',
              type: 'string',
              required: true,
              description: 'Post title',
              location: 'body',
              example: 'My New Post'
            },
            {
              name: 'body',
              type: 'string',
              required: true,
              description: 'Post content',
              location: 'body',
              example: 'This is the content of my post'
            },
            {
              name: 'userId',
              type: 'integer',
              required: true,
              description: 'User ID of the author',
              location: 'body',
              example: 1
            }
          );
        }

        if (writeEndpoint.path.includes('/1') || writeEndpoint.path.includes('{id}')) {
          endpointDef.parameters.push({
            name: 'id',
            type: 'integer',
            required: true,
            description: 'Resource ID',
            location: 'path',
            example: 1
          });
        }

        discoveredEndpoints.push(endpointDef);
      }
    }

    return {
      info: {
        title: 'Discovered API',
        version: '1.0.0',
        description: `API discovered from ${baseUrl} - ${discoveredEndpoints.length} endpoints found`
      },
      servers: [{ url: baseUrl }],
      endpoints: discoveredEndpoints,
      security: [],
      components: {}
    };
  };

  const handleUrlSubmit = async () => {
    if (!apiUrl.trim()) {
      setError('Please enter a valid API URL');
      return;
    }

    setLoading(true);
    setError(null);
    setDiscoveryProgress('');
    setDiscoveredEndpoints([]);

    try {
      const apiData = await discoverAPIFromURL(apiUrl);
      
      // Add a small delay to show the success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onNext(apiData);
    } catch (error) {
      console.error('API discovery failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to discover API endpoints');
      setDiscoveryProgress('');
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

  // Clear error when switching input methods
  const handleInputMethodChange = (method: 'upload' | 'url' | 'manual') => {
    setInputMethod(method);
    setError(null);
    setDiscoveryProgress('');
    setDiscoveredEndpoints([]);
    setUploadedFile(null);
    setApiUrl('');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Import Your API
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto">
          Choose how you'd like to import your API. We'll analyze your endpoints and help you map them to MCP tools and resources.
        </p>
      </motion.div>

      {/* Input Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {inputMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = inputMethod === method.id;
          
          return (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="cursor-pointer"
              onClick={() => handleInputMethodChange(method.id as 'upload' | 'url' | 'manual')}
            >
              <Card 
                className={`transition-all duration-200 ${
                  isSelected 
                    ? 'border-blue-500 shadow-md bg-blue-50' 
                    : 'hover:shadow-sm hover:border-gray-300 border-gray-200'
                }`}
              >
                <CardContent className="p-4 text-center">
                  <div className="relative mb-3">
                    <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {method.recommended && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        Recommended
                      </div>
                    )}
                  </div>
                  <h3 className={`font-semibold mb-1 text-sm transition-colors ${
                    isSelected ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {method.title}
                  </h3>
                  <p className={`text-xs transition-colors ${
                    isSelected ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {method.description}
                  </p>
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
          className="mb-4"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 mb-2">Discovery Failed</h4>
                <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Discovery Progress */}
      {loading && discoveryProgress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Discovering API</h4>
                <p className="text-sm text-blue-700">{discoveryProgress}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Discovered Endpoints Preview */}
      {discoveredEndpoints.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-2">
                  Successfully discovered {discoveredEndpoints.length} endpoints!
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {discoveredEndpoints.slice(0, 8).map((endpoint, index) => (
                    <div key={index} className="text-xs bg-white rounded p-2 border border-green-200">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                        endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                        endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="text-gray-700">{endpoint.path}</span>
                    </div>
                  ))}
                  {discoveredEndpoints.length > 8 && (
                    <div className="text-xs text-green-700 italic">
                      ...and {discoveredEndpoints.length - 8} more endpoints
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Input Form Based on Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">
            {inputMethods.find(m => m.id === inputMethod)?.title}
          </h2>
        </CardHeader>
        <CardContent className="p-4">
          {inputMethod === 'upload' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
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
                      <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                      <p className="text-base font-medium text-green-700 mb-1">
                        File uploaded successfully!
                      </p>
                      <p className="text-sm text-green-600 mb-3">
                        {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mb-3" />
                      <p className="text-base font-medium text-gray-700 mb-1">
                        {isDragActive ? 'Drop your file here' : 'Drag & drop your OpenAPI file'}
                      </p>
                      <p className="text-sm text-gray-500 mb-3">
                        Supports JSON format (YAML support coming soon)
                      </p>
                    </>
                  )}
                  <Button variant="outline" type="button" size="sm">
                    Choose File
                  </Button>
                </div>
              </div>
              
              {uploadedFile && (
                <Button 
                  onClick={handleFileUpload} 
                  loading={loading}
                  className="w-full"
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
            <div className="space-y-4">
              <Input
                label="API Base URL"
                placeholder="https://api.example.com or https://jsonplaceholder.typicode.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                icon={<Globe className="w-4 h-4" />}
              />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2 text-sm">How URL Discovery Works</h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p>We'll automatically discover your API by checking common documentation paths:</p>
                      <div className="grid grid-cols-2 gap-1 text-xs font-mono bg-blue-100 p-2 rounded">
                        <div>/swagger.json</div>
                        <div>/openapi.json</div>
                        <div>/api-docs</div>
                        <div>/docs/swagger.json</div>
                        <div>/v1/swagger.json</div>
                        <div>/api/v1/swagger.json</div>
                      </div>
                      <p className="text-xs">If no OpenAPI spec is found, we'll attempt basic endpoint discovery.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Zap className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1 text-sm">Try These Examples</h4>
                    <div className="space-y-1">
                      {[
                        'https://jsonplaceholder.typicode.com',
                        'https://petstore.swagger.io/v2',
                        'https://api.github.com'
                      ].map((example, index) => (
                        <button
                          key={index}
                          onClick={() => setApiUrl(example)}
                          className="block text-xs text-green-700 hover:text-green-900 hover:underline font-mono"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleUrlSubmit} 
                loading={loading}
                disabled={!apiUrl.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {discoveryProgress || 'Discovering API Endpoints...'}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Discover API Endpoints
                  </>
                )}
              </Button>
            </div>
          )}

          {inputMethod === 'manual' && (
            <div className="text-center py-6">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Manual API Definition
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                This feature will allow you to manually define your API endpoints.
              </p>
              <Button variant="outline" disabled size="sm">
                Coming Soon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};