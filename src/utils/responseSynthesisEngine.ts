/**
 * Advanced Response Synthesis Engine for MCP Systems
 * Combines multiple prompt outputs into coherent, natural responses
 */

import { ChainResult, ChainContext } from './promptChainOrchestrator';
import { ContextMessage } from './contextStore';

export interface SynthesisConfig {
  style: ResponseStyle;
  maxLength: number;
  includeConfidence: boolean;
  handleContradictions: boolean;
  filterSystemInfo: boolean;
  personalizeForUser: boolean;
}

export interface ResponseStyle {
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  verbosity: 'concise' | 'moderate' | 'detailed';
  structure: 'linear' | 'structured' | 'narrative';
  includeExamples: boolean;
}

export interface SynthesisResult {
  finalResponse: string;
  confidence: number;
  sources: SourceAttribution[];
  contradictions: Contradiction[];
  alternatives: string[];
  metadata: SynthesisMetadata;
}

export interface SourceAttribution {
  source: 'context' | 'mcp_tool' | 'reasoning' | 'synthesis';
  content: string;
  confidence: number;
  weight: number;
}

export interface Contradiction {
  sources: string[];
  description: string;
  resolution: string;
  confidence: number;
}

export interface SynthesisMetadata {
  processingTime: number;
  sourcesUsed: number;
  chainSteps: number;
  qualityScore: number;
  userPersonalization: boolean;
}

export interface ContentFragment {
  type: 'introduction' | 'main_content' | 'details' | 'examples' | 'conclusion';
  content: string;
  confidence: number;
  sources: string[];
  priority: number;
}

export class ResponseSynthesisEngine {
  private defaultConfig: SynthesisConfig = {
    style: {
      tone: 'friendly',
      verbosity: 'moderate',
      structure: 'structured',
      includeExamples: true
    },
    maxLength: 2000,
    includeConfidence: false,
    handleContradictions: true,
    filterSystemInfo: true,
    personalizeForUser: true
  };

  async synthesizeResponse(
    chainResults: ChainResult[],
    chainContext: ChainContext,
    config: Partial<SynthesisConfig> = {}
  ): Promise<SynthesisResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    // Filter and prepare content
    const validResults = this.filterValidResults(chainResults);
    const contentFragments = await this.extractContentFragments(validResults, chainContext);
    
    // Detect and resolve contradictions
    const contradictions = this.detectContradictions(contentFragments);
    const resolvedFragments = await this.resolveContradictions(contentFragments, contradictions);
    
    // Synthesize final response
    const synthesizedContent = await this.synthesizeContent(resolvedFragments, mergedConfig);
    const personalizedResponse = await this.personalizeResponse(synthesizedContent, chainContext, mergedConfig);
    const cleanedResponse = this.cleanAndFilter(personalizedResponse, mergedConfig);
    
    // Calculate confidence and quality
    const confidence = this.calculateOverallConfidence(validResults, contradictions);
    const qualityScore = this.calculateQualityScore(cleanedResponse, validResults);
    
    // Generate alternatives
    const alternatives = await this.generateAlternatives(resolvedFragments, mergedConfig);
    
