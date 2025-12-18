'use client';

import { useState, useEffect } from 'react';
import { Roadmap, Outcome, Problem, TimelineSection, Validation, EngineeringReview } from '@/types/roadmap';
import { defaultRoadmap, getIconForType } from '@/lib/roadmapSchema';
import { saveRoadmap, loadRoadmap, exportRoadmap, importRoadmap } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

type BuildPhase = 'outcomes' | 'problems' | 'complete';

export default function RoadmapBuilder() {
  const [roadmap, setRoadmap] = useState<Roadmap>(defaultRoadmap);
  const [phase, setPhase] = useState<BuildPhase>('outcomes');
  const [currentOutcomeId, setCurrentOutcomeId] = useState<string | null>(null);
  const [showInternalDetails, setShowInternalDetails] = useState(false);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [expandedOutcomeProblems, setExpandedOutcomeProblems] = useState<Set<string>>(new Set());
  const [expandedProblems, setExpandedProblems] = useState<Set<string>>(new Set());
  const [outcomeErrors, setOutcomeErrors] = useState<string[]>([]);
  const [problemErrors, setProblemErrors] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'problem' | 'outcome';
    problemId?: string;
    outcomeId?: string | null;
    outcomeTitle?: string;
    problems?: Array<{ id: string; title: string }>;
    problemsToDelete?: Set<string>;
  } | null>(null);
  const [timelineMismatchWarning, setTimelineMismatchWarning] = useState<{
    show: boolean;
    problemTitle: string;
    outcomeTitle: string;
    problemTimeline: TimelineSection;
    outcomeTimelines: TimelineSection[];
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState<'priority' | 'type' | 'learning-validation' | 'timeline' | null>(null);
  const [priorityFilters, setPriorityFilters] = useState<Set<'must-have' | 'nice-to-have'>>(new Set(['must-have', 'nice-to-have']));
  const [typeFilters, setTypeFilters] = useState<Set<'tooling' | 'user-facing' | 'infrastructure'>>(new Set(['tooling', 'user-facing', 'infrastructure']));
  const [hasLearningValidation, setHasLearningValidation] = useState<boolean | null>(null); // null = show all, true = has validation, false = no validation
  const [timelineFilters, setTimelineFilters] = useState<Set<TimelineSection>>(new Set(['now', 'next', 'later']));

  // Form states for outcomes
  const [outcomeTitle, setOutcomeTitle] = useState('');
  const [outcomeDescription, setOutcomeDescription] = useState('');
  const [outcomeTimeline, setOutcomeTimeline] = useState<TimelineSection[]>(['now']);

  // Form states for problems
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [problemType, setProblemType] = useState<'tooling' | 'user-facing' | 'infrastructure'>('user-facing');
  const [problemTimeline, setProblemTimeline] = useState<TimelineSection>('now');
  const [problemPriority, setProblemPriority] = useState<'must-have' | 'nice-to-have'>('must-have');
  // Validation states - can have both pre-build and post-build
  const [hasPreBuildValidation, setHasPreBuildValidation] = useState(false);
  const [preBuildMethods, setPreBuildMethods] = useState<Array<'user-testing' | 'internal-experimentation'>>([]);
  const [preBuildUserTestingNotes, setPreBuildUserTestingNotes] = useState('');
  const [preBuildInternalExperimentationNotes, setPreBuildInternalExperimentationNotes] = useState('');
  const [hasPostBuildValidation, setHasPostBuildValidation] = useState(false);
  const [postBuildMethods, setPostBuildMethods] = useState<Array<'user-validation' | 'sme-evaluation'>>([]);
  const [postBuildUserValidationNotes, setPostBuildUserValidationNotes] = useState('');
  const [postBuildSmeEvaluationNotes, setPostBuildSmeEvaluationNotes] = useState('');
  // Engineering Review states
  const [engineeringReviewed, setEngineeringReviewed] = useState(false);
  const [engineeringNotes, setEngineeringNotes] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | ''>('');
  const [certainty, setCertainty] = useState('');
  const [tshirtSize, setTshirtSize] = useState('');
  const [confluenceUrl, setConfluenceUrl] = useState('');
  const [jiraEpicUrl, setJiraEpicUrl] = useState('');

  useEffect(() => {
    const loaded = loadRoadmap();
    console.warn('🔍 DEBUG: loadRoadmap returned:', loaded ? 'Data found' : 'No data');
    if (loaded) {
      console.warn('🔍 DEBUG: Starting migration, outcomes count:', loaded.outcomes.length);
      // Migration: Reorder existing problems by type (user-facing > tooling > infrastructure)
      // This ensures retroactive ordering for existing data
      const getTypePriority = (type: string): number => {
        if (type === 'user-facing') return 1;
        if (type === 'tooling') return 2;
        if (type === 'infrastructure') return 3;
        return 4; // fallback for unknown types
      };

      console.log('🔧 Migration: Starting reorder of existing problems');
      console.warn('🔧 MIGRATION RUNNING - Check if problems reorder by type');
      console.log('Loaded outcomes:', loaded.outcomes.length);

      const migrated = {
        ...loaded,
        outcomes: loaded.outcomes.map((outcome, outcomeIndex) => {
          console.log(`Processing outcome ${outcomeIndex + 1}: ${outcome.title}, ${outcome.problems.length} problems`);
          
          // Group problems by timeline section and reorder each section
          const problemsBySection = new Map<TimelineSection, Problem[]>();
          
          // Group problems by their timeline section
          outcome.problems.forEach(problem => {
            if (!problemsBySection.has(problem.timeline)) {
              problemsBySection.set(problem.timeline, []);
            }
            problemsBySection.get(problem.timeline)!.push(problem);
          });

          // Reorder problems within each section by type, then update displayOrder
          const reorderedProblems: Problem[] = [];
          
          // Process each timeline section in order
          const sections: TimelineSection[] = ['now', 'next', 'later'];
          sections.forEach(section => {
            const sectionProblems = problemsBySection.get(section) || [];
            if (sectionProblems.length > 0) {
              console.log(`  Section ${section}: ${sectionProblems.length} problems`);
              console.log(`    Before sort:`, sectionProblems.map(p => ({ title: p.title, type: p.type })));
              
              // Sort by type priority
              const sorted = [...sectionProblems].sort((a, b) => {
                const aPriority = getTypePriority(a.type);
                const bPriority = getTypePriority(b.type);
                if (aPriority !== bPriority) {
                  return aPriority - bPriority;
                }
                // If same type, maintain existing order (use displayOrder if available)
                const aOrder = a.displayOrder ?? 0;
                const bOrder = b.displayOrder ?? 0;
                return aOrder - bOrder;
              });
              
              console.log(`    After sort:`, sorted.map(p => ({ title: p.title, type: p.type })));
              
              // Update displayOrder for sorted problems
              sorted.forEach((problem, index) => {
                reorderedProblems.push({
                  ...problem,
                  displayOrder: index
                });
              });
            }
          });

          return {
            ...outcome,
            problems: reorderedProblems
          };
        })
      };
      
      console.log('✅ Migration: Completed reordering');
      console.warn('✅ MIGRATION COMPLETE - Problems should now be ordered by type');
      console.log('Migrated outcomes:', migrated.outcomes.length);
      
      // Debug: Log first outcome's problems to verify ordering
      if (migrated.outcomes.length > 0 && migrated.outcomes[0].problems.length > 0) {
        const firstOutcome = migrated.outcomes[0];
        const nowProblems = firstOutcome.problems.filter(p => p.timeline === 'now');
        if (nowProblems.length > 0) {
          console.log('📋 Sample ordering check (first outcome, NOW section):', 
            nowProblems.map(p => ({ title: p.title.substring(0, 30), type: p.type }))
          );
        }
      }
      
      // Always update to ensure migration runs
      setRoadmap(migrated);
      // Save the migrated data
      saveRoadmap(migrated);
      console.log('💾 Migration: Data saved to localStorage');
      
      if (migrated.outcomes.length > 0) {
        setPhase('problems');
      }
    }
  }, []);

  useEffect(() => {
    saveRoadmap(roadmap);
  }, [roadmap]);

  const handleAddOutcome = () => {
    // Validate required fields
    const errors: string[] = [];
    if (!outcomeTitle.trim()) {
      errors.push('Expected Outcome Title is required');
    }
    if (!outcomeDescription.trim()) {
      errors.push('Expected Outcome Description is required');
    }
    if (outcomeTimeline.length === 0) {
      errors.push('At least one Timeline Section must be selected');
    }

    if (errors.length > 0) {
      setOutcomeErrors(errors);
      return;
    }

    // Clear errors if validation passes
    setOutcomeErrors([]);

    if (editingOutcomeId) {
      // Update existing outcome
      setRoadmap(prev => ({
        ...prev,
        outcomes: prev.outcomes.map(outcome =>
          outcome.id === editingOutcomeId
            ? {
                ...outcome,
                title: outcomeTitle,
                description: outcomeDescription,
                timeline: {
                  sections: outcomeTimeline
                }
              }
            : outcome
        ),
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      }));
      setEditingOutcomeId(null);
    } else {
      // Add new outcome
      const newOutcome: Outcome = {
        id: uuidv4(),
        title: outcomeTitle,
        description: outcomeDescription,
        timeline: {
          sections: outcomeTimeline
        },
        isExpanded: true,
        problems: []
      };

      setRoadmap(prev => ({
        ...prev,
        outcomes: [...prev.outcomes, newOutcome],
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      }));
      
      // Show success message
      setSuccessMessage('Expected Outcome added successfully!');
      setTimeout(() => setSuccessMessage(null), 1000);
    }

    // Reset form
    setOutcomeTitle('');
    setOutcomeDescription('');
    setOutcomeTimeline(['now']);
  };

  const handleEditOutcome = (outcomeId: string) => {
    const outcome = roadmap.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return;

    setEditingOutcomeId(outcomeId);
    setOutcomeTitle(outcome.title);
    setOutcomeDescription(outcome.description);
    setOutcomeTimeline(outcome.timeline.sections);
    setOutcomeErrors([]);
    setPhase('outcomes');
  };

  const handleAddProblem = () => {
    // Validate required fields
    const errors: string[] = [];
    if (!currentOutcomeId) {
      errors.push('An Expected Outcome must be selected');
    }
    if (!problemTitle.trim()) {
      errors.push('Problem Title is required');
    }
    if (!problemDescription.trim()) {
      errors.push('Problem Description is required');
    }
    if (!successCriteria.trim()) {
      errors.push('What Success Looks Like is required');
    }
    if (hasPreBuildValidation && preBuildMethods.length === 0) {
      errors.push('At least one Pre-Build Validation method must be selected');
    }
    if (hasPostBuildValidation && postBuildMethods.length === 0) {
      errors.push('At least one Post-Build Validation method must be selected');
    }

    if (errors.length > 0) {
      setProblemErrors(errors);
      return;
    }

    // Clear errors if validation passes
    setProblemErrors([]);

    // Check if we're editing an orphaned problem
    const isOrphanedProblem = editingProblemId && !roadmap.outcomes.some(o => 
      o.problems.some(p => p.id === editingProblemId)
    );

    const validation: Validation = {};
    
    // Engineering Review
    const engineeringReview: EngineeringReview | undefined = engineeringReviewed ? {
      reviewed: engineeringReviewed,
      notes: engineeringNotes || undefined,
      riskLevel: riskLevel || undefined,
      certainty: certainty || undefined,
      tshirtSize: tshirtSize || undefined,
      confluenceUrl: confluenceUrl || undefined,
      jiraEpicUrl: jiraEpicUrl || undefined
    } : undefined;
    
    if (hasPreBuildValidation && preBuildMethods.length > 0) {
      validation.preBuild = {
        methods: preBuildMethods,
        userTestingNotes: preBuildUserTestingNotes || undefined,
        internalExperimentationNotes: preBuildInternalExperimentationNotes || undefined
      };
    }
    
    if (hasPostBuildValidation && postBuildMethods.length > 0) {
      validation.postBuild = {
        methods: postBuildMethods,
        userValidationNotes: postBuildUserValidationNotes || undefined,
        smeEvaluationNotes: postBuildSmeEvaluationNotes || undefined
      };
    }

    if (editingProblemId) {
      // Check if it's an orphaned problem
      const isOrphaned = roadmap.orphanedProblems?.some(p => p.id === editingProblemId);
      
      if (isOrphaned && currentOutcomeId) {
        // Moving orphaned problem to an outcome
        const orphanedProblem = roadmap.orphanedProblems?.find(p => p.id === editingProblemId);
        const targetOutcome = roadmap.outcomes.find(o => o.id === currentOutcomeId);
        
        if (orphanedProblem && targetOutcome) {
          // Check if problem timeline matches outcome timeline
          if (!targetOutcome.timeline?.sections || !targetOutcome.timeline.sections.includes(problemTimeline)) {
            // Show warning - timeline mismatch
            setTimelineMismatchWarning({
              show: true,
              problemTitle: problemTitle,
              outcomeTitle: targetOutcome.title,
              problemTimeline: problemTimeline,
              outcomeTimelines: targetOutcome.timeline.sections
            });
            return; // Don't save yet
          }

          // Set displayOrder when moving orphaned problem to outcome
          const sectionProblems = targetOutcome.problems.filter(p => p.timeline === problemTimeline);
          const maxDisplayOrder = sectionProblems.reduce((max, p) => 
            Math.max(max, p.displayOrder !== undefined ? p.displayOrder : -1), -1);

          const updatedProblem: Problem = {
            ...orphanedProblem,
            title: problemTitle,
            description: problemDescription,
            successCriteria: successCriteria,
            type: problemType || 'user-facing',
            icon: getIconForType(problemType || 'user-facing'),
            timeline: problemTimeline,
            priority: problemPriority,
            validation,
            engineeringReview,
            displayOrder: maxDisplayOrder + 1
          };

          setRoadmap(prev => ({
            ...prev,
            outcomes: prev.outcomes.map(outcome =>
              outcome.id === currentOutcomeId
                ? {
                    ...outcome,
                    problems: [...outcome.problems, updatedProblem]
                  }
                : outcome
            ),
            orphanedProblems: (prev.orphanedProblems || []).filter(p => p.id !== editingProblemId),
            metadata: {
              ...prev.metadata,
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          }));
          setEditingProblemId(null);
        }
      } else if (currentOutcomeId) {
        // Update existing problem in outcome
        setRoadmap(prev => ({
          ...prev,
          outcomes: prev.outcomes.map(outcome =>
            outcome.id === currentOutcomeId
              ? {
                  ...outcome,
                  problems: outcome.problems.map(problem =>
                    problem.id === editingProblemId
                      ? {
                          ...problem,
                          title: problemTitle,
                          description: problemDescription,
                          successCriteria: successCriteria,
                          type: problemType || 'user-facing',
                          icon: getIconForType(problemType || 'user-facing'),
                          timeline: problemTimeline,
                          priority: problemPriority,
                          validation,
                          engineeringReview
                        }
                      : problem
                  )
                }
              : outcome
          ),
          metadata: {
            ...prev.metadata,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        }));
        setEditingProblemId(null);
      }
    } else {
      // Add new problem
      // Find the target outcome to determine displayOrder
      const targetOutcome = roadmap.outcomes.find(o => o.id === currentOutcomeId);
      const sectionProblems = targetOutcome?.problems.filter(p => p.timeline === problemTimeline) || [];
      const maxDisplayOrder = sectionProblems.reduce((max, p) => 
        Math.max(max, p.displayOrder !== undefined ? p.displayOrder : -1), -1);
      
      const newProblem: Problem = {
        id: uuidv4(),
        title: problemTitle,
        description: problemDescription,
        successCriteria: successCriteria,
        type: problemType || 'user-facing', // Default to user-facing if not set (will be set by dev lead later)
        icon: getIconForType(problemType || 'user-facing'),
        timeline: problemTimeline,
        priority: problemPriority,
        validation,
        engineeringReview,
        displayOrder: maxDisplayOrder + 1 // Set displayOrder to be after existing problems
      };

      setRoadmap(prev => ({
        ...prev,
        outcomes: prev.outcomes.map(outcome =>
          outcome.id === currentOutcomeId
            ? { ...outcome, problems: [...outcome.problems, newProblem] }
            : outcome
        ),
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      }));
      
      // Show success message
      setSuccessMessage('Problem to Solve added successfully!');
      setTimeout(() => setSuccessMessage(null), 1000);
    }

    // Reset form
    setProblemTitle('');
    setProblemDescription('');
    setSuccessCriteria('');
    setProblemType('user-facing');
    setProblemTimeline('now');
    setProblemPriority('must-have');
    setHasPreBuildValidation(false);
    setPreBuildMethods([]);
    setPreBuildUserTestingNotes('');
    setPreBuildInternalExperimentationNotes('');
    setHasPostBuildValidation(false);
    setPostBuildMethods([]);
    setPostBuildUserValidationNotes('');
    setPostBuildSmeEvaluationNotes('');
    setEngineeringReviewed(false);
    setEngineeringNotes('');
    setRiskLevel('');
    setCertainty('');
    setTshirtSize('');
    setConfluenceUrl('');
    setJiraEpicUrl('');
    setProblemErrors([]);
  };

  const handleEditProblem = (outcomeId: string | null, problemId: string) => {
    // Check if it's an orphaned problem
    if (!outcomeId && roadmap.orphanedProblems) {
      const orphanedProblem = roadmap.orphanedProblems.find(p => p.id === problemId);
      if (orphanedProblem) {
        setEditingProblemId(problemId);
        setCurrentOutcomeId(null); // No outcome selected yet
        setProblemTitle(orphanedProblem.title);
        setProblemDescription(orphanedProblem.description);
        setSuccessCriteria(orphanedProblem.successCriteria);
        setProblemType(orphanedProblem.type);
        setProblemTimeline(orphanedProblem.timeline);
        setProblemPriority(orphanedProblem.priority);
        
        // Set validation fields
        if (orphanedProblem.validation.preBuild) {
          setHasPreBuildValidation(true);
          setPreBuildMethods(orphanedProblem.validation.preBuild.methods || []);
          setPreBuildUserTestingNotes(orphanedProblem.validation.preBuild.userTestingNotes || '');
          setPreBuildInternalExperimentationNotes(orphanedProblem.validation.preBuild.internalExperimentationNotes || '');
        } else {
          setHasPreBuildValidation(false);
          setPreBuildMethods([]);
          setPreBuildUserTestingNotes('');
          setPreBuildInternalExperimentationNotes('');
        }
        
        if (orphanedProblem.validation.postBuild) {
          setHasPostBuildValidation(true);
          setPostBuildMethods(orphanedProblem.validation.postBuild.methods || []);
          setPostBuildUserValidationNotes(orphanedProblem.validation.postBuild.userValidationNotes || '');
          setPostBuildSmeEvaluationNotes(orphanedProblem.validation.postBuild.smeEvaluationNotes || '');
        } else {
          setHasPostBuildValidation(false);
          setPostBuildMethods([]);
          setPostBuildUserValidationNotes('');
          setPostBuildSmeEvaluationNotes('');
        }
        
        // Set engineering review fields
        if (orphanedProblem.engineeringReview) {
          setEngineeringReviewed(orphanedProblem.engineeringReview.reviewed);
          setEngineeringNotes(orphanedProblem.engineeringReview.notes || '');
          setRiskLevel(orphanedProblem.engineeringReview.riskLevel || '');
          setCertainty(orphanedProblem.engineeringReview.certainty || '');
          setTshirtSize(orphanedProblem.engineeringReview.tshirtSize || '');
          setConfluenceUrl(orphanedProblem.engineeringReview.confluenceUrl || '');
          setJiraEpicUrl(orphanedProblem.engineeringReview.jiraEpicUrl || '');
        } else {
          setEngineeringReviewed(false);
          setEngineeringNotes('');
          setRiskLevel('');
          setCertainty('');
          setTshirtSize('');
          setConfluenceUrl('');
          setJiraEpicUrl('');
        }
        
        setPhase('problems');
        return;
      }
    }

    // Regular problem from an outcome
    const outcome = roadmap.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return;
    
    const problem = outcome.problems.find(p => p.id === problemId);
    if (!problem) return;

    setEditingProblemId(problemId);
    setCurrentOutcomeId(outcomeId);
    setProblemTitle(problem.title);
    setProblemDescription(problem.description);
    setSuccessCriteria(problem.successCriteria);
    setProblemType(problem.type);
    setProblemTimeline(problem.timeline);
    setProblemPriority(problem.priority);
    
    // Set validation fields
    if (problem.validation.preBuild) {
      setHasPreBuildValidation(true);
      setPreBuildMethods(problem.validation.preBuild.methods || []);
      setPreBuildUserTestingNotes(problem.validation.preBuild.userTestingNotes || '');
      setPreBuildInternalExperimentationNotes(problem.validation.preBuild.internalExperimentationNotes || '');
    } else {
      setHasPreBuildValidation(false);
      setPreBuildMethods([]);
      setPreBuildUserTestingNotes('');
      setPreBuildInternalExperimentationNotes('');
    }
    
    if (problem.validation.postBuild) {
      setHasPostBuildValidation(true);
      setPostBuildMethods(problem.validation.postBuild.methods || []);
      setPostBuildUserValidationNotes(problem.validation.postBuild.userValidationNotes || '');
      setPostBuildSmeEvaluationNotes(problem.validation.postBuild.smeEvaluationNotes || '');
    } else {
      setHasPostBuildValidation(false);
      setPostBuildMethods([]);
      setPostBuildUserValidationNotes('');
      setPostBuildSmeEvaluationNotes('');
    }
    
    // Set engineering review fields
    if (problem.engineeringReview) {
      setEngineeringReviewed(problem.engineeringReview.reviewed);
      setEngineeringNotes(problem.engineeringReview.notes || '');
      setRiskLevel(problem.engineeringReview.riskLevel || '');
      setCertainty(problem.engineeringReview.certainty || '');
      setTshirtSize(problem.engineeringReview.tshirtSize || '');
      setConfluenceUrl(problem.engineeringReview.confluenceUrl || '');
      setJiraEpicUrl(problem.engineeringReview.jiraEpicUrl || '');
    } else {
      setEngineeringReviewed(false);
      setEngineeringNotes('');
      setRiskLevel('');
      setCertainty('');
      setTshirtSize('');
      setConfluenceUrl('');
      setJiraEpicUrl('');
    }
    
    setPhase('problems');
  };

  const toggleOutcomeExpanded = (outcomeId: string) => {
    setRoadmap(prev => ({
      ...prev,
      outcomes: prev.outcomes.map(outcome =>
        outcome.id === outcomeId
          ? { ...outcome, isExpanded: !outcome.isExpanded }
          : outcome
      )
    }));
  };

  const toggleOutcomeProblemsExpanded = (outcomeId: string) => {
    setExpandedOutcomeProblems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outcomeId)) {
        newSet.delete(outcomeId);
      } else {
        newSet.add(outcomeId);
      }
      return newSet;
    });
  };

  const toggleProblemExpanded = (problemId: string) => {
    setExpandedProblems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      return newSet;
    });
  };


  // Filter helper function
  const matchesFilters = (problem: Problem): boolean => {
    // Priority filter
    if (!priorityFilters.has(problem.priority)) {
      return false;
    }

    // Type filter
    if (!typeFilters.has(problem.type)) {
      return false;
    }

    // Learning Validation filter
    if (hasLearningValidation !== null) {
      const hasValidation = !!(problem.validation.preBuild?.methods.length || problem.validation.postBuild?.methods.length);
      if (hasLearningValidation !== hasValidation) {
        return false;
      }
    }

    // Timeline filter is handled separately when filtering by section
    return true;
  };

  const togglePriorityFilter = (priority: 'must-have' | 'nice-to-have') => {
    setPriorityFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(priority)) {
        newSet.delete(priority);
      } else {
        newSet.add(priority);
      }
      return newSet;
    });
  };

  const toggleTypeFilter = (type: 'tooling' | 'user-facing' | 'infrastructure') => {
    setTypeFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const toggleTimelineFilter = (timeline: TimelineSection) => {
    setTimelineFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(timeline)) {
        newSet.delete(timeline);
      } else {
        newSet.add(timeline);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setPriorityFilters(new Set(['must-have', 'nice-to-have']));
    setTypeFilters(new Set(['tooling', 'user-facing', 'infrastructure']));
    setHasLearningValidation(null);
    setTimelineFilters(new Set(['now', 'next', 'later']));
  };

  const handleTimelineChange = (section: TimelineSection, checked: boolean) => {
    if (checked) {
      setOutcomeTimeline(prev => [...prev, section]);
    } else {
      setOutcomeTimeline(prev => prev.filter(s => s !== section));
    }
  };

  const handleDeleteProblem = (outcomeId: string, problemId: string) => {
    const outcome = roadmap.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return;
    
    const problem = outcome.problems.find(p => p.id === problemId);
    if (!problem) return;

    setDeleteConfirm({
      type: 'problem',
      problemId,
      outcomeId
    });
  };

  const handleDeleteOutcome = (outcomeId: string) => {
    const outcome = roadmap.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return;

    if (outcome.problems.length === 0) {
      // No problems, simple confirmation
      setDeleteConfirm({
        type: 'outcome',
        outcomeId,
        outcomeTitle: outcome.title,
        problems: []
      });
    } else {
      // Has problems, show list with checkboxes
      setDeleteConfirm({
        type: 'outcome',
        outcomeId,
        outcomeTitle: outcome.title,
        problems: outcome.problems.map(p => ({ id: p.id, title: p.title })),
        problemsToDelete: new Set<string>()
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'problem') {
      // Delete problem (either from outcome or orphaned)
      if (deleteConfirm.outcomeId) {
        // Delete from outcome
        setRoadmap(prev => ({
          ...prev,
          outcomes: prev.outcomes.map(outcome =>
            outcome.id === deleteConfirm.outcomeId
              ? {
                  ...outcome,
                  problems: outcome.problems.filter(p => p.id !== deleteConfirm.problemId)
                }
              : outcome
          ),
          metadata: {
            ...prev.metadata,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        }));
      } else {
        // Delete orphaned problem
        setRoadmap(prev => ({
          ...prev,
          orphanedProblems: (prev.orphanedProblems || []).filter(p => p.id !== deleteConfirm.problemId),
          metadata: {
            ...prev.metadata,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        }));
      }
    } else if (deleteConfirm.type === 'outcome') {
      const outcome = roadmap.outcomes.find(o => o.id === deleteConfirm.outcomeId);
      if (!outcome) return;

      const problemsToDelete = deleteConfirm.problemsToDelete || new Set<string>();
      const problemsToOrphan = outcome.problems.filter(p => !problemsToDelete.has(p.id));
      const problemsToDeleteList = outcome.problems.filter(p => problemsToDelete.has(p.id));

      setRoadmap(prev => ({
        ...prev,
        outcomes: prev.outcomes.filter(o => o.id !== deleteConfirm.outcomeId),
        orphanedProblems: [
          ...(prev.orphanedProblems || []),
          ...problemsToOrphan
        ],
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date().toISOString().split('T')[0]
        }
      }));
    }

    setDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const toggleProblemDeleteCheckbox = (problemId: string) => {
    if (!deleteConfirm || deleteConfirm.type !== 'outcome') return;
    
    setDeleteConfirm({
      ...deleteConfirm,
      problemsToDelete: (() => {
        const newSet = new Set(deleteConfirm.problemsToDelete || []);
        if (newSet.has(problemId)) {
          newSet.delete(problemId);
        } else {
          newSet.add(problemId);
        }
        return newSet;
      })()
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Success Notification */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in">
            <span className="text-xl">✓</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Roadmap Builder</h1>
              <p className="text-gray-600">Last updated: {roadmap.metadata.lastUpdated}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const data = exportRoadmap(roadmap);
                  navigator.clipboard.writeText(data);
                  alert('Roadmap data copied to clipboard! Paste it in another browser to import.');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                title="Export roadmap data to transfer between browsers"
              >
                Export Data
              </button>
              <button
                onClick={() => {
                  const paste = prompt('Paste roadmap data to import:');
                  if (paste) {
                    const imported = importRoadmap(paste);
                    if (imported) {
                      setRoadmap(imported);
                      saveRoadmap(imported);
                      alert('Roadmap imported successfully!');
                    } else {
                      alert('Error importing roadmap. Please check the data format.');
                    }
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                title="Import roadmap data from another browser"
              >
                Import Data
              </button>
            </div>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {phase === 'outcomes' && 'Phase 1: Define Expected Outcomes (North Stars)'}
                {phase === 'problems' && 'Phase 2: Add Problems to Solve'}
                {phase === 'complete' && 'Roadmap Complete'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {phase === 'outcomes' && 'Add all high-level outcomes first, then move to problems'}
                {phase === 'problems' && 'Add problems under each outcome'}
                {phase === 'complete' && 'View your roadmap below'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('outcomes')}
                className={`px-4 py-2 rounded ${phase === 'outcomes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Expected Outcomes
              </button>
              <button
                onClick={() => setPhase('problems')}
                className={`px-4 py-2 rounded ${phase === 'problems' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                disabled={roadmap.outcomes.length === 0}
              >
                Problems to Solve
              </button>
              <button
                onClick={() => setPhase('complete')}
                className={`px-4 py-2 rounded ${phase === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                disabled={roadmap.outcomes.length === 0}
              >
                View Roadmap
              </button>
            </div>
          </div>
        </div>

        {/* Phase 1: Expected Outcomes */}
        {phase === 'outcomes' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingOutcomeId ? 'Edit Expected Outcome' : 'Add New Expected Outcome'}
            </h3>
            {outcomeErrors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Please complete the following required fields:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {outcomeErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Outcome Title *
                </label>
                  <input
                    type="text"
                    value={outcomeTitle}
                    onChange={(e) => {
                      setOutcomeTitle(e.target.value);
                      if (e.target.value.trim() && outcomeErrors.includes('Expected Outcome Title is required')) {
                        setOutcomeErrors(outcomeErrors.filter(err => err !== 'Expected Outcome Title is required'));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      outcomeErrors.some(e => e.includes('Title')) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="e.g., User Navigation & Orientation"
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Outcome Description (Problem Statement) *
                </label>
                <textarea
                  value={outcomeDescription}
                  onChange={(e) => {
                    setOutcomeDescription(e.target.value);
                    if (e.target.value.trim() && outcomeErrors.includes('Expected Outcome Description is required')) {
                      setOutcomeErrors(outcomeErrors.filter(err => err !== 'Expected Outcome Description is required'));
                    }
                  }}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    outcomeErrors.some(e => e.includes('Description')) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Describe the high-level problem or outcome you're trying to achieve..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline Sections *
                </label>
                <div className="flex gap-4">
                  {(['now', 'next', 'later'] as TimelineSection[]).map(section => (
                    <label key={section} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={outcomeTimeline.includes(section)}
                        onChange={(e) => handleTimelineChange(section, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{section}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddOutcome}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingOutcomeId ? 'Update Expected Outcome' : 'Add Expected Outcome'}
                </button>
                {editingOutcomeId && (
                  <button
                    onClick={() => {
                      setEditingOutcomeId(null);
                      setOutcomeTitle('');
                      setOutcomeDescription('');
                      setOutcomeTimeline(['now']);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Problems to Solve */}
        {phase === 'problems' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingProblemId ? 'Edit Problem to Solve' : 'Add Problem to Solve'}
            </h3>
            {problemErrors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Please complete the following required fields:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {problemErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Expected Outcome *
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={currentOutcomeId || ''}
                  onChange={(e) => {
                    setCurrentOutcomeId(e.target.value || null);
                    if (e.target.value && problemErrors.includes('An Expected Outcome must be selected')) {
                      setProblemErrors(problemErrors.filter(err => err !== 'An Expected Outcome must be selected'));
                    }
                  }}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    problemErrors.some(e => e.includes('Expected Outcome')) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">-- Select an expected outcome --</option>
                  {roadmap.outcomes.map(outcome => (
                    <option key={outcome.id} value={outcome.id}>
                      {outcome.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setPhase('outcomes');
                    setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 100);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm whitespace-nowrap"
                  title="Add new expected outcome"
                >
                  + New Outcome
                </button>
              </div>
              {editingProblemId && !currentOutcomeId && (
                <p className="text-xs text-amber-600 italic">
                  This problem is currently orphaned. Select an outcome above to attach it, or create a new outcome.
                </p>
              )}
            </div>
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    value={problemTitle}
                    onChange={(e) => {
                      setProblemTitle(e.target.value);
                      if (e.target.value.trim() && problemErrors.includes('Problem Title is required')) {
                        setProblemErrors(problemErrors.filter(err => err !== 'Problem Title is required'));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      problemErrors.some(e => e.includes('Title')) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="e.g., Build Directional Map Solution"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problem Description *
                  </label>
                  <textarea
                    value={problemDescription}
                    onChange={(e) => {
                      setProblemDescription(e.target.value);
                      if (e.target.value.trim() && problemErrors.includes('Problem Description is required')) {
                        setProblemErrors(problemErrors.filter(err => err !== 'Problem Description is required'));
                      }
                    }}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      problemErrors.some(e => e.includes('Description')) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Describe the specific problem to solve..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What Success Looks Like *
                  </label>
                  <textarea
                    value={successCriteria}
                    onChange={(e) => {
                      setSuccessCriteria(e.target.value);
                      if (e.target.value.trim() && problemErrors.includes('What Success Looks Like is required')) {
                        setProblemErrors(problemErrors.filter(err => err !== 'What Success Looks Like is required'));
                      }
                    }}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      problemErrors.some(e => e.includes('Success')) ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Describe what success looks like for this problem..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feature/Functionality *
                  </label>
                  <select
                    value={problemType}
                    onChange={(e) => setProblemType(e.target.value as 'tooling' | 'user-facing' | 'infrastructure')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tooling">🔧 Tooling</option>
                    <option value="user-facing">👥 User-Facing Feature</option>
                    <option value="infrastructure">⚙️ Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <select
                    value={problemPriority}
                    onChange={(e) => setProblemPriority(e.target.value as 'must-have' | 'nice-to-have')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="must-have">Must Have</option>
                    <option value="nice-to-have">Nice to Have</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeline Bucket *
                  </label>
                  <select
                    value={problemTimeline}
                    onChange={(e) => setProblemTimeline(e.target.value as TimelineSection)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="now">NOW | Q3</option>
                    <option value="next">NEXT | Q4</option>
                    <option value="later">LATER | Q1</option>
                  </select>
                </div>
                
                {/* Validation Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Learning Validation</h4>
                  
                  {/* Pre-Build Validation */}
                  <div className="mb-4">
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={hasPreBuildValidation}
                        onChange={(e) => setHasPreBuildValidation(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Pre-Build Validation</span>
                    </label>
                    {hasPreBuildValidation && (
                      <div className="ml-6 space-y-4 mt-2">
                        {/* User Testing */}
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={preBuildMethods.includes('user-testing')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPreBuildMethods([...preBuildMethods, 'user-testing']);
                                } else {
                                  setPreBuildMethods(preBuildMethods.filter(m => m !== 'user-testing'));
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium text-gray-700">User Testing (Rapid/Paper Prototype)</span>
                          </label>
                          {preBuildMethods.includes('user-testing') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                User Testing Notes
                              </label>
                              <textarea
                                value={preBuildUserTestingNotes}
                                onChange={(e) => setPreBuildUserTestingNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe what needs to be tested or validated before building..."
                              />
                            </div>
                          )}
                        </div>
                        {/* Internal Experimentation */}
                        <div className="space-y-2">
                          <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={preBuildMethods.includes('internal-experimentation')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newMethods: Array<'user-testing' | 'internal-experimentation'> = [...preBuildMethods, 'internal-experimentation'];
                                    setPreBuildMethods(newMethods);
                                    if (newMethods.length > 0 && problemErrors.includes('At least one Pre-Build Validation method must be selected')) {
                                      setProblemErrors(problemErrors.filter(err => err !== 'At least one Pre-Build Validation method must be selected'));
                                    }
                                  } else {
                                    setPreBuildMethods(preBuildMethods.filter((m): m is 'user-testing' | 'internal-experimentation' => m !== 'internal-experimentation'));
                                  }
                                }}
                                className="mr-2"
                              />
                            <span className="text-sm font-medium text-gray-700">Internal Experimentation</span>
                          </label>
                          {preBuildMethods.includes('internal-experimentation') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Internal Experimentation Notes
                              </label>
                              <textarea
                                value={preBuildInternalExperimentationNotes}
                                onChange={(e) => setPreBuildInternalExperimentationNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Additional notes for internal experimentation..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-Build Validation */}
                  <div>
                    <label className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={hasPostBuildValidation}
                        onChange={(e) => setHasPostBuildValidation(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Post-Build Validation</span>
                    </label>
                    {hasPostBuildValidation && (
                      <div className="ml-6 space-y-4 mt-2">
                        {/* User Validation */}
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={postBuildMethods.includes('user-validation')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPostBuildMethods([...postBuildMethods, 'user-validation']);
                                } else {
                                  setPostBuildMethods(postBuildMethods.filter(m => m !== 'user-validation'));
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium text-gray-700">User Validation</span>
                          </label>
                          {postBuildMethods.includes('user-validation') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                User Validation Notes
                              </label>
                              <textarea
                                value={postBuildUserValidationNotes}
                                onChange={(e) => setPostBuildUserValidationNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="What to validate with users after implementation..."
                              />
                            </div>
                          )}
                        </div>
                        {/* SME Evaluation */}
                        <div className="space-y-2">
                          <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={postBuildMethods.includes('sme-evaluation')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const newMethods: Array<'user-validation' | 'sme-evaluation'> = [...postBuildMethods, 'sme-evaluation'];
                                    setPostBuildMethods(newMethods);
                                    if (newMethods.length > 0 && problemErrors.includes('At least one Post-Build Validation method must be selected')) {
                                      setProblemErrors(problemErrors.filter(err => err !== 'At least one Post-Build Validation method must be selected'));
                                    }
                                  } else {
                                    setPostBuildMethods(postBuildMethods.filter((m): m is 'user-validation' | 'sme-evaluation' => m !== 'sme-evaluation'));
                                  }
                                }}
                                className="mr-2"
                              />
                            <span className="text-sm font-medium text-gray-700">SME Evaluation</span>
                          </label>
                          {postBuildMethods.includes('sme-evaluation') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                SME Evaluation Notes
                              </label>
                              <textarea
                                value={postBuildSmeEvaluationNotes}
                                onChange={(e) => setPostBuildSmeEvaluationNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="What to validate with SMEs after implementation..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Engineering Review */}
                  <div className="mt-6 pt-6 border-t border-gray-300">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Engineering Review</h4>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={engineeringReviewed}
                          onChange={(e) => setEngineeringReviewed(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Engineering has reviewed</span>
                      </label>
                      
                      {engineeringReviewed && (
                        <div className="ml-6 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes (Follow-up / Deeper Dive)
                            </label>
                            <textarea
                              value={engineeringNotes}
                              onChange={(e) => setEngineeringNotes(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Any follow-up needed or deeper dive required..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Risk Level
                            </label>
                            <select
                              value={riskLevel}
                              onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high' | '')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select risk level...</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Certainty
                            </label>
                            <input
                              type="text"
                              value={certainty}
                              onChange={(e) => setCertainty(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 75%, High, Medium confidence..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              T-Shirt Size Estimate
                            </label>
                            <select
                              value={tshirtSize}
                              onChange={(e) => setTshirtSize(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select size...</option>
                              <option value="XS">XS</option>
                              <option value="S">S</option>
                              <option value="M">M</option>
                              <option value="L">L</option>
                              <option value="XL">XL</option>
                              <option value="XXL">XXL</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Confluence Page URL
                            </label>
                            <input
                              type="url"
                              value={confluenceUrl}
                              onChange={(e) => setConfluenceUrl(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://confluence.example.com/..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              JIRA Epic URL
                            </label>
                            <input
                              type="url"
                              value={jiraEpicUrl}
                              onChange={(e) => setJiraEpicUrl(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://jira.example.com/..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProblem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingProblemId ? 'Update Problem to Solve' : 'Add Problem to Solve'}
                  </button>
                  {editingProblemId && (
                    <button
                      onClick={() => {
                        setEditingProblemId(null);
                        setProblemTitle('');
                        setProblemDescription('');
                        setSuccessCriteria('');
                        setProblemType('user-facing');
                        setProblemTimeline('now');
                        setProblemPriority('must-have');
                        setHasPreBuildValidation(false);
                        setPreBuildMethods([]);
                        setPreBuildUserTestingNotes('');
                        setPreBuildInternalExperimentationNotes('');
                        setHasPostBuildValidation(false);
                        setPostBuildMethods([]);
                        setPostBuildUserValidationNotes('');
                        setPostBuildSmeEvaluationNotes('');
                        setProblemErrors([]);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  )}
                </div>
            </div>
          </div>
        )}

        {/* Problems List - Show in Phase 2 */}
        {phase === 'problems' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">
              Current Problems to Solve
            </h3>
            {roadmap.outcomes.length === 0 ? (
              <p className="text-gray-600">No expected outcomes added yet. Add an expected outcome first.</p>
            ) : (
              <div className="space-y-4">
                {roadmap.outcomes
                  .sort((a, b) => {
                    // Sort by start timeline: now > next > later
                    const getStartPriority = (outcome: typeof a): number => {
                      if (!outcome.timeline || !outcome.timeline.sections || outcome.timeline.sections.length === 0) return 4;
                      if (outcome.timeline.sections.includes('now')) return 1;
                      if (outcome.timeline.sections.includes('next')) return 2;
                      return 3; // only later
                    };
                    return getStartPriority(a) - getStartPriority(b);
                  })
                  .map(outcome => (
                  outcome.problems.length > 0 && (
                    <div key={outcome.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{outcome.title}</h4>
                      <div className="space-y-2">
                        {outcome.problems
                          .sort((a, b) => {
                            // Sort by type: user-facing > tooling > infrastructure
                            const getTypePriority = (type: string): number => {
                              if (type === 'user-facing') return 1;
                              if (type === 'tooling') return 2;
                              if (type === 'infrastructure') return 3;
                              return 4;
                            };
                            const aTypePriority = getTypePriority(a.type);
                            const bTypePriority = getTypePriority(b.type);
                            
                            if (aTypePriority !== bTypePriority) {
                              return aTypePriority - bTypePriority;
                            }
                            
                            // If same type, maintain array order
                            return 0;
                          })
                          .map(problem => (
                          <div key={problem.id} className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{problem.icon}</span>
                                  <h5 className="font-semibold text-gray-900">{problem.title}</h5>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{problem.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Timeline: {problem.timeline.toUpperCase()} | 
                                  Success: {problem.successCriteria.substring(0, 50)}{problem.successCriteria.length > 50 ? '...' : ''}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditProblem(outcome.id, problem.id)}
                                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                  title="Edit problem to solve"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProblem(outcome.id, problem.id)}
                                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                  title="Delete problem to solve"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {roadmap.outcomes.every(o => o.problems.length === 0) && (
                  <p className="text-gray-600">No problems to solve added yet. Start by adding your first problem above.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Roadmap View */}
        {phase === 'complete' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Roadmap</h2>
              </div>
              <div className="text-sm text-gray-600 mb-6">
                Last updated: {roadmap.metadata.lastUpdated}
              </div>
              
              {/* Filters */}
              <div className="mb-6">
                {!showFilters ? (
                  <button
                    onClick={() => setShowFilters(true)}
                    className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-left flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-gray-700">Add Filters</span>
                    <span className="text-gray-500">+</span>
                  </button>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => {
                            setShowFilters(false);
                            setSelectedFilterType(null);
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {/* Active Filters Display */}
                    {(priorityFilters.size < 2 || typeFilters.size < 3 || hasLearningValidation !== null || timelineFilters.size < 3) && (
                      <div className="mb-4 pb-4 border-b border-gray-300">
                        <p className="text-xs font-medium text-gray-600 mb-2">Active Filters:</p>
                        <div className="flex flex-wrap gap-2">
                          {priorityFilters.size < 2 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              Priority: {Array.from(priorityFilters).map(p => p === 'must-have' ? 'Must Have' : 'Nice to Have').join(', ')}
                            </span>
                          )}
                          {typeFilters.size < 3 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              Type: {Array.from(typeFilters).map(t => t === 'tooling' ? 'Tooling' : t === 'infrastructure' ? 'Infrastructure' : 'User-Facing').join(', ')}
                            </span>
                          )}
                          {hasLearningValidation !== null && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              Learning Validation: {hasLearningValidation ? 'Has Validation' : 'No Validation'}
                            </span>
                          )}
                          {timelineFilters.size < 3 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              Timeline: {Array.from(timelineFilters).map(t => t.toUpperCase()).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Filter Type Selection */}
                    {!selectedFilterType ? (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">Select a filter type:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button
                            onClick={() => setSelectedFilterType('priority')}
                            className="px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="font-medium text-gray-900">Priority</div>
                            <div className="text-xs text-gray-500 mt-1">Must Have, Nice to Have</div>
                          </button>
                          <button
                            onClick={() => setSelectedFilterType('type')}
                            className="px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="font-medium text-gray-900">Type</div>
                            <div className="text-xs text-gray-500 mt-1">Tooling, User-Facing, Infrastructure</div>
                          </button>
                          <button
                            onClick={() => setSelectedFilterType('learning-validation')}
                            className="px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="font-medium text-gray-900">Learning Validation</div>
                            <div className="text-xs text-gray-500 mt-1">Has validation methods</div>
                          </button>
                          <button
                            onClick={() => setSelectedFilterType('timeline')}
                            className="px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="font-medium text-gray-900">Timeline</div>
                            <div className="text-xs text-gray-500 mt-1">NOW, NEXT, LATER</div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedFilterType(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ← Back
                            </button>
                            <h4 className="font-medium text-gray-900">
                              {selectedFilterType === 'priority' && 'Priority Filter'}
                              {selectedFilterType === 'type' && 'Type Filter'}
                              {selectedFilterType === 'learning-validation' && 'Learning Validation Filter'}
                              {selectedFilterType === 'timeline' && 'Timeline Filter'}
                            </h4>
                          </div>
                        </div>

                        {/* Priority Filter Options */}
                        {selectedFilterType === 'priority' && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Select priorities:</label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={priorityFilters.has('must-have')}
                                  onChange={() => togglePriorityFilter('must-have')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">🔴 Must Have</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={priorityFilters.has('nice-to-have')}
                                  onChange={() => togglePriorityFilter('nice-to-have')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">🟡 Nice to Have</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Type Filter Options */}
                        {selectedFilterType === 'type' && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Select types:</label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={typeFilters.has('tooling')}
                                  onChange={() => toggleTypeFilter('tooling')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">🔧 Tooling</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={typeFilters.has('user-facing')}
                                  onChange={() => toggleTypeFilter('user-facing')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">👥 User-Facing Feature</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={typeFilters.has('infrastructure')}
                                  onChange={() => toggleTypeFilter('infrastructure')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">⚙️ Infrastructure</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Learning Validation Filter Options */}
                        {selectedFilterType === 'learning-validation' && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Learning Validation:</label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={hasLearningValidation === true}
                                onChange={(e) => {
                                  setHasLearningValidation(e.target.checked ? true : null);
                                  if (!e.target.checked) {
                                    setSelectedFilterType(null);
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">Has Learning Validation</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                              Shows only problems with pre-build or post-build validation methods
                            </p>
                          </div>
                        )}

                        {/* Timeline Filter Options */}
                        {selectedFilterType === 'timeline' && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Select timelines:</label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={timelineFilters.has('now')}
                                  onChange={() => toggleTimelineFilter('now')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">NOW</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={timelineFilters.has('next')}
                                  onChange={() => toggleTimelineFilter('next')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">NEXT</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={timelineFilters.has('later')}
                                  onChange={() => toggleTimelineFilter('later')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700">LATER</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Done button */}
                        <div className="mt-4">
                          <button
                            onClick={() => setSelectedFilterType(null)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Timeline Sections - Horizontal Calendar View with Spanning Outcomes */}
              <div className="space-y-6">
                {/* Column Headers */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(['now', 'next', 'later'] as TimelineSection[]).map(section => {
                    if (!timelineFilters.has(section)) {
                      return <div key={section}></div>; // Empty div to maintain grid layout
                    }
                    return (
                      <div key={section}>
                        <h3 className="text-xl font-bold text-gray-900">
                          {roadmap.timeline[section].label}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {roadmap.timeline[section].period}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Outcomes with Spanning Bars */}
                {roadmap.outcomes
                  .sort((a, b) => {
                    // Sort by start timeline: now > next > later
                    const getStartPriority = (outcome: typeof a): number => {
                      if (!outcome.timeline || !outcome.timeline.sections || outcome.timeline.sections.length === 0) return 4;
                      if (outcome.timeline.sections.includes('now')) return 1;
                      if (outcome.timeline.sections.includes('next')) return 2;
                      return 3; // only later
                    };
                    return getStartPriority(a) - getStartPriority(b);
                  })
                  .map(outcome => {
                  const sections = outcome.timeline?.sections || [];
                  const sectionArray: TimelineSection[] = ['now', 'next', 'later'];
                  const startIndex = sectionArray.findIndex(s => sections.includes(s));
                  const endIndex = sectionArray.findLastIndex(s => sections.includes(s));
                  const colStart = startIndex + 1;
                  const colEnd = endIndex + 2;

                  return (
                    <div key={outcome.id} className="space-y-2">
                      {/* Spanning Outcome Bar */}
                      <div className="grid grid-cols-3 gap-4">
                        <div 
                          className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                          style={{
                            gridColumn: `${colStart} / ${colEnd}`
                          }}
                        >
                          <div className="w-full bg-black text-white flex items-center">
                            <button
                              onClick={() => toggleOutcomeExpanded(outcome.id)}
                              className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-800"
                            >
                              <span className="font-semibold text-sm">{outcome.title}</span>
                              <span className="text-xs">{outcome.isExpanded ? '▼' : '▶'}</span>
                            </button>
                            <button
                              onClick={() => handleEditOutcome(outcome.id)}
                              className="px-2 py-1 mr-2 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                              title="Edit expected outcome"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOutcome(outcome.id)}
                              className="px-2 py-1 mr-2 text-xs bg-red-700 hover:bg-red-600 rounded"
                              title="Delete expected outcome"
                            >
                              Delete
                            </button>
                          </div>
                          {outcome.isExpanded && (
                            <div className="border-t border-gray-200 p-3 bg-white">
                              <p className="text-xs text-gray-700">{outcome.description}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Problems in their respective columns */}
                      {outcome.isExpanded && (
                        <div className="grid grid-cols-3 gap-4">
                          {(['now', 'next', 'later'] as TimelineSection[]).map(section => {
                            // Only show this section if it's in the timeline filters
                            if (!timelineFilters.has(section)) {
                              return (
                                <div key={section} className="flex flex-col">
                                  <div className="space-y-2">
                                    <div className="text-xs text-gray-400 italic text-center p-4">
                                      Filtered out
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Get problems for this section and sort by type
                            const allSectionProblems = outcome.problems.filter(p => p.timeline === section);
                            const filteredProblems = allSectionProblems.filter(matchesFilters);
                            
                            // Sort by type: user-facing > tooling > infrastructure
                            const getTypePriority = (type: string): number => {
                              if (type === 'user-facing') return 1;
                              if (type === 'tooling') return 2;
                              if (type === 'infrastructure') return 3;
                              return 4; // fallback
                            };
                            
                            const sectionProblems = filteredProblems.sort((a, b) => {
                              const aTypePriority = getTypePriority(a.type);
                              const bTypePriority = getTypePriority(b.type);
                              
                              if (aTypePriority !== bTypePriority) {
                                return aTypePriority - bTypePriority;
                              }
                              
                              // If same type, sort by displayOrder if available
                              const aOrder = a.displayOrder ?? 0;
                              const bOrder = b.displayOrder ?? 0;
                              return aOrder - bOrder;
                            });
                            
                            return (
                              <div key={section} className="flex flex-col">
                                <div className="space-y-2">
                                  {sectionProblems.length === 0 ? (
                                    sections.includes(section) && (
                                      <button
                                        onClick={() => {
                                          setCurrentOutcomeId(outcome.id);
                                          setProblemTimeline(section);
                                          setPhase('problems');
                                          // Scroll to top of problems form
                                          setTimeout(() => {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                          }, 100);
                                        }}
                                        className="w-full text-xs text-gray-500 italic p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                                      >
                                        <span>+</span>
                                        <span>Add Problem</span>
                                      </button>
                                    )
                                  ) : (
                                    <>
                                      {sectionProblems.map(problem => {
                                        const isExpanded = expandedProblems.has(problem.id);
                                        return (
                                          <div
                                            key={problem.id}
                                            className="bg-gray-50 rounded p-3 border border-gray-200 group hover:border-blue-300 transition-colors"
                                          >
                                            <div className="flex items-start gap-2">
                                              <span className="text-lg">{problem.icon}</span>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                  <div className="flex items-center gap-2 flex-1">
                                                    <h4 className="font-semibold text-gray-900 text-sm">{problem.title}</h4>
                                                    {problem.engineeringReview?.reviewed && (
                                                      <span className="text-green-600" title="Engineering reviewed">✓</span>
                                                    )}
                                                    {problem.engineeringReview?.certainty && (
                                                      <span className="text-xs text-gray-500">({problem.engineeringReview.certainty})</span>
                                                    )}
                                                    <button
                                                      onClick={() => toggleProblemExpanded(problem.id)}
                                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                      title={isExpanded ? "Collapse details" : "Expand details"}
                                                    >
                                                      <span>{isExpanded ? '▼' : '▶'}</span>
                                                      <span className="text-xs">{isExpanded ? 'Less' : 'More'}</span>
                                                    </button>
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <button
                                                      onClick={() => handleEditProblem(outcome.id, problem.id)}
                                                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-opacity flex-shrink-0"
                                                      title="Edit problem to solve"
                                                    >
                                                      Edit
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteProblem(outcome.id, problem.id)}
                                                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-opacity flex-shrink-0"
                                                      title="Delete problem to solve"
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                </div>
                                                {isExpanded && (
                                                  <div className="mt-2 space-y-2">
                                                    <p className="text-xs text-gray-700">{problem.description}</p>
                                                    <div className="text-xs text-gray-600">
                                                      <strong>Success:</strong> {problem.successCriteria}
                                                    </div>
                                                    <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-300">
                                                      <div><strong>Type:</strong> {
                                                        problem.type === 'tooling' ? '🔧 Tooling' : 
                                                        problem.type === 'infrastructure' ? '⚙️ Infrastructure' : 
                                                        '👥 User-Facing'
                                                      }</div>
                                                      <div><strong>Priority:</strong> {problem.priority === 'must-have' ? '🔴 Must Have' : '🟡 Nice to Have'}</div>
                                                      <div>
                                                        <strong>Validation:</strong>
                                                        {problem.validation.preBuild && problem.validation.preBuild.methods.length > 0 && (
                                                          <div className="ml-2">
                                                            <strong>Pre-Build:</strong> {problem.validation.preBuild.methods.map(m => 
                                                              m === 'user-testing' ? 'User Testing' : 'Internal Experimentation'
                                                            ).join(', ')}
                                                          </div>
                                                        )}
                                                        {problem.validation.postBuild && problem.validation.postBuild.methods && problem.validation.postBuild.methods.length > 0 && (
                                                          <div className="ml-2">
                                                            <strong>Post-Build:</strong> {problem.validation.postBuild.methods.map(m => 
                                                              m === 'user-validation' ? 'User Validation' : 'SME Evaluation'
                                                            ).join(', ')}
                                                          </div>
                                                        )}
                                                      </div>
                                                      {problem.engineeringReview && (
                                                        <div className="mt-2 pt-2 border-t border-gray-300">
                                                          <div><strong>Engineering Review:</strong> {problem.engineeringReview.reviewed ? '✓ Reviewed' : 'Not reviewed'}</div>
                                                          {problem.engineeringReview.certainty && (
                                                            <div><strong>Certainty:</strong> {problem.engineeringReview.certainty}</div>
                                                          )}
                                                          {problem.engineeringReview.riskLevel && (
                                                            <div><strong>Risk:</strong> {problem.engineeringReview.riskLevel.charAt(0).toUpperCase() + problem.engineeringReview.riskLevel.slice(1)}</div>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {sections.includes(section) && (
                                        <button
                                          onClick={() => {
                                            setCurrentOutcomeId(outcome.id);
                                            setProblemTimeline(section);
                                            setPhase('problems');
                                            // Scroll to top of problems form
                                            setTimeout(() => {
                                              window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }, 100);
                                          }}
                                          className="w-full text-xs text-gray-500 italic p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                          <span>+</span>
                                          <span>Add Problem</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Outcomes List - Only show on Phase 1 (Expected Outcomes) */}
        {phase === 'outcomes' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">
              Current Expected Outcomes ({roadmap.outcomes.length})
            </h3>
            {roadmap.outcomes.length === 0 ? (
              <p className="text-gray-600">No expected outcomes added yet. Start by adding your first expected outcome above.</p>
            ) : (
              <div className="space-y-4">
                {roadmap.outcomes
                  .sort((a, b) => {
                    // Sort by start timeline: now > next > later
                    const getStartPriority = (outcome: typeof a): number => {
                      if (!outcome.timeline || !outcome.timeline.sections || outcome.timeline.sections.length === 0) return 4;
                      if (outcome.timeline.sections.includes('now')) return 1;
                      if (outcome.timeline.sections.includes('next')) return 2;
                      return 3; // only later
                    };
                    return getStartPriority(a) - getStartPriority(b);
                  })
                  .map(outcome => (
                  <div key={outcome.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Expected Outcome Header */}
                    <div className="p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{outcome.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{outcome.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => handleEditOutcome(outcome.id)}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                            title="Edit expected outcome"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Nested Problems to Solve */}
                    {outcome.problems.length > 0 && (
                      <div className="border-t border-gray-200 bg-white">
                        <button
                          onClick={() => toggleOutcomeProblemsExpanded(outcome.id)}
                          className="w-full px-3 py-2 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <h5 className="text-sm font-medium text-gray-700">Problems to Solve ({outcome.problems.length})</h5>
                          <span className="text-gray-600 text-sm">
                            {expandedOutcomeProblems.has(outcome.id) ? '−' : '+'}
                          </span>
                        </button>
                        {expandedOutcomeProblems.has(outcome.id) && (
                          <div className="divide-y divide-gray-100">
                            {outcome.problems
                              .sort((a, b) => {
                                // Sort by type: user-facing > tooling > infrastructure
                                const getTypePriority = (type: string): number => {
                                  if (type === 'user-facing') return 1;
                                  if (type === 'tooling') return 2;
                                  if (type === 'infrastructure') return 3;
                                  return 4;
                                };
                                const aTypePriority = getTypePriority(a.type);
                                const bTypePriority = getTypePriority(b.type);
                                
                                if (aTypePriority !== bTypePriority) {
                                  return aTypePriority - bTypePriority;
                                }
                                
                                // If same type, maintain array order
                                return 0;
                              })
                              .map(problem => (
                              <div key={problem.id} className="p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h6 className="font-medium text-gray-900 text-sm">{problem.title}</h6>
                                    <p className="text-sm text-gray-600 mt-1">{problem.description}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditProblem(outcome.id, problem.id)}
                                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                      title="Edit problem to solve"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProblem(outcome.id, problem.id)}
                                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                      title="Delete problem to solve"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {outcome.problems.length === 0 && (
                      <div className="px-3 py-2 bg-white border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">No problems to solve added yet</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orphaned Problems Section */}
        {phase === 'complete' && roadmap.orphanedProblems && roadmap.orphanedProblems.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Needs Outcomes Attached</h2>
            <p className="text-sm text-gray-600 mb-4">
              The following problems need to be attached to an expected outcome:
            </p>
            <div className="space-y-3">
              {roadmap.orphanedProblems.map(problem => (
                <div key={problem.id} className="bg-yellow-50 rounded p-4 border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{problem.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm mb-1">{problem.title}</h4>
                      <p className="text-xs text-gray-700 mb-2">{problem.description}</p>
                      <p className="text-xs text-gray-600">
                        Timeline: {problem.timeline.toUpperCase()} | 
                        Priority: {problem.priority === 'must-have' ? '🔴 Must Have' : '🟡 Nice to Have'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProblem(null, problem.id)}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                        title="Edit and attach to outcome"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProblem('', problem.id)}
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                        title="Delete orphaned problem"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              {deleteConfirm.type === 'problem' ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Problem to Solve?</h3>
                  <p className="text-sm text-gray-700 mb-6">
                    Are you sure you want to delete this problem? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={cancelDelete}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      No
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Expected Outcome?</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Are you sure you want to delete "{deleteConfirm.outcomeTitle}"?
                  </p>
                  {deleteConfirm.problems && deleteConfirm.problems.length > 0 ? (
                    <>
                      <p className="text-sm font-medium text-gray-900 mb-3">
                        The following problems to solve are attached to this outcome:
                      </p>
                      <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded p-3">
                        {deleteConfirm.problems.map(problem => (
                          <label key={problem.id} className="flex items-center gap-2 mb-2 p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={deleteConfirm.problemsToDelete?.has(problem.id) || false}
                              onChange={() => toggleProblemDeleteCheckbox(problem.id)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">{problem.title}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mb-4">
                        Check the boxes above to delete those problems. Unchecked problems will be moved to "Needs Outcomes Attached".
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={cancelDelete}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={confirmDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 mb-6">
                        This action cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={cancelDelete}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          No
                        </button>
                        <button
                          onClick={confirmDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Timeline Mismatch Warning Modal */}
        {timelineMismatchWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Mismatch</h3>
              <p className="text-sm text-gray-700 mb-4">
                The problem "<strong>{timelineMismatchWarning.problemTitle}</strong>" has a timeline of <strong>{timelineMismatchWarning.problemTimeline.toUpperCase()}</strong>, but the expected outcome "<strong>{timelineMismatchWarning.outcomeTitle}</strong>" spans <strong>{timelineMismatchWarning.outcomeTimelines.map(t => t.toUpperCase()).join(', ')}</strong>.
              </p>
              <p className="text-sm text-gray-700 mb-6">
                Please update the problem's timeline to match one of the outcome's timeline sections.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTimelineMismatchWarning(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Update the timeline to the first matching section
                    if (timelineMismatchWarning.outcomeTimelines.length > 0) {
                      setProblemTimeline(timelineMismatchWarning.outcomeTimelines[0]);
                      setTimelineMismatchWarning(null);
                      // Re-trigger save by calling handleAddProblem again
                      setTimeout(() => {
                        handleAddProblem();
                      }, 100);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update to {timelineMismatchWarning.outcomeTimelines[0]?.toUpperCase() || 'Match'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Mismatch Warning Modal */}
        {timelineMismatchWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Mismatch</h3>
              <p className="text-sm text-gray-700 mb-4">
                The problem "<strong>{timelineMismatchWarning.problemTitle}</strong>" has a timeline of <strong>{timelineMismatchWarning.problemTimeline.toUpperCase()}</strong>, but the expected outcome "<strong>{timelineMismatchWarning.outcomeTitle}</strong>" spans <strong>{timelineMismatchWarning.outcomeTimelines.map(t => t.toUpperCase()).join(', ')}</strong>.
              </p>
              <p className="text-sm text-gray-700 mb-6">
                Please update the problem's timeline to match one of the outcome's timeline sections.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTimelineMismatchWarning(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Update the timeline to the first matching section
                    if (timelineMismatchWarning.outcomeTimelines.length > 0) {
                      setProblemTimeline(timelineMismatchWarning.outcomeTimelines[0]);
                      setTimelineMismatchWarning(null);
                      // Re-trigger save by calling handleAddProblem again
                      setTimeout(() => {
                        handleAddProblem();
                      }, 100);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update to {timelineMismatchWarning.outcomeTimelines[0]?.toUpperCase() || 'Match'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

