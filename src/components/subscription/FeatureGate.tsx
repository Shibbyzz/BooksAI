'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Lock, Star, Zap, Crown } from 'lucide-react';
import { SubscriptionTier } from '@prisma/client';

// Simple Badge component (since it's not imported correctly)
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

export interface FeatureGateProps {
  // Feature access control
  isAllowed: boolean;
  currentTier: SubscriptionTier;
  requiredTier: 'BASIC' | 'PREMIUM';
  
  // Content
  children: React.ReactNode;
  featureName: string;
  description?: string;
  
  // Customization
  showBadge?: boolean;
  variant?: 'inline' | 'overlay' | 'replacement';
  onUpgradeClick?: () => void;
  className?: string;
}

export interface UpgradePromptProps {
  currentTier: SubscriptionTier;
  requiredTier: 'BASIC' | 'PREMIUM';
  featureName: string;
  description?: string;
  onUpgradeClick?: () => void;
  variant?: 'inline' | 'overlay' | 'replacement';
}

const tierConfig = {
  FREE: {
    icon: Star,
    color: 'bg-gray-100 text-gray-600',
    name: 'Free'
  },
  BASIC: {
    icon: Zap,
    color: 'bg-blue-100 text-blue-600',
    name: 'Basic'
  },
  PREMIUM: {
    icon: Crown,
    color: 'bg-purple-100 text-purple-600',
    name: 'Premium'
  }
};

const upgradeOptions = {
  BASIC: {
    price: '$9/month',
    features: [
      '10 books per month',
      'Advanced proofreading',
      'Specialized writing modes',
      'PDF export',
      'Normal queue priority'
    ]
  },
  PREMIUM: {
    price: '$24/month',
    features: [
      '25 books per month',
      'Research integration',
      'Continuity checking',
      'Quality enhancement',
      'All export formats',
      'Commercial rights',
      'High priority queue'
    ]
  }
};

function UpgradePrompt({ 
  currentTier, 
  requiredTier, 
  featureName, 
  description, 
  onUpgradeClick,
  variant = 'replacement'
}: UpgradePromptProps) {
  const RequiredIcon = tierConfig[requiredTier].icon;
  const upgrade = upgradeOptions[requiredTier];
  
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default upgrade action - redirect to pricing page
      window.location.href = '/subscription/upgrade';
    }
  };

  if (variant === 'inline') {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800">
              {featureName} requires {tierConfig[requiredTier].name} subscription
            </h4>
            {description && (
              <p className="text-sm text-amber-700 mt-1">{description}</p>
            )}
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="mt-2"
            >
              Upgrade to {tierConfig[requiredTier].name} - {upgrade.price}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
        <Card className="max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-2">
              <RequiredIcon className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg">Upgrade Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {featureName} is available with {tierConfig[requiredTier].name} subscription
            </p>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            <Button onClick={handleUpgrade} className="w-full">
              Upgrade to {tierConfig[requiredTier].name} - {upgrade.price}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: replacement variant
  return (
    <Card className="border-dashed border-2 border-amber-200">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
          <RequiredIcon className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-xl">Unlock {featureName}</CardTitle>
        <p className="text-muted-foreground">
          Available with {tierConfig[requiredTier].name} subscription
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-center text-muted-foreground">{description}</p>
        )}
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">What you'll get:</h4>
          <ul className="text-sm space-y-1">
            {upgrade.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button onClick={handleUpgrade} className="w-full" size="lg">
          Upgrade to {tierConfig[requiredTier].name} - {upgrade.price}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Cancel anytime • Instant access • 7-day money-back guarantee
        </p>
      </CardContent>
    </Card>
  );
}

export function FeatureGate({
  isAllowed,
  currentTier,
  requiredTier,
  children,
  featureName,
  description,
  showBadge = true,
  variant = 'replacement',
  onUpgradeClick,
  className
}: FeatureGateProps) {
  // If feature is allowed, render children normally
  if (isAllowed) {
    return (
      <div className={className}>
        {showBadge && (
          <div className="flex items-center space-x-2 mb-2">
            <Badge className={tierConfig[currentTier].color}>
              {tierConfig[currentTier].name}
            </Badge>
          </div>
        )}
        {children}
      </div>
    );
  }

  // If feature is not allowed, show upgrade prompt
  return (
    <div className={`relative ${className}`}>
      {variant === 'overlay' && children}
      <UpgradePrompt
        currentTier={currentTier}
        requiredTier={requiredTier}
        featureName={featureName}
        description={description}
        onUpgradeClick={onUpgradeClick}
        variant={variant}
      />
    </div>
  );
}

