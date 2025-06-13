import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Code, Settings, Zap, HelpCircle, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';
import Editor from '@monaco-editor/react';
import { CustomMethod } from '../../types';

interface CustomMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customMethod: CustomMethod) => void;
  existingMethods: string[];
}

export const CustomMethodModal: React.FC<CustomMethodModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingMethods
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [path, setPath] = useState('');
  const [implementation, setImplementation] = useState(`async def search_in_data(data, query, search_fields):
    """Helper function to search in data"""
    query_lower = query.lower()
    results = []

    print(f"🔍 Searching for: '{query_lower}' in fields: {search_fields}")
    print(f"📊 Total items to search: {len(data)}")

    for item in data:
        for field in search_fields:
            if field in item and item[field]:
                field_value = str(item[field]).lower()
                if query_lower in field_value:
                    print(f"✅ Match found in {field}: '{field_value[:50]}...'")
                    results.append(item)
                    break  # Avoid duplicates if multiple fields match

    print(f"🎯 Total matches found: {len(results)}")
    return results

async def custom_method(arguments):
    """Custom method implementation"""
    query = arguments.get('query', '')
    filters = arguments.get('filters', {})
    
    # Extract search parameters
    resource_types = filters.get('types', ['posts', 'users', 'comments'])
    limit = filters.get('limit', 5)
    
    search_results = {}
    
    # Search in posts
    if "posts" in resource_types:
        posts_response = await client.get("/posts")
        posts_response.raise_for_status()
        posts_data = posts_response.json()
        
        # Search in title and body fields
        found_posts = await search_in_data(posts_data, query, ["title", "body"])
        search_results["posts"] = found_posts[:limit]
    
    # Search in users
    if "users" in resource_types:
        users_response = await client.get("/users")
        users_response.raise_for_status()
        users_data = users_response.json()
        
        # Search in name, username, email fields
        found_users = await search_in_data(users_data, query, ["name", "username", "email"])
        search_results["users"] = found_users[:limit]
    
    # Add search metadata
    total_results = sum(len(results) for results in search_results.values())
    response_data = {
        "query": query,
        "total_results": total_results,
        "searched_types": resource_types,
        "results": search_results
    }

    return response_data`);
  const [inputSchema, setInputSchema] = useState(`{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string"
    },
    "filters": {
      "type": "object",
      "description": "Additional search filters",
      "properties": {
        "types": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["posts", "users", "comments", "albums"]
          },
          "description": "Resource types to search in",
          "default": ["posts", "users", "comments"]
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 5,
          "description": "Maximum results per resource type"
        }
      }
    }
  },
  "required": ["query"]
}`);
  const [errors, setErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const validateForm = () => {
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push('Method name is required');
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      newErrors.push('Method name must be a valid identifier (letters, numbers, underscores only)');
    } else if (existingMethods.includes(name)) {
      newErrors.push('A method with this name already exists');
    }

    if (!description.trim()) {
      newErrors.push('Description is required');
    }

    try {
      JSON.parse(inputSchema);
    } catch (e) {
      newErrors.push('Input schema must be valid JSON');
    }

    if (!implementation.trim()) {
      newErrors.push('Implementation code is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const customMethod: CustomMethod = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      inputSchema: JSON.parse(inputSchema),
      implementation: implementation.trim(),
      method,
      path: path.trim() || undefined,
      createdAt: new Date()
    };

    onSave(customMethod);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setMethod('GET');
    setPath('');
    setImplementation(`async def search_in_data(data, query, search_fields):
    """Helper function to search in data"""
    query_lower = query.lower()
    results = []

    print(f"🔍 Searching for: '{query_lower}' in fields: {search_fields}")
    print(f"📊 Total items to search: {len(data)}")

    for item in data:
        for field in search_fields:
            if field in item and item[field]:
                field_value = str(item[field]).lower()
                if query_lower in field_value:
                    print(f"✅ Match found in {field}: '{field_value[:50]}...'")
                    results.append(item)
                    break  # Avoid duplicates if multiple fields match

    print(f"🎯 Total matches found: {len(results)}")
    return results

async def custom_method(arguments):
    """Custom method implementation"""

    # --- START: THE FIX ---
    query = arguments.get('query', '').strip()
    filters = arguments.get('filters', {})

    # If the query is empty after stripping whitespace, return an empty result immediately.
    if not query:
        empty_response = {
            "query": "",
            "total_results": 0,
            "searched_types": filters.get('types', []),
            "results": {}
        }
        return empty_response
    # --- END: THE FIX ---

    # Extract search parameters
    resource_types = filters.get('types', ['posts', 'users', 'comments'])
    limit = filters.get('limit', 5)

    search_results = {}

    # Search in posts
    if "posts" in resource_types:
        posts_response = await client.get("/posts")
        posts_response.raise_for_status()
        posts_data = posts_response.json()

        # Search in title and body fields
        found_posts = await search_in_data(posts_data, query, ["title", "body"])
        search_results["posts"] = found_posts[:limit]

    # Search in users
    if "users" in resource_types:
        users_response = await client.get("/users")
        users_response.raise_for_status()
        users_data = users_response.json()

        # Search in name, username, email fields
        found_users = await search_in_data(users_data, query, ["name", "username", "email"])
        search_results["users"] = found_users[:limit]

    # Add search metadata
    total_results = sum(len(results) for results in search_results.values())
    response_data = {
        "query": query,
        "total_results": total_results,
        "searched_types": resource_types,
        "results": search_results
    }

    return response_data`);
    setInputSchema(`{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string"
    },
    "filters": {
      "type": "object",
      "description": "Additional search filters",
      "properties": {
        "types": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["posts", "users", "comments", "albums"]
          },
          "description": "Resource types to search in",
          "default": ["posts", "users", "comments"]
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 5,
          "description": "Maximum results per resource type"
        }
      }
    }
  },
  "required": ["query"]
}`);
    setErrors([]);
    setShowAdvanced(false);
    onClose();
  };

  const templateExamples = [
    {
      name: 'Advanced Search',
      description: 'Search through multiple endpoints with filtering and aggregation',
      implementation: `async def search_in_data(data, query, search_fields):
    """Helper function to search in data"""
    query_lower = query.lower()
    results = []

    for item in data:
        for field in search_fields:
            if field in item and item[field] and query_lower in str(item[field]).lower():
                results.append(item)
                break  # Avoid duplicates if multiple fields match

    return results

async def advanced_search(arguments):
    """Search through API data with custom filtering"""
    query = arguments.get('query', '')
    filters = arguments.get('filters', {})

    # Extract search parameters
    resource_types = filters.get('types', ['posts', 'users', 'comments'])
    limit = filters.get('limit', 5)

    search_results = {}

    # Search in posts
    if "posts" in resource_types:
        posts_response = await client.get("/posts")
        posts_response.raise_for_status()
        posts_data = posts_response.json()

        # Search in title and body fields
        found_posts = await search_in_data(posts_data, query, ["title", "body"])
        search_results["posts"] = found_posts[:limit]

    # Search in users
    if "users" in resource_types:
        users_response = await client.get("/users")
        users_response.raise_for_status()
        users_data = users_response.json()

        # Search in name, username, email fields
        found_users = await search_in_data(users_data, query, ["name", "username", "email"])
        search_results["users"] = found_users[:limit]

    # Search in comments
    if "comments" in resource_types:
        comments_response = await client.get("/comments")
        comments_response.raise_for_status()
        comments_data = comments_response.json()

        # Search in name, email, body fields
        found_comments = await search_in_data(comments_data, query, ["name", "email", "body"])
        search_results["comments"] = found_comments[:limit]

    # Search in albums
    if "albums" in resource_types:
        albums_response = await client.get("/albums")
        albums_response.raise_for_status()
        albums_data = albums_response.json()

        # Search in title field
        found_albums = await search_in_data(albums_data, query, ["title"])
        search_results["albums"] = found_albums[:limit]

    # Add search metadata
    total_results = sum(len(results) for results in search_results.values())
    response_data = {
        "query": query,
        "total_results": total_results,
        "searched_types": resource_types,
        "results": search_results
    }

    }`,
      schema: `{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query string"
    },
    "filters": {
      "type": "object",
      "description": "Additional search filters",
      "properties": {
        "types": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["posts", "users", "comments", "albums"]
          },
          "description": "Resource types to search in",
          "default": ["posts", "users", "comments"]
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 5,
          "description": "Maximum results per resource type"
        }
      }
    }
  },
  "required": ["query"]
}`
    },
    {
      name: 'Bulk Operations',
      description: 'Perform operations on multiple items with detailed reporting',
      implementation: `async def bulk_operation(arguments):
    """Perform bulk operations on multiple items"""
    items = arguments.get('items', [])
    operation = arguments.get('operation', 'update')

    results = []
    successful = 0
    failed = 0

    for item in items:
        try:
            if operation == 'update':
                response = await client.put(f"/posts/{item['id']}", json=item)
            elif operation == 'delete':
                response = await client.delete(f"/posts/{item['id']}")
            elif operation == 'create':
                response = await client.post("/posts", json=item)
            else:
                raise ValueError(f"Unknown operation: {operation}")

            response.raise_for_status()
            results.append({
                'id': item.get('id'),
                'status': 'success',
                'data': response.json()
            })
            successful += 1
        except Exception as e:
            results.append({
                'id': item.get('id'),
                'status': 'error',
                'error': str(e)
            })
            failed += 1

    response_data = {
        'operation': operation,
        'total_processed': len(items),
        'successful': successful,
        'failed': failed,
        'results': results
    }

    return response_data`,
      schema: `{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "description": "Array of items to process",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "integer"},
          "title": {"type": "string"},
          "body": {"type": "string"},
          "userId": {"type": "integer"}
        }
      }
    },
    "operation": {
      "type": "string",
      "enum": ["create", "update", "delete"],
      "description": "Operation to perform",
      "default": "update"
    }
  },
  "required": ["items", "operation"]
}`
    },
    {
      name: 'Data Analytics',
      description: 'Aggregate and analyze data across multiple endpoints',
      implementation: `async def analytics_method(arguments):
    """Analyze data across multiple endpoints"""
    metric = arguments.get('metric', 'summary')

    # Fetch all data
    posts_response = await client.get("/posts")
    posts_response.raise_for_status()
    posts_data = posts_response.json()

    users_response = await client.get("/users")
    users_response.raise_for_status()
    users_data = users_response.json()

    comments_response = await client.get("/comments")
    comments_response.raise_for_status()
    comments_data = comments_response.json()

    # Calculate metrics
    total_posts = len(posts_data)
    total_users = len(users_data)
    total_comments = len(comments_data)

    # Posts per user
    posts_per_user = {}
    for post in posts_data:
        user_id = post.get('userId')
        posts_per_user[user_id] = posts_per_user.get(user_id, 0) + 1

    # Comments per post
    comments_per_post = {}
    for comment in comments_data:
        post_id = comment.get('postId')
        comments_per_post[post_id] = comments_per_post.get(post_id, 0) + 1

    response_data = {
        'metric': metric,
        'totals': {
            'posts': total_posts,
            'users': total_users,
            'comments': total_comments
        },
        'averages': {
            'posts_per_user': total_posts / total_users if total_users > 0 else 0,
            'comments_per_post': total_comments / total_posts if total_posts > 0 else 0
        },
        'top_contributors': sorted(posts_per_user.items(), key=lambda x: x[1], reverse=True)[:5],
        'most_commented_posts': sorted(comments_per_post.items(), key=lambda x: x[1], reverse=True)[:5]
    }

    return response_data`,
      schema: `{
  "type": "object",
  "properties": {
    "metric": {
      "type": "string",
      "enum": ["summary", "detailed", "trends"],
      "description": "Type of analytics to return",
      "default": "summary"
    }
  }
}`
    }
  ];

  const applyTemplate = (template: typeof templateExamples[0]) => {
    setName(template.name.toLowerCase().replace(/\s+/g, '_'));
    setDescription(template.description);
    setImplementation(template.implementation);
    setInputSchema(template.schema);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Custom Method</h2>
                <p className="text-sm text-gray-600">Extend your API with custom functionality</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex h-[calc(90vh-200px)]">
            {/* Left Panel - Configuration */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Error Messages */}
                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Templates */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    <h3 className="font-medium text-gray-900">Templates</h3>
                  </div>
                  <div className="space-y-3">
                    {templateExamples.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => applyTemplate(template)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
                      >
                        <div className="font-medium text-sm text-gray-900 mb-1">{template.name}</div>
                        <div className="text-xs text-gray-600 line-clamp-2">{template.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Method Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., search_posts"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Use snake_case (letters, numbers, underscores only)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this method does..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Advanced Settings</span>
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          HTTP Method
                        </label>
                        <select
                          value={method}
                          onChange={(e) => setMethod(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                          <option value="PATCH">PATCH</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Path (optional)
                        </label>
                        <input
                          type="text"
                          value={path}
                          onChange={(e) => setPath(e.target.value)}
                          placeholder="e.g., /search"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Help */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Implementation Tips</span>
                  </div>
                  <ul className="text-xs text-blue-800 space-y-2">
                    <li>• Use <code className="bg-blue-100 px-1 rounded">await client.get("/endpoint")</code> for API calls</li>
                    <li>• Define helper functions at the top level</li>
                    <li>• Always assign final result to <code className="bg-blue-100 px-1 rounded">response_data</code></li>
                    <li>• Include error handling with try/except blocks</li>
                    <li>• Test your JSON schema for validity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Panel - Implementation */}
            <div className="flex-1 flex flex-col">
              <div className="flex border-b border-gray-200">
                <div className="flex-1 p-4 border-r border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Implementation</span>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Input Schema</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex">
                <div className="flex-1 border-r border-gray-200">
                  <Editor
                    height="100%"
                    language="python"
                    value={implementation}
                    onChange={(value) => setImplementation(value || '')}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      tabSize: 4,
                      insertSpaces: true,
                      folding: true,
                      lineHeight: 20
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Editor
                    height="100%"
                    language="json"
                    value={inputSchema}
                    onChange={(value) => setInputSchema(value || '')}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      tabSize: 2,
                      insertSpaces: true,
                      folding: true,
                      lineHeight: 20
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Create custom methods to extend your API beyond standard endpoints
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Plus className="w-4 h-4 mr-2" />
                Create Method
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};