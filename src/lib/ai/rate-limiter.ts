export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  model: string;
}

export interface RateLimitRequest {
  model: string;
  estimatedTokens: number;
  priority: 'low' | 'normal' | 'high';
}

export interface RateLimitStatus {
  model: string;
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: Date;
  isLimited: boolean;
}

interface TokenUsageTracker {
  totalTokens: number;
  totalRequests: number;
  estimatedCost: number; // In USD
  lastReset: Date;
}

export class RateLimiter {
  private limits: Map<string, RateLimitConfig>;
  private usage: Map<string, { requests: number; tokens: number; resetTime: Date }>;
  private requestQueue: Array<{ request: RateLimitRequest; resolve: () => void; reject: (error: Error) => void }>;
  private processingQueue: boolean = false;
  private requests: Map<string, number> = new Map();
  private resetTimes: Map<string, number> = new Map();
  private tokenUsage: TokenUsageTracker = {
    totalTokens: 0,
    totalRequests: 0,
    estimatedCost: 0,
    lastReset: new Date()
  };

  // Token pricing per 1K tokens (approximate as of 2024)
  private tokenPricing = {
    'gpt-4o': { input: 0.005, output: 0.015 },      // $5/$15 per 1M tokens
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // $0.15/$0.60 per 1M tokens  
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // $0.50/$1.50 per 1M tokens
    'o1-preview': { input: 0.015, output: 0.060 },    // $15/$60 per 1M tokens
    'o1-mini': { input: 0.003, output: 0.012 }        // $3/$12 per 1M tokens
  };

  constructor() {
    this.limits = new Map();
    this.usage = new Map();
    this.requestQueue = [];
    
    // Set default limits for common models
    this.setModelLimits('gpt-4o', {
      maxRequestsPerMinute: 60,
      maxTokensPerMinute: 30000,
      model: 'gpt-4o'
    });
    
    this.setModelLimits('gpt-4o-mini', {
      maxRequestsPerMinute: 100,
      maxTokensPerMinute: 60000,
      model: 'gpt-4o-mini'
    });
    
    this.setModelLimits('gpt-3.5-turbo', {
      maxRequestsPerMinute: 120,
      maxTokensPerMinute: 90000,
      model: 'gpt-3.5-turbo'
    });
    
    console.log('🚦 RateLimiter initialized with default model limits');
  }

  /**
   * Set rate limits for a specific model
   */
  setModelLimits(model: string, config: RateLimitConfig): void {
    this.limits.set(model, config);
    
    // Initialize usage tracking
    if (!this.usage.has(model)) {
      this.usage.set(model, {
        requests: 0,
        tokens: 0,
        resetTime: new Date(Date.now() + 60000) // Reset every minute
      });
    }
    
    console.log(`📊 Rate limits set for ${model}: ${config.maxRequestsPerMinute} req/min, ${config.maxTokensPerMinute} tokens/min`);
  }

  /**
   * Check if a request can be made immediately
   */
  canMakeRequest(model: string, estimatedTokens: number): boolean {
    const limits = this.limits.get(model);
    const usage = this.usage.get(model);
    
    if (!limits || !usage) {
      console.warn(`⚠️  No rate limits configured for model: ${model}`);
      return true; // Allow if no limits configured
    }
    
    // Reset usage if time window has passed
    if (Date.now() >= usage.resetTime.getTime()) {
      this.resetModelUsage(model);
    }
    
    const currentUsage = this.usage.get(model)!;
    
    return (
      currentUsage.requests < limits.maxRequestsPerMinute &&
      currentUsage.tokens + estimatedTokens <= limits.maxTokensPerMinute
    );
  }