    return {
      finalResponse: cleanedResponse,
      confidence,
      sources: this.attributeSources(validResults),
      contradictions,
      alternatives,
      metadata: {
        processingTime: Date.now() - startTime,
        sourcesUsed: validResults.length,
        chainSteps: chainResults.length,
        qualityScore,
        userPersonalization: mergedConfig.personalizeForUser
      }
    };
  }

  private filterValidResults(results: ChainResult[]): ChainResult[] {
    return results.filter(result => {
      // Filter out failed results
      if (!result.success) return false;
      
      // Filter out empty or trivial responses
      if (!result.output || result.output.trim().length < 10) return false;
      
      // Filter out system messages and debug info
      if (result.output.includes('[SYSTEM]') || result.output.includes('[DEBUG]')) return false;
      
      // Ensure minimum confidence
      if (result.metadata.confidence < 0.3) return false;
      
      return true;
    });
  }

  private async extractContentFragments(
    results: ChainResult[],
    context: ChainContext
  ): Promise<ContentFragment[]> {
    const fragments: ContentFragment[] = [];
    
    for (const result of results) {
      const fragmentType = this.determineFragmentType(result.stepId, result.output);
      const priority = this.calculateFragmentPriority(result, context);
      
      // Extract meaningful content sections
      const contentSections = this.segmentContent(result.output);
      
      for (const section of contentSections) {
        fragments.push({
          type: fragmentType,
          content: section,
          confidence: result.metadata.confidence,
          sources: [result.stepId],
          priority
        });
      }
    }
    
    // Sort by priority and confidence
    return fragments.sort((a, b) => 
      (b.priority * b.confidence) - (a.priority * a.confidence)
    );
  }

  private determineFragmentType(stepId: string, content: string): ContentFragment['type'] {
    if (stepId.includes('analysis') || stepId.includes('context')) {
      return 'introduction';
    } else if (stepId.includes('synthesis') || stepId.includes('comprehensive')) {
      return 'main_content';
    } else if (stepId.includes('validation') || stepId.includes('details')) {
      return 'details';
    } else if (content.includes('example') || content.includes('for instance')) {
      return 'examples';
    } else if (stepId.includes('conclusion') || content.includes('in summary')) {
      return 'conclusion';
    }
    return 'main_content';
  }

  private calculateFragmentPriority(result: ChainResult, context: ChainContext): number {
    let priority = 5; // Base priority
    
    // Higher priority for synthesis and analysis steps
    if (result.stepId.includes('synthesis')) priority += 3;
    if (result.stepId.includes('analysis')) priority += 2;
    if (result.stepId.includes('validation')) priority += 1;
    
    // Priority based on user query relevance
    const queryTerms = context.userQuery.toLowerCase().split(/\s+/);
    const contentLower = result.output.toLowerCase();
    const relevanceMatches = queryTerms.filter(term => contentLower.includes(term)).length;
    priority += relevanceMatches;
    
    // Priority based on MCP tool results
    if (result.mcpResults && result.mcpResults.length > 0) {
      priority += 2;
    }
    
    return priority;
  }

  private segmentContent(content: string): string[] {
    // Split content into meaningful segments
    const segments: string[] = [];
    
    // Split by paragraphs
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    for (const paragraph of paragraphs) {
      // Further split long paragraphs by sentences
      if (paragraph.length > 300) {
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 20);
        segments.push(...sentences.map(s => s.trim() + '.'));
      } else {
        segments.push(paragraph.trim());
      }
    }
    
    return segments;
  }

  private detectContradictions(fragments: ContentFragment[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    
    // Simple contradiction detection based on keyword analysis
    for (let i = 0; i < fragments.length; i++) {
      for (let j = i + 1; j < fragments.length; j++) {
        const fragment1 = fragments[i];
        const fragment2 = fragments[j];
        
        const contradiction = this.checkForContradiction(fragment1, fragment2);
        if (contradiction) {
          contradictions.push(contradiction);
        }
      }
    }
    
    return contradictions;
  }

  private checkForContradiction(
    fragment1: ContentFragment, 
    fragment2: ContentFragment
  ): Contradiction | null {
    const content1 = fragment1.content.toLowerCase();
    const content2 = fragment2.content.toLowerCase();
    
    // Detect opposing statements
    const oppositePatterns = [
      { positive: /\bis\s+(?:true|correct|valid)/, negative: /\bis\s+(?:false|incorrect|invalid)/ },
      { positive: /\bcan\s+/, negative: /\bcannot\s+|can't\s+/ },
      { positive: /\bwill\s+/, negative: /\bwill\s+not\s+|won't\s+/ },
      { positive: /\bshould\s+/, negative: /\bshould\s+not\s+|shouldn't\s+/ }
    ];
    
    for (const pattern of oppositePatterns) {
      if (pattern.positive.test(content1) && pattern.negative.test(content2) ||
          pattern.negative.test(content1) && pattern.positive.test(content2)) {
        
        return {
          sources: fragment1.sources.concat(fragment2.sources),
          description: `Contradictory statements detected between sources`,
          resolution: this.resolveContradictionLogic(fragment1, fragment2),
          confidence: Math.min(fragment1.confidence, fragment2.confidence)
        };
      }
    }
    
    return null;
  }

  private resolveContradictionLogic(fragment1: ContentFragment, fragment2: ContentFragment): string {
    // Resolve based on confidence and source priority
    if (fragment1.confidence > fragment2.confidence) {
      return `Prioritizing higher confidence source: ${fragment1.sources[0]}`;
    } else if (fragment2.confidence > fragment1.confidence) {
      return `Prioritizing higher confidence source: ${fragment2.sources[0]}`;
    } else {
      return `Merging perspectives from both sources with noted uncertainty`;
    }
  }

  private async resolveContradictions(
    fragments: ContentFragment[],
    contradictions: Contradiction[]
  ): Promise<ContentFragment[]> {
    if (contradictions.length === 0) return fragments;
    
    const resolvedFragments = [...fragments];
    
    for (const contradiction of contradictions) {
      // Find conflicting fragments
      const conflictingFragments = resolvedFragments.filter(f =>
        contradiction.sources.some(source => f.sources.includes(source))
      );
      
      if (conflictingFragments.length >= 2) {
        // Create a resolved fragment that acknowledges the contradiction
        const resolvedContent = this.createResolvedContent(conflictingFragments, contradiction);
        const maxConfidence = Math.max(...conflictingFragments.map(f => f.confidence));
        
        const resolvedFragment: ContentFragment = {
          type: 'main_content',
          content: resolvedContent,
          confidence: maxConfidence * 0.8, // Reduce confidence due to contradiction
          sources: contradiction.sources,
          priority: Math.max(...conflictingFragments.map(f => f.priority))
        };
        
        // Remove original conflicting fragments and add resolved one
        conflictingFragments.forEach(cf => {
          const index = resolvedFragments.indexOf(cf);
          if (index > -1) resolvedFragments.splice(index, 1);
        });
        
        resolvedFragments.push(resolvedFragment);
      }
    }
    
    return resolvedFragments;
  }

  private createResolvedContent(
    conflictingFragments: ContentFragment[],
    contradiction: Contradiction
  ): string {
    const perspectives = conflictingFragments.map((f, i) => 
      `Perspective ${i + 1}: ${f.content}`
    ).join('\n\n');
    
    return `There are different perspectives on this topic:\n\n${perspectives}\n\nBased on the available information, ${contradiction.resolution}.`;
  }

  private async synthesizeContent(
    fragments: ContentFragment[],
    config: SynthesisConfig
  ): Promise<string> {
    // Group fragments by type
    const groupedFragments = this.groupFragmentsByType(fragments);
    
    // Build response structure based on config
    const sections: string[] = [];
    
    // Introduction
    if (groupedFragments.introduction.length > 0) {
      sections.push(this.synthesizeSection(groupedFragments.introduction, config));
    }
    
    // Main content
    if (groupedFragments.main_content.length > 0) {
      sections.push(this.synthesizeSection(groupedFragments.main_content, config));
    }
    
    // Details (if verbosity allows)
    if (config.style.verbosity !== 'concise' && groupedFragments.details.length > 0) {
      sections.push(this.synthesizeSection(groupedFragments.details, config));
    }
    
    // Examples (if enabled)
    if (config.style.includeExamples && groupedFragments.examples.length > 0) {
      sections.push(this.synthesizeSection(groupedFragments.examples, config));
    }
    
    // Conclusion
    if (groupedFragments.conclusion.length > 0) {
      sections.push(this.synthesizeSection(groupedFragments.conclusion, config));
    }
    
    return this.formatSections(sections, config);
  }

  private groupFragmentsByType(fragments: ContentFragment[]): Record<string, ContentFragment[]> {
    const grouped: Record<string, ContentFragment[]> = {
      introduction: [],
      main_content: [],
      details: [],
      examples: [],
      conclusion: []
    };
    
    fragments.forEach(fragment => {
      grouped[fragment.type].push(fragment);
    });
    
    return grouped;
  }

  private synthesizeSection(fragments: ContentFragment[], config: SynthesisConfig): string {
    // Sort fragments by priority and confidence
    const sortedFragments = fragments.sort((a, b) => 
      (b.priority * b.confidence) - (a.priority * a.confidence)
    );
    
    // Limit based on verbosity
    const maxFragments = config.style.verbosity === 'concise' ? 2 : 
                        config.style.verbosity === 'moderate' ? 4 : 6;
    
    const selectedFragments = sortedFragments.slice(0, maxFragments);
    
    // Combine content intelligently
    return this.combineFragmentContent(selectedFragments, config);
  }

  private combineFragmentContent(fragments: ContentFragment[], config: SynthesisConfig): string {
    if (fragments.length === 0) return '';
    
    // Remove duplicates and overlapping content
    const uniqueFragments = this.deduplicateFragments(fragments);
    
    // Combine based on structure preference
    switch (config.style.structure) {
      case 'linear':
        return uniqueFragments.map(f => f.content).join(' ');
      
      case 'structured':
        return uniqueFragments.map((f, i) => {
          if (uniqueFragments.length > 1) {
            return `${i + 1}. ${f.content}`;
          }
          return f.content;
        }).join('\n\n');
      
      case 'narrative':
        return this.createNarrativeFlow(uniqueFragments);
      
      default:
        return uniqueFragments.map(f => f.content).join('\n\n');
    }
  }

  private deduplicateFragments(fragments: ContentFragment[]): ContentFragment[] {
    const unique: ContentFragment[] = [];
    const seen = new Set<string>();
    
    for (const fragment of fragments) {
      // Create a normalized version for comparison
      const normalized = fragment.content.toLowerCase().replace(/[^\w\s]/g, '').trim();
      
      // Check for substantial overlap
      let isDuplicate = false;
      for (const seenContent of seen) {
        if (this.calculateSimilarity(normalized, seenContent) > 0.7) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(fragment);
        seen.add(normalized);
      }
    }
    
    return unique;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private createNarrativeFlow(fragments: ContentFragment[]): string {
    const transitions = [
      'Additionally, ',
      'Furthermore, ',
      'Moreover, ',
      'It\'s also worth noting that ',
      'Building on this, '
    ];
    
    return fragments.map((fragment, index) => {
      if (index === 0) return fragment.content;
      
      const transition = transitions[Math.min(index - 1, transitions.length - 1)];
      const content = fragment.content.charAt(0).toLowerCase() + fragment.content.slice(1);
      return transition + content;
    }).join(' ');
  }

  private formatSections(sections: string[], config: SynthesisConfig): string {
    let formatted = sections.join('\n\n');
    
    // Apply tone adjustments
    formatted = this.adjustTone(formatted, config.style.tone);
    
    // Enforce length limits
    if (formatted.length > config.maxLength) {
      formatted = this.truncateIntelligently(formatted, config.maxLength);
    }
    
    return formatted.trim();
  }

  private adjustTone(content: string, tone: ResponseStyle['tone']): string {
    switch (tone) {
      case 'professional':
        // Replace casual phrases with formal ones
        return content
          .replace(/\bcan't\b/g, 'cannot')
          .replace(/\bwon't\b/g, 'will not')
          .replace(/\bdon't\b/g, 'do not');
      
      case 'casual':
        // Add casual connectors
        return content
          .replace(/\bHowever,/g, 'But,')
          .replace(/\bTherefore,/g, 'So,');
      
      case 'technical':
        // Maintain technical precision
        return content;
      
      case 'friendly':
        // Add friendly touches without changing core content
        if (!content.startsWith('I\'d be happy') && !content.startsWith('I can help')) {
          return 'I can help you with that! ' + content;
        }
        return content;
      
      default:
        return content;
    }
  }

  private truncateIntelligently(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    // Try to truncate at sentence boundaries
    const sentences = content.split(/[.!?]+/);
    let truncated = '';
    
    for (const sentence of sentences) {
      const withSentence = truncated + sentence + '.';
      if (withSentence.length > maxLength - 50) { // Leave buffer for ellipsis
        break;
      }
      truncated = withSentence;
    }
    
    return truncated || content.substring(0, maxLength - 3) + '...';
  }

  private async personalizeResponse(
    content: string,
    context: ChainContext,
    config: SynthesisConfig
  ): Promise<string> {
    if (!config.personalizeForUser) return content;
    
    const userContext = context.retrievedContext.userContext;
    
    // Adjust based on user's response style preference
    switch (userContext.responseStyle) {
      case 'concise':
        return this.makeConcise(content);
      case 'detailed':
        return this.addDetail(content, context);
      case 'technical':
        return this.makeTechnical(content);
      default:
        return content;
    }
  }

  private makeConcise(content: string): string {
    // Remove unnecessary qualifiers and verbose phrases
    return content
      .replace(/\b(?:it should be noted that|it is important to mention that|it is worth noting that)\s*/gi, '')
      .replace(/\b(?:basically|essentially|fundamentally)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private addDetail(content: string, context: ChainContext): string {
    // Add context and background where appropriate
    const userQuery = context.userQuery;
    
    if (content.length < 500) {
      return content + '\n\nFor additional context: ' + 
             'This information is based on the available data and current best practices. ' +
             'Feel free to ask for clarification on any specific aspect.';
    }
    
    return content;
  }

  private makeTechnical(content: string): string {
    // Preserve technical terms and add precision
    return content
      .replace(/\bworks\b/g, 'functions')
      .replace(/\bsend\b/g, 'transmit')
      .replace(/\bget\b/g, 'retrieve');
  }

  private cleanAndFilter(content: string, config: SynthesisConfig): string {
    if (!config.filterSystemInfo) return content;
    
    // Remove system artifacts and debug information
    let cleaned = content;
    
    // Remove system tags and metadata
    cleaned = cleaned.replace(/\[SYSTEM\].*?\[\/SYSTEM\]/gs, '');
    cleaned = cleaned.replace(/\[DEBUG\].*?\[\/DEBUG\]/gs, '');
    cleaned = cleaned.replace(/\[METADATA\].*?\[\/METADATA\]/gs, '');
    
    // Remove tool call artifacts
    cleaned = cleaned.replace(/\[TOOL_CALL\].*?\[\/TOOL_CALL\]/gs, '');
    cleaned = cleaned.replace(/Tool called:.*?\n/g, '');
    cleaned = cleaned.replace(/Result:.*?\n/g, '');
    
    // Remove JSON artifacts unless they contain user data
    cleaned = cleaned.replace(/^```json\s*\{[\s\S]*?\}\s*```$/gm, '');
    
    // Remove chain step references
    cleaned = cleaned.replace(/Step \d+:?\s*/g, '');
    cleaned = cleaned.replace(/Chain result from:.*?\n/g, '');
    
    // Remove confidence scores and internal ratings
    cleaned = cleaned.replace(/\(confidence: [\d.]+\)/g, '');
    cleaned = cleaned.replace(/\[score: [\d.]+\]/g, '');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/^\s+|\s+$/g, '');
    
    return cleaned;
  }

  private calculateOverallConfidence(results: ChainResult[], contradictions: Contradiction[]): number {
    if (results.length === 0) return 0;
    
    const avgConfidence = results.reduce((sum, r) => sum + r.metadata.confidence, 0) / results.length;
    
    // Reduce confidence for contradictions
    const contradictionPenalty = contradictions.length * 0.1;
    
    return Math.max(0, Math.min(1, avgConfidence - contradictionPenalty));
  }

  private calculateQualityScore(response: string, results: ChainResult[]): number {
    let score = 0.5;
    
    // Length appropriateness
    if (response.length > 100 && response.length < 2000) score += 0.2;
    
    // Coherence indicators
    if (response.includes('.') && response.includes(' ')) score += 0.1;
    
    // Information density
    const sentences = response.split(/[.!?]+/).length;
    if (sentences > 2 && sentences < 20) score += 0.1;
    
    // Source integration
    if (results.length > 1) score += 0.1;
    
    return Math.min(1, score);
  }

  private attributeSources(results: ChainResult[]): SourceAttribution[] {
    return results.map(result => ({
      source: result.mcpResults && result.mcpResults.length > 0 ? 'mcp_tool' : 'reasoning',
      content: result.stepId,
      confidence: result.metadata.confidence,
      weight: result.metadata.confidence
    }));
  }

  private async generateAlternatives(
    fragments: ContentFragment[],
    config: SynthesisConfig
  ): Promise<string[]> {
    const alternatives: string[] = [];
    
    // Create alternative by changing structure
    if (config.style.structure !== 'linear') {
      const linearConfig = { ...config, style: { ...config.style, structure: 'linear' as const } };
      const linear = await this.synthesizeContent(fragments, linearConfig);
      alternatives.push(linear);
    }
    
    // Create alternative by changing verbosity
    if (config.style.verbosity !== 'concise') {
      const conciseConfig = { ...config, style: { ...config.style, verbosity: 'concise' as const } };
      const concise = await this.synthesizeContent(fragments, conciseConfig);
      alternatives.push(concise);
    }
    
    return alternatives.slice(0, 2); // Limit alternatives
  }
}