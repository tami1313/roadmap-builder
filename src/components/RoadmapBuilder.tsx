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

  // Form states for outcomes
  const [outcomeTitle, setOutcomeTitle] = useState('');
  const [outcomeDescription, setOutcomeDescription] = useState('');
  const [outcomeTimeline, setOutcomeTimeline] = useState<TimelineSection[]>(['now']);
  const [iterations, setIterations] = useState<Array<{section: TimelineSection; version: 'good' | 'better' | 'best'; description: string}>>([]);

  // Form states for problems
  const [problemTitle, setProblemTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [problemType, setProblemType] = useState<'tooling' | 'user-facing'>('user-facing');
  const [problemTimeline, setProblemTimeline] = useState<TimelineSection>('now');
  // Validation states - can have both pre-build and post-build
  const [hasPreBuildValidation, setHasPreBuildValidation] = useState(false);
  const [preBuildMethods, setPreBuildMethods] = useState<Array<'user-testing' | 'internal-experimentation'>>([]);
  const [preBuildUserTestingNeeds, setPreBuildUserTestingNeeds] = useState('');
  const [preBuildValidationNotes, setPreBuildValidationNotes] = useState('');
  const [hasPostBuildValidation, setHasPostBuildValidation] = useState(false);
  const [postBuildValidationNotes, setPostBuildValidationNotes] = useState('');

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
    if (!outcomeTitle.trim() || !outcomeDescription.trim()) return;

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
                  sections: outcomeTimeline,
                  iterations: iterations.length > 0 ? iterations : undefined
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
          sections: outcomeTimeline,
          iterations: iterations.length > 0 ? iterations : undefined
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
    setIterations([]);
  };

  const handleEditOutcome = (outcomeId: string) => {
    const outcome = roadmap.outcomes.find(o => o.id === outcomeId);
    if (!outcome) return;

    setEditingOutcomeId(outcomeId);
    setOutcomeTitle(outcome.title);
    setOutcomeDescription(outcome.description);
    setOutcomeTimeline(outcome.timeline.sections);
    setIterations(outcome.timeline.iterations || []);
    setPhase('outcomes');
  };

  const handleAddProblem = () => {
    if (!currentOutcomeId || !problemTitle.trim() || !problemDescription.trim() || !successCriteria.trim()) return;

    const validation: Validation = {};
    
    if (hasPreBuildValidation && preBuildMethods.length > 0) {
      validation.preBuild = {
        methods: preBuildMethods,
        userTestingNeeds: preBuildUserTestingNeeds || undefined,
        validationNotes: preBuildValidationNotes || undefined
      };
    }
    
    if (hasPostBuildValidation) {
      validation.postBuild = {
        validationNotes: postBuildValidationNotes || undefined
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
    setHasPreBuildValidation(false);
    setPreBuildMethods([]);
    setPreBuildUserTestingNeeds('');
    setPreBuildValidationNotes('');
    setHasPostBuildValidation(false);
    setPostBuildValidationNotes('');
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
    
    // Set validation fields
    if (problem.validation.preBuild) {
      setHasPreBuildValidation(true);
      setPreBuildMethods(problem.validation.preBuild.methods || []);
      setPreBuildUserTestingNeeds(problem.validation.preBuild.userTestingNeeds || '');
      setPreBuildValidationNotes(problem.validation.preBuild.validationNotes || '');
    } else {
      setHasPreBuildValidation(false);
      setPreBuildMethods([]);
      setPreBuildUserTestingNeeds('');
      setPreBuildValidationNotes('');
    }
    
    if (problem.validation.postBuild) {
      setHasPostBuildValidation(true);
      setPostBuildValidationNotes(problem.validation.postBuild.validationNotes || '');
    } else {
      setHasPostBuildValidation(false);
      setPostBuildValidationNotes('');
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
      setIterations(prev => prev.filter(i => i.section !== section));
    }
  };

  const addIteration = () => {
    const sections = outcomeTimeline.filter(s => 
      !iterations.some(i => i.section === s)
    );
    if (sections.length > 0) {
      const versions: Array<'good' | 'better' | 'best'> = ['good', 'better', 'best'];
      const versionIndex = iterations.length;
      setIterations(prev => [...prev, {
        section: sections[0],
        version: versions[versionIndex] || 'good',
        description: ''
      }]);
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Outcome Title *
                </label>
                <input
                  type="text"
                  value={outcomeTitle}
                  onChange={(e) => setOutcomeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., User Navigation & Orientation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Outcome Description (Problem Statement) *
                </label>
                <textarea
                  value={outcomeDescription}
                  onChange={(e) => setOutcomeDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                {outcomeTimeline.length > 1 && (
                  <div className="mt-4">
                    <button
                      onClick={addIteration}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Iteration (Good → Better → Best)
                    </button>
                    {iterations.map((iter, idx) => (
                      <div key={idx} className="mt-2 p-3 bg-gray-50 rounded">
                        <div className="flex gap-2 items-center mb-2">
                          <span className="text-sm font-medium capitalize">{iter.section}</span>
                          <span className="text-sm text-gray-600">({iter.version})</span>
                        </div>
                        <input
                          type="text"
                          value={iter.description}
                          onChange={(e) => {
                            const newIters = [...iterations];
                            newIters[idx].description = e.target.value;
                            setIterations(newIters);
                          }}
                          placeholder="Iteration description"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
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
                      setIterations([]);
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
                    onChange={(e) => setProblemTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Build Directional Map Solution"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Problem Description *
                  </label>
                  <textarea
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the specific problem to solve..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What Success Looks Like *
                  </label>
                  <textarea
                    value={successCriteria}
                    onChange={(e) => setSuccessCriteria(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div className="ml-6 space-y-3 mt-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pre-Build Methods (can select both) *
                          </label>
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
                              <span className="text-sm">User Testing (Rapid/Paper Prototype)</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={preBuildMethods.includes('internal-experimentation')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPreBuildMethods([...preBuildMethods, 'internal-experimentation']);
                                  } else {
                                    setPreBuildMethods(preBuildMethods.filter(m => m !== 'internal-experimentation'));
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className="text-sm">Internal Experimentation</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            User Testing Notes
                          </label>
                          <textarea
                            value={preBuildUserTestingNeeds}
                            onChange={(e) => setPreBuildUserTestingNeeds(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe what needs to be tested or validated before building..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Internal Experimentation Notes
                          </label>
                          <textarea
                            value={preBuildValidationNotes}
                            onChange={(e) => setPreBuildValidationNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Additional notes for pre-build validation..."
                          />
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
                      <div className="ml-6 space-y-3 mt-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Post-Build Validation Notes
                          </label>
                          <textarea
                            value={postBuildValidationNotes}
                            onChange={(e) => setPostBuildValidationNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="What to validate after implementation..."
                          />
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
                        setHasPreBuildValidation(false);
                        setPreBuildMethods([]);
                        setPreBuildUserTestingNeeds('');
                        setPreBuildValidationNotes('');
                        setHasPostBuildValidation(false);
                        setPostBuildValidationNotes('');
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
              
              {/* Timeline Sections */}
              {(['now', 'next', 'later'] as TimelineSection[]).map(section => {
                const sectionOutcomes = roadmap.outcomes.filter(o => 
                  o.timeline.sections.includes(section)
                );
                if (sectionOutcomes.length === 0) return null;

                return (
                  <div key={section} className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {roadmap.timeline[section].label}
                    </h3>
                    {sectionOutcomes.map(outcome => (
                      <div key={outcome.id} className="mb-4">
                        <div className="w-full bg-blue-900 text-white rounded-t-lg flex items-center">
                          <button
                            onClick={() => toggleOutcomeExpanded(outcome.id)}
                            className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-blue-800 rounded-t-lg"
                          >
                            <span className="font-semibold">{outcome.title}</span>
                            <span className="text-sm">{outcome.isExpanded ? '▼' : '▶'}</span>
                          </button>
                          <button
                            onClick={() => handleEditOutcome(outcome.id)}
                            className="px-3 py-1 mr-2 text-xs bg-blue-700 hover:bg-blue-600 rounded"
                            title="Edit expected outcome"
                          >
                            Edit
                          </button>
                        </div>
                        {outcome.isExpanded && (
                          <div className="border border-gray-200 rounded-b-lg p-4 bg-white">
                            <p className="text-gray-700 mb-4">{outcome.description}</p>
                            <div className="space-y-3">
                              {outcome.problems
                                .filter(p => p.timeline === section)
                                .map(problem => (
                                <div key={problem.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 group hover:border-blue-300 transition-colors">
                                  <div className="flex items-start gap-3">
                                    <span className="text-2xl">{problem.icon}</span>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900">{problem.title}</h4>
                                        <button
                                          onClick={() => handleEditProblem(outcome.id, problem.id)}
                                          className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-opacity"
                                          title="Edit problem to solve"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                      <p className="text-sm text-gray-700 mb-2">{problem.description}</p>
                                      <div className="text-sm text-gray-600 mb-2">
                                        <strong>Success looks like:</strong> {problem.successCriteria}
                                      </div>
                                      <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-300">
                                        <div><strong>Feature/Functionality:</strong> {problem.type === 'tooling' ? '🔧 Tooling/Infrastructure' : '👥 User-Facing Feature'}</div>
                                        {problem.validation.preBuild && (
                                          <div>
                                            <strong>Pre-Build Validation:</strong> {problem.validation.preBuild.methods.join(', ')}
                                            {problem.validation.preBuild.userTestingNeeds && (
                                              <div className="ml-2">User Testing Notes: {problem.validation.preBuild.userTestingNeeds}</div>
                                            )}
                                            {problem.validation.preBuild.validationNotes && (
                                              <div className="ml-2">Internal Experimentation Notes: {problem.validation.preBuild.validationNotes}</div>
                                            )}
                                          </div>
                                        )}
                                        {problem.validation.postBuild && (
                                          <div>
                                            <strong>Post-Build Validation:</strong>
                                            {problem.validation.postBuild.validationNotes && (
                                              <div className="ml-2">Notes: {problem.validation.postBuild.validationNotes}</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
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

