import { Roadmap } from '@/types/roadmap';

export const defaultRoadmap: Roadmap = {
  metadata: {
    title: 'Roadmap',
    lastUpdated: new Date().toISOString().split('T')[0],
    version: 'external',
    branding: {
      logo: null,
      productLogos: []
    }
  },
  timeline: {
    now: {
      label: 'NOW | Q3',
      period: 'January - March 2026',
      quarters: ['Q3']
    },
    next: {
      label: 'NEXT | Q4',
      period: 'April - June 2026',
      quarters: ['Q4']
    },
    later: {
      label: 'LATER | Q1',
      period: 'July - September 2026',
      quarters: ['Q1']
    }
  },
  outcomes: [],
  orphanedProblems: []
};

export const getIconForType = (type: string): string => {
  const icons: Record<string, string> = {
    'tooling': '🔧',
    'user-facing': '👥',
    'infrastructure': '⚙️'
  };
  return icons[type] || '📋';
};

export const getTimelineLabel = (section: string, roadmap: Roadmap): string => {
  switch (section) {
    case 'now':
      return roadmap.timeline.now.label;
    case 'next':
      return roadmap.timeline.next.label;
    case 'later':
      return roadmap.timeline.later.label;
    default:
      return section;
  }
};

