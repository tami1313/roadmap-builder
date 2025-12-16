import { Roadmap } from '@/types/roadmap';

const STORAGE_KEY = 'roadmap-data';

export const saveRoadmap = (roadmap: Roadmap): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmap));
  }
};

export const loadRoadmap = (): Roadmap | null => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as Roadmap;
      } catch (e) {
        console.error('Error parsing roadmap data:', e);
        return null;
      }
    }
  }
  return null;
};

export const exportRoadmap = (roadmap: Roadmap): string => {
  return JSON.stringify(roadmap, null, 2);
};

export const importRoadmap = (jsonString: string): Roadmap | null => {
  try {
    return JSON.parse(jsonString) as Roadmap;
  } catch (e) {
    console.error('Error importing roadmap data:', e);
    return null;
  }
};