  /**
   * Request permission to make an API call (with queueing)
   */
  async requestPermission(request: RateLimitRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if we can make the request immediately
      if (this.canMakeRequest(request.model, request.estimatedTokens)) {
        this.recordUsage(request.model, request.estimatedTokens);
        resolve();
        return;
      }
      
      // Add to queue based on priority
      const queueItem = { request, resolve, reject };
      
      if (request.priority === 'high') {
        this.requestQueue.unshift(queueItem);
      } else if (request.priority === 'normal') {
        // Insert in middle of queue
        const midPoint = Math.floor(this.requestQueue.length / 2);
        this.requestQueue.splice(midPoint, 0, queueItem);
      } else {
        // Low priority goes to end
        this.requestQueue.push(queueItem);
      }
      
      console.log(`🔄 Request queued for ${request.model} (${request.priority} priority). Queue length: ${this.requestQueue.length}`);
      
      // Start processing queue if not already processing
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const nextItem = this.requestQueue[0];
      
      // Check if we can process this request
      if (this.canMakeRequest(nextItem.request.model, nextItem.request.estimatedTokens)) {
        // Remove from queue and approve
        this.requestQueue.shift();
        this.recordUsage(nextItem.request.model, nextItem.request.estimatedTokens);
        nextItem.resolve();
      } else {
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.processingQueue = false;
  }

  /**
   * Record usage after making a request
   */
  recordUsage(model: string, actualTokens: number): void {
    const usage = this.usage.get(model);
    if (!usage) return;
    
    usage.requests++;
    usage.tokens += actualTokens;
    
    const limits = this.limits.get(model);
    if (limits) {
      const requestsPercent = Math.round((usage.requests / limits.maxRequestsPerMinute) * 100);
      const tokensPercent = Math.round((usage.tokens / limits.maxTokensPerMinute) * 100);
      
      console.log(`📈 ${model} usage: ${usage.requests}/${limits.maxRequestsPerMinute} requests (${requestsPercent}%), ${usage.tokens}/${limits.maxTokensPerMinute} tokens (${tokensPercent}%)`);
    }
  }

  /**
   * Reset usage tracking for a model
   */
  private resetModelUsage(model: string): void {
    const usage = this.usage.get(model);
    if (usage) {
      usage.requests = 0;
      usage.tokens = 0;
      usage.resetTime = new Date(Date.now() + 60000);
      
      console.log(`🔄 Rate limit reset for ${model}`);
    }
  }

  /**
   * Get current rate limit status for a model
   */
  getStatus(model: string): RateLimitStatus | null {
    const limits = this.limits.get(model);
    const usage = this.usage.get(model);
    
    if (!limits || !usage) return null;
    
    // Reset if needed
    if (Date.now() >= usage.resetTime.getTime()) {
      this.resetModelUsage(model);
    }
    
    const currentUsage = this.usage.get(model)!;
    
    return {
      model,
      requestsRemaining: Math.max(0, limits.maxRequestsPerMinute - currentUsage.requests),
      tokensRemaining: Math.max(0, limits.maxTokensPerMinute - currentUsage.tokens),
      resetTime: currentUsage.resetTime,
      isLimited: !this.canMakeRequest(model, 0)
    };
  }

  /**
   * Get status for all models
   */
  getAllStatus(): RateLimitStatus[] {
    return Array.from(this.limits.keys()).map(model => this.getStatus(model)).filter(Boolean) as RateLimitStatus[];
  }

  /**
   * Clear all queued requests (emergency stop)
   */
  clearQueue(): void {
    const clearedCount = this.requestQueue.length;
    
    // Reject all queued requests
    this.requestQueue.forEach(item => {
      item.reject(new Error('Request cancelled - rate limiter queue cleared'));
    });
    
    this.requestQueue = [];
    this.processingQueue = false;
    
    console.log(`🚨 Rate limiter queue cleared (${clearedCount} requests cancelled)`);
  }

  /**
   * Estimate tokens for a text string (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for a request based on model and input
   */
  static estimateRequestTokens(model: string, input: string, maxTokens: number = 1000): number {
    const inputTokens = RateLimiter.estimateTokens(input);
    const outputTokens = maxTokens;
    
    // Add some buffer for system messages and formatting
    const bufferTokens = 100;
    
    return inputTokens + outputTokens + bufferTokens;
  }

  /**
   * Track token usage and calculate costs
   */
  trackTokenUsage(
    model: string, 
    inputTokens: number, 
    outputTokens: number,
    context?: string
  ): void {
    const pricing = this.tokenPricing[model as keyof typeof this.tokenPricing] || this.tokenPricing['gpt-4o-mini'];
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    this.tokenUsage.totalTokens += inputTokens + outputTokens;
    this.tokenUsage.totalRequests += 1;
    this.tokenUsage.estimatedCost += totalCost;

    console.log(`💰 API Cost Tracking: ${model} - ${inputTokens + outputTokens} tokens (~$${totalCost.toFixed(4)}) ${context ? `[${context}]` : ''}`);
    console.log(`📊 Session Total: ${this.tokenUsage.totalTokens.toLocaleString()} tokens, ~$${this.tokenUsage.estimatedCost.toFixed(4)} across ${this.tokenUsage.totalRequests} requests`);
  }

  /**
   * Get current token usage statistics
   */
  getUsageStats(): TokenUsageTracker {
    return { ...this.tokenUsage };
  }

  /**
   * Reset usage tracking
   */
  resetUsageTracking(): void {
    this.tokenUsage = {
      totalTokens: 0,
      totalRequests: 0,
      estimatedCost: 0,
      lastReset: new Date()
    };
    console.log('📊 Token usage tracking reset');
  }

  /**
   * Get a formatted cost summary
   */
  getCostSummary(): string {
    const stats = this.tokenUsage;
    const avgCostPerRequest = stats.totalRequests > 0 ? stats.estimatedCost / stats.totalRequests : 0;
    const avgTokensPerRequest = stats.totalRequests > 0 ? stats.totalTokens / stats.totalRequests : 0;
    
    return `💰 Cost Summary:
    📊 Total Requests: ${stats.totalRequests.toLocaleString()}
    🔤 Total Tokens: ${stats.totalTokens.toLocaleString()}
    💵 Estimated Cost: $${stats.estimatedCost.toFixed(4)}
    📈 Avg Cost/Request: $${avgCostPerRequest.toFixed(4)}
    📈 Avg Tokens/Request: ${Math.round(avgTokensPerRequest).toLocaleString()}
    ⏰ Tracking Since: ${stats.lastReset.toLocaleString()}`;
  }
} 