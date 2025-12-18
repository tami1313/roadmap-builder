export type TimelineSection = 'now' | 'next' | 'later';

export type ProblemType = 'tooling' | 'user-facing' | 'infrastructure';

export type PreBuildMethod = 'user-testing' | 'internal-experimentation';
export type PostBuildMethod = 'user-validation' | 'sme-evaluation';

export type Scope = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';

export interface PreBuildValidation {
  methods: PreBuildMethod[]; // Can have both user-testing and internal-experimentation
  userTestingNotes?: string;
  internalExperimentationNotes?: string;
}

export interface PostBuildValidation {
  methods: PostBuildMethod[]; // Can have both user-validation and sme-evaluation
  userValidationNotes?: string;
  smeEvaluationNotes?: string;
}

export interface Validation {
  preBuild?: PreBuildValidation;
  postBuild?: PostBuildValidation;
}

export interface TimelineIteration {
  section: TimelineSection;
  version: 'good' | 'better' | 'best';
  description: string;
}

export type Priority = 'must-have' | 'nice-to-have';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface EngineeringReview {
  reviewed: boolean;
  notes?: string;
  riskLevel?: RiskLevel;
  certainty?: string; // Open text field, will display as percentage on roadmap
  tshirtSize?: string; // T-shirt size estimate (XS, S, M, L, XL, XXL, etc.)
  confluenceUrl?: string;
  jiraEpicUrl?: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  successCriteria: string; // What success looks like
  type: ProblemType;
  icon: string;
  timeline: TimelineSection; // Just the bucket
  priority: Priority;
  validation: Validation;
  engineeringReview?: EngineeringReview;
  displayOrder?: number; // Manual drag-and-drop order within timeline section
  // Internal roadmap fields (added later by dev lead):
  scope?: Scope;
  detailedTimeline?: {
    sprints?: string[];
    months?: string[];
    duration?: string;
  };
  technicalRequirements?: string;
  dependencies?: string[];
  resources?: number;
  notes?: string;
}

export interface Outcome {
  id: string;
  title: string;
  description: string;
  timeline: {
    sections: TimelineSection[];
    iterations?: TimelineIteration[];
  };
  isExpanded: boolean;
  problems: Problem[];
}

export interface Roadmap {
  metadata: {
    title: string;
    lastUpdated: string;
    version: 'external' | 'internal';
    branding: {
      logo: string | null;
      productLogos: string[];
    };
  };
  timeline: {
    now: {
      label: string;
      period: string;
      quarters: string[];
    };
    next: {
      label: string;
      period: string;
      quarters: string[];
    };
    later: {
      label: string;
      period: string;
      quarters: string[];
    };
  };
  outcomes: Outcome[];
  orphanedProblems?: Problem[]; // Problems without an outcome
}