// Convenience components for specific features
export function ResearchFeatureGate({ children, currentTier, ...props }: Omit<FeatureGateProps, 'requiredTier' | 'featureName' | 'isAllowed'>) {
  return (
    <FeatureGate
      requiredTier="PREMIUM"
      featureName="Research Integration"
      description="Get AI-powered research to enhance your book's authenticity and depth"
      isAllowed={currentTier === 'PREMIUM'}
      currentTier={currentTier}
      {...props}
    >
      {children}
    </FeatureGate>
  );
}

export function ContinuityFeatureGate({ children, currentTier, ...props }: Omit<FeatureGateProps, 'requiredTier' | 'featureName' | 'isAllowed'>) {
  return (
    <FeatureGate
      requiredTier="PREMIUM"
      featureName="Continuity Checking"
      description="Ensure perfect story consistency with AI-powered continuity tracking"
      isAllowed={currentTier === 'PREMIUM'}
      currentTier={currentTier}
      {...props}
    >
      {children}
    </FeatureGate>
  );
}

export function ProofreadingFeatureGate({ children, currentTier, ...props }: Omit<FeatureGateProps, 'requiredTier' | 'featureName' | 'isAllowed'>) {
  return (
    <FeatureGate
      requiredTier="BASIC"
      featureName="Advanced Proofreading"
      description="Professional-quality proofreading and editing for your book"
      isAllowed={currentTier === 'BASIC' || currentTier === 'PREMIUM'}
      currentTier={currentTier}
      {...props}
    >
      {children}
    </FeatureGate>
  );
}

export function ExportFeatureGate({ 
  children, 
  currentTier, 
  format,
  ...props 
}: Omit<FeatureGateProps, 'requiredTier' | 'featureName' | 'isAllowed'> & { format: string }) {
  const allowedFormats = {
    FREE: ['txt'],
    BASIC: ['txt', 'pdf'],
    PREMIUM: ['txt', 'pdf', 'epub', 'docx', 'mobi']
  };

  const isAllowed = allowedFormats[currentTier].includes(format.toLowerCase());
  const requiredTier = format.toLowerCase() === 'pdf' ? 'BASIC' : 'PREMIUM';

  return (
    <FeatureGate
      requiredTier={requiredTier}
      featureName={`${format.toUpperCase()} Export`}
      description={`Export your book in ${format.toUpperCase()} format`}
      isAllowed={isAllowed}
      currentTier={currentTier}
      {...props}
    >
      {children}
    </FeatureGate>
  );
}

// Hook for checking feature access
export function useFeatureAccess(currentTier: SubscriptionTier) {
  return {
    hasResearch: currentTier === 'PREMIUM',
    hasContinuity: currentTier === 'PREMIUM',
    hasProofreading: currentTier === 'BASIC' || currentTier === 'PREMIUM',
    hasQualityEnhancement: currentTier === 'PREMIUM',
    hasStrategicPlanning: currentTier === 'PREMIUM',
    hasCommercialRights: currentTier === 'PREMIUM',
    
    // Export formats
    canExportPDF: currentTier === 'BASIC' || currentTier === 'PREMIUM',
    canExportEPUB: currentTier === 'PREMIUM',
    canExportDOCX: currentTier === 'PREMIUM',
    
    // Limits
    getBooksPerMonth: () => {
      switch (currentTier) {
        case 'FREE': return 3;
        case 'BASIC': return 10;
        case 'PREMIUM': return 25;
        default: return 0;
      }
    },
    
    getMaxWordsPerBook: () => {
      switch (currentTier) {
        case 'FREE': return 50000;
        case 'BASIC': return 75000;
        case 'PREMIUM': return 200000;
        default: return 0;
      }
    }
  };
}

export default FeatureGate; 