# API-to-MCP Generator

![API-to-MCP Banner](https://img.shields.io/badge/API--to--MCP-Production%20Ready-blue?style=for-the-badge&logo=typescript)

A sophisticated web application that automatically generates production-ready **Model Context Protocol (MCP)** servers from any API specification. Features an advanced **Enhanced AI System** with context-aware chained prompting for intelligent API interaction.

## 🌟 Key Features

### 🔄 **Automatic MCP Server Generation**
- **Multi-Format Support**: REST APIs, OpenAPI specs, GraphQL endpoints
- **Dynamic Tool Discovery**: Automatically converts API endpoints to MCP tools
- **Production-Ready Code**: TypeScript/Python with error handling and validation
- **Real-Time Generation**: Live code preview with syntax highlighting

### 🧠 **Enhanced AI System**
- **Context-Aware Chained Prompting**: Multi-step reasoning for complex queries
- **Intelligent Tool Selection**: AI-powered scoring and selection of appropriate MCP tools
- **Response Synthesis**: Clean, natural responses from multiple data sources
- **Search & Analysis**: Advanced query processing with term extraction and filtering
- **Session Management**: Persistent conversation context with user profiling

### 🛠 **Interactive Testing Environment**
- **Live MCP Server**: Run generated servers in WebContainer
- **Tool Testing Interface**: Interactive parameter input and execution
- **Enhanced Chat Interface**: Natural language interaction with discovered tools
- **Real-Time Debugging**: Comprehensive logging and error tracking
- **Performance Monitoring**: Response times and success metrics

### 🎨 **Modern User Experience**
- **Visual API Mapping**: Interactive endpoint visualization
- **Responsive Design**: Works seamlessly across all devices
- **Real-Time Updates**: Live server status and tool discovery
- **Clean Interface**: Intuitive navigation with smooth animations

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Modern browser** with WebContainer support
- **Hugging Face API Key** (optional, for enhanced AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/API-to-MCP.git
cd API-to-MCP

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 How It Works

### 1. **API Input & Analysis**
```typescript
// Input any API format
const apiSpec = {
  baseUrl: "https://jsonplaceholder.typicode.com",
  endpoints: [
    { method: "GET", path: "/posts", description: "Get all posts" },
    { method: "POST", path: "/posts", description: "Create post" }
  ]
};
```

### 2. **MCP Server Generation**
The system automatically generates production-ready MCP servers:

```typescript
// Generated MCP tool example
{
  name: "get_all_posts",
  description: "Retrieve all posts from the API",
  inputSchema: {
    type: "object",
    properties: {
      "_limit": { type: "string", description: "Limit number of results" },
      "userId": { type: "string", description: "Filter by user ID" }
    }
  }
}
```

### 3. **Enhanced AI Interaction**
```typescript
// Natural language queries
"Can you check how many posts have the word 'test' in them?"

// AI processes with:
// 1. Query complexity analysis
// 2. Context retrieval
// 3. Tool selection & scoring
// 4. Response synthesis
// 5. Clean output generation
```

## 🧠 Enhanced AI System Architecture

### **Context Store**
- **Conversation Management**: Persistent chat history with relevance scoring
- **User Profiling**: Adaptive responses based on user preferences
- **Domain Knowledge**: Semantic indexing of API concepts and relationships
- **Context Compression**: Intelligent summarization for long conversations

### **Prompt Chain Orchestrator**
```typescript
interface PromptChain {
  complexity: 'simple' | 'medium' | 'complex';
  steps: PromptStep[];
  dependencies: string[];
  execution: 'parallel' | 'sequential';
}
```

### **Response Synthesis Engine**
- **Multi-Source Integration**: Combines MCP tool results with context
- **Contradiction Resolution**: Detects and resolves conflicting information
- **Artifact Removal**: Strips system metadata and debug information
- **Natural Language Generation**: Configurable tone and verbosity

### **Intelligent Tool Selection**
```typescript
// Tool scoring algorithm
const score = 
  directNameMatch * 10 +
  actionMatch * 8 +
  searchQueryBonus * 12 +
  descriptionMatch * 2 -
  complexityPenalty * 5;
```

## 🛠 API Integration Examples

### **REST API Example**
```json
{
  "baseUrl": "https://api.example.com",
  "endpoints": [
    {
      "method": "GET",
      "path": "/users/{id}",
      "description": "Get user by ID",
      "parameters": {
        "id": { "type": "string", "required": true }
      }
    }
  ]
}
```

### **GraphQL Example**
```graphql
query GetPosts($limit: Int, $userId: ID) {
  posts(limit: $limit, userId: $userId) {
    id
    title
    body
    user {
      name
      email
    }
  }
}
```

### **OpenAPI 3.0 Support**
```yaml
openapi: 3.0.0
info:
  title: Example API
  version: 1.0.0
paths:
  /posts:
    get:
      summary: List posts
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
```

## 🎯 Enhanced AI Usage Examples

### **Search & Analysis**
```typescript
// User Query
"How many posts contain the word 'technology'?"

// AI Response
"I searched through 100 posts using the get_all_posts tool.

Found 12 posts containing 'technology':
• Modern Technology Trends - The future of tech innovation...
• Technology in Education - How digital tools transform...
• Green Technology Solutions - Sustainable tech approaches...

...and 9 more posts."
```

### **Complex Data Operations**
```typescript
// User Query
"Get the latest 5 posts from user ID 1 and tell me their topics"

// AI Process
1. Selects get_all_posts tool
2. Applies userId filter and limit
3. Analyzes post content for topics
4. Synthesizes natural response
```

### **Interactive Debugging**
```typescript
// User Query
"Why did the create post request fail?"

// AI Response
"The create_post tool failed because the 'title' parameter is required 
but wasn't provided. Here's the correct format:

{
  "title": "Your post title",
  "body": "Post content", 
  "userId": 1
}"
```

## 🔧 Configuration

### **Environment Variables**
```bash
# Optional: Hugging Face API key for enhanced AI
VITE_HF_API_KEY=hf_your_api_key_here

# Optional: Custom model selection
VITE_DEFAULT_MODEL=meta-llama/Llama-3.3-70B-Instruct
```

### **Enhanced AI Configuration**
```typescript
const enhancedConfig: EnhancedMCPConfig = {
  llmProvider: 'huggingface',
  enableChaining: true,
  enableContextManagement: true,
  maxResponseTime: 60000,
  synthesisConfig: {
    style: {
      tone: 'professional',
      verbosity: 'moderate',
      includeExamples: true
    },
    filterSystemInfo: true,
    personalizeForUser: true
  }
};
```

## 📊 Monitoring & Analytics

### **Performance Metrics**
- **Response Times**: Track tool execution and AI processing speed
- **Success Rates**: Monitor tool call success and error patterns
- **User Engagement**: Analyze query patterns and feature usage
- **Context Efficiency**: Measure context compression and relevance scoring

### **Debug Console**
- **Real-Time Logging**: Live server output and MCP communication
- **Tool Execution Traces**: Detailed execution paths and timings
- **Error Tracking**: Comprehensive error reporting with stack traces
- **Context Visualization**: View conversation context and user profiles

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API-to-MCP Generator                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                             │
│  ├── API Input Form                                        │
│  ├── Code Generator                                        │
│  ├── Enhanced Chat Interface                               │
│  ├── Tool Testing Environment                              │
│  └── Visual Mapper                                         │
├─────────────────────────────────────────────────────────────┤
│  Enhanced AI System                                        │
│  ├── Context Store (Conversation Management)               │
│  ├── Prompt Chain Orchestrator (Multi-step Reasoning)     │
│  ├── Response Synthesis Engine (Clean Output)             │
│  └── Enhanced MCP Integration (Orchestration)             │
├─────────────────────────────────────────────────────────────┤
│  WebContainer Runtime                                      │
│  ├── Generated MCP Server (TypeScript/Python)             │
│  ├── Dynamic Tool Discovery                               │
│  ├── JSON-RPC Communication                               │
│  └── Real-time Execution                                  │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                            │
│  ├── Target APIs (REST/GraphQL/OpenAPI)                   │
│  ├── Hugging Face Models (Optional)                       │
│  └── LLM Providers (Configurable)                         │
└─────────────────────────────────────────────────────────────┘
```

## 🔬 Advanced Features

### **Dynamic Code Generation**
- **Multi-Language Support**: TypeScript and Python generators
- **Template System**: Customizable code templates
- **Error Handling**: Robust error handling and validation
- **Type Safety**: Full TypeScript support with proper typing

### **WebContainer Integration**
- **Sandboxed Execution**: Secure server execution in browser
- **Real-Time Communication**: Live bidirectional JSON-RPC
- **Hot Reloading**: Instant code updates without restart
- **Resource Management**: Efficient memory and CPU usage

### **Tool Testing Suite**
- **Parameter Validation**: Schema-based input validation
- **Response Formatting**: Clean, readable response display
- **Error Handling**: Graceful error reporting and recovery
- **Performance Monitoring**: Response time tracking

## 📝 API Reference

### **Generated MCP Tools**
```typescript
interface MCPTool {
  name: string;           // Tool identifier (e.g., "get_all_posts")
  description: string;    // Human-readable description
  inputSchema: {          // JSON Schema for parameters
    type: "object";
    properties: Record<string, SchemaProperty>;
    required?: string[];
  };
}
```

### **Enhanced AI Methods**
```typescript
class EnhancedMCPIntegration {
  async processQuery(
    userMessage: string,
    conversationHistory?: ChatMessage[]
  ): Promise<string>;
  
  async getSessionStats(): Promise<SessionStats>;
  async updateUserPreferences(preferences: UserPreferences): Promise<void>;
  async clearSession(): Promise<void>;
}
```

### **Context Management**
```typescript
interface ConversationContext {
  id: string;
  messages: ContextMessage[];
  userProfile: UserProfile;
  sessionState: SessionState;
  domainKnowledge: DomainKnowledge[];
}
```

## 🧪 Testing

### **Unit Tests**
```bash
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e       # End-to-end tests
```

### **Tool Testing**
1. **Manual Testing**: Use the interactive tool testing interface
2. **Automated Testing**: Comprehensive test suite for all generated tools
3. **Performance Testing**: Load testing for high-volume scenarios

## 🚢 Deployment

### **Development**
```bash
npm run dev            # Development server
npm run build          # Production build
npm run preview        # Preview production build
```

### **Production Deployment**
```bash
# Build for production
npm run build

# Deploy to your preferred platform
# - Vercel: vercel deploy
# - Netlify: netlify deploy
# - AWS: aws s3 sync dist/ s3://your-bucket
```

### **Docker Support**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Setup**
```bash
git clone https://github.com/yourusername/API-to-MCP.git
cd API-to-MCP
npm install
npm run dev
```

### **Code Style**
- **TypeScript**: Strict mode enabled
- **ESLint**: Comprehensive linting rules
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Model Context Protocol (MCP)** - Anthropic's protocol for AI-tool integration
- **WebContainer** - StackBlitz's browser-based runtime
- **Hugging Face** - AI model hosting and inference
- **React** & **TypeScript** - Modern web development framework

## 📞 Support

- **Documentation**: [Full documentation](https://your-docs-site.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/API-to-MCP/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/API-to-MCP/discussions)
- **Email**: support@api-to-mcp.com

## 🔮 Roadmap

### **Upcoming Features**
- [ ] **Multi-LLM Support**: OpenAI, Anthropic, and local models
- [ ] **Advanced Analytics**: Usage patterns and optimization suggestions
- [ ] **Team Collaboration**: Shared workspaces and version control
- [ ] **API Marketplace**: Community-shared API specifications
- [ ] **Enterprise Features**: SSO, audit logs, and compliance tools

### **Version History**
- **v2.0.0** - Enhanced AI System with context-aware chained prompting
- **v1.5.0** - WebContainer integration and live testing
- **v1.0.0** - Initial release with basic MCP server generation

---

<div align="center">

**Built with ❤️ for the AI development community**

[![GitHub Stars](https://img.shields.io/github/stars/yourusername/API-to-MCP?style=social)](https://github.com/yourusername/API-to-MCP)
[![Twitter Follow](https://img.shields.io/twitter/follow/yourhandle?style=social)](https://twitter.com/yourhandle)

</div>