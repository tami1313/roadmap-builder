'use client';

import { useState, useEffect } from 'react';
import { Roadmap, Outcome, Problem, TimelineSection, Validation } from '@/types/roadmap';
import { defaultRoadmap, getIconForType } from '@/lib/roadmapSchema';
import { saveRoadmap, loadRoadmap } from '@/lib/storage';
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
  const [outcomeErrors, setOutcomeErrors] = useState<string[]>([]);
  const [problemErrors, setProblemErrors] = useState<string[]>([]);

  // Form states for outcomes
  const [outcomeTitle, setOutcomeTitle] = useState('');
  const [outcomeDescription, setOutcomeDescription] = useState('');
  const [outcomeTimeline, setOutcomeTimeline] = useState<TimelineSection[]>(['now']);

  // Form states for problems
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [problemType, setProblemType] = useState<'tooling' | 'user-facing'>('user-facing');
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

  useEffect(() => {
    const loaded = loadRoadmap();
    if (loaded) {
      setRoadmap(loaded);
      if (loaded.outcomes.length > 0) {
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

    const validation: Validation = {};
    
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

    if (editingProblemId && currentOutcomeId) {
      // Update existing problem
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
                        validation
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
    } else {
      // Add new problem
      const newProblem: Problem = {
        id: uuidv4(),
        title: problemTitle,
        description: problemDescription,
        successCriteria: successCriteria,
        type: problemType || 'user-facing', // Default to user-facing if not set (will be set by dev lead later)
        icon: getIconForType(problemType || 'user-facing'),
        timeline: problemTimeline,
        priority: problemPriority,
        validation
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
    setProblemErrors([]);
  };

  const handleEditProblem = (outcomeId: string, problemId: string) => {
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

  const handleTimelineChange = (section: TimelineSection, checked: boolean) => {
    if (checked) {
      setOutcomeTimeline(prev => [...prev, section]);
    } else {
      setOutcomeTimeline(prev => prev.filter(s => s !== section));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Roadmap Builder</h1>
          <p className="text-gray-600">Last updated: {roadmap.metadata.lastUpdated}</p>
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
              <select
                value={currentOutcomeId || ''}
                onChange={(e) => setCurrentOutcomeId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an expected outcome --</option>
                {roadmap.outcomes.map(outcome => (
                  <option key={outcome.id} value={outcome.id}>
                    {outcome.title}
                  </option>
                ))}
              </select>
            </div>
            {currentOutcomeId && (
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
                    onChange={(e) => setProblemType(e.target.value as 'tooling' | 'user-facing')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tooling">🔧 Tooling/Infrastructure</option>
                    <option value="user-facing">👥 User-Facing Feature</option>
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
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Validation (Optional - can select both)</h4>
                  
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
            )}
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
                {roadmap.outcomes.map(outcome => (
                  outcome.problems.length > 0 && (
                    <div key={outcome.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{outcome.title}</h4>
                      <div className="space-y-2">
                        {outcome.problems.map(problem => (
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
                              <button
                                onClick={() => handleEditProblem(outcome.id, problem.id)}
                                className="ml-3 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                title="Edit problem to solve"
                              >
                                Edit
                              </button>
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
              
              {/* Timeline Sections - Horizontal Calendar View */}
              <div className="grid grid-cols-3 gap-4">
                {(['now', 'next', 'later'] as TimelineSection[]).map(section => {
                  const sectionOutcomes = roadmap.outcomes.filter(o => 
                    o.timeline.sections.includes(section)
                  );

                  return (
                    <div key={section} className="flex flex-col">
                      {/* Column Header */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {roadmap.timeline[section].label}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {roadmap.timeline[section].period}
                        </p>
                      </div>
                      
                      {/* Column Content */}
                      <div className="flex-1 space-y-4 min-h-[200px]">
                        {sectionOutcomes.length === 0 ? (
                          <div className="text-sm text-gray-400 italic p-4 border border-dashed border-gray-300 rounded-lg">
                            No items
                          </div>
                        ) : (
                          sectionOutcomes.map(outcome => (
                            <div key={outcome.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                              <div className="w-full bg-blue-900 text-white flex items-center">
                                <button
                                  onClick={() => toggleOutcomeExpanded(outcome.id)}
                                  className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-blue-800"
                                >
                                  <span className="font-semibold text-sm">{outcome.title}</span>
                                  <span className="text-xs">{outcome.isExpanded ? '▼' : '▶'}</span>
                                </button>
                                <button
                                  onClick={() => handleEditOutcome(outcome.id)}
                                  className="px-2 py-1 mr-2 text-xs bg-blue-700 hover:bg-blue-600 rounded"
                                  title="Edit expected outcome"
                                >
                                  Edit
                                </button>
                              </div>
                              {outcome.isExpanded && (
                                <div className="border-t border-gray-200 p-3 bg-white">
                                  <p className="text-xs text-gray-700 mb-3">{outcome.description}</p>
                                  <div className="space-y-2">
                                    {outcome.problems
                                      .filter(p => p.timeline === section)
                                      .map(problem => (
                                      <div key={problem.id} className="bg-gray-50 rounded p-3 border border-gray-200 group hover:border-blue-300 transition-colors">
                                        <div className="flex items-start gap-2">
                                          <span className="text-lg">{problem.icon}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                              <h4 className="font-semibold text-gray-900 text-sm">{problem.title}</h4>
                                              <button
                                                onClick={() => handleEditProblem(outcome.id, problem.id)}
                                                className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-opacity flex-shrink-0"
                                                title="Edit problem to solve"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                            <p className="text-xs text-gray-700 mb-2">{problem.description}</p>
                                            <div className="text-xs text-gray-600 mb-2">
                                              <strong>Success:</strong> {problem.successCriteria}
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-300">
                                              <div><strong>Type:</strong> {problem.type === 'tooling' ? '🔧 Tooling' : '👥 User-Facing'}</div>
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
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
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
                {roadmap.outcomes.map(outcome => (
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
                            {outcome.problems.map(problem => (
                              <div key={problem.id} className="p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h6 className="font-medium text-gray-900 text-sm">{problem.title}</h6>
                                    <p className="text-sm text-gray-600 mt-1">{problem.description}</p>
                                  </div>
                                  <button
                                    onClick={() => handleEditProblem(outcome.id, problem.id)}
                                    className="ml-3 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                    title="Edit problem to solve"
                                  >
                                    Edit
                                  </button>
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
      </div>
    </div>
  );
}

