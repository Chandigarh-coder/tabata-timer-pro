import React, { useState } from 'react';
import type { Workout, Round } from '../types';
import { PlusIcon, GripVerticalIcon, TrashIcon } from './icons';

interface WorkoutSetupProps {
  workout: Workout;
  setWorkout: React.Dispatch<React.SetStateAction<Workout>>;
  onStart: () => void;
}

const RoundCard: React.FC<{
  round: Round;
  index: number;
  updateRound: (index: number, field: keyof Round, value: string | number) => void;
  removeRound: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ round, index, updateRound, removeRound, onDragStart, onDragEnter, onDragEnd, onDragOver }) => {
  return (
    <div
      className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 p-2 sm:p-3 rounded-lg shadow transition-shadow"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      {/* Mobile: Stack vertically, Desktop: Horizontal flex */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-2 sm:flex sm:items-center sm:space-x-3 sm:gap-0">
        {/* Drag handle */}
        <div className="cursor-move text-slate-400 dark:text-slate-500 row-start-1 col-start-1 sm:row-auto sm:col-auto">
          <GripVerticalIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
        </div>
        
        {/* Exercise name - spans full width on mobile */}
        <input
          type="text"
          placeholder="Exercise Name"
          value={round.exerciseName}
          onChange={(e) => updateRound(index, 'exerciseName', e.target.value)}
          className="col-span-2 sm:col-span-1 sm:flex-grow bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-sm sm:text-base"
        />
        
        {/* Number inputs - side by side on mobile, inline on desktop */}
        <div className="col-span-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-center sm:contents">
          <input
            type="number"
            min="0"
            value={round.workTime}
            onChange={(e) => updateRound(index, 'workTime', parseInt(e.target.value) || 0)}
            className="w-full sm:w-16 lg:w-20 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-center text-sm sm:text-base"
            aria-label="Work time in seconds"
          />
          <input
            type="number"
            min="0"
            value={round.restTime}
            onChange={(e) => updateRound(index, 'restTime', parseInt(e.target.value) || 0)}
            className="w-full sm:w-16 lg:w-20 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-center text-sm sm:text-base"
            aria-label="Rest time in seconds"
          />
          <button 
            onClick={() => removeRound(index)} 
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 p-1 sm:p-0"
          >
            <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};


const WorkoutSetup: React.FC<WorkoutSetupProps> = ({ workout, setWorkout, onStart, onSave, onLoad }) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const updateWorkout = (field: keyof Workout, value: string | number) => {
    setWorkout((prev) => ({ ...prev, [field]: value }));
  };

  const addRound = () => {
    const lastRound = workout.rounds[workout.rounds.length - 1];
    setWorkout((prev) => ({
      ...prev,
      rounds: [
        ...prev.rounds,
        {
          id: crypto.randomUUID(),
          exerciseName: '',
          workTime: lastRound ? lastRound.workTime : 20,
          restTime: lastRound ? lastRound.restTime : 10,
        },
      ],
    }));
  };

  const removeRound = (index: number) => {
    if (workout.rounds.length <= 1) return; // Must have at least one round
    setWorkout((prev) => ({
      ...prev,
      rounds: prev.rounds.filter((_, i) => i !== index),
    }));
  };
  
  const updateRound = (index: number, field: keyof Round, value: string | number) => {
    const newRounds = [...workout.rounds];
    (newRounds[index] as any)[field] = value;
    setWorkout(prev => ({ ...prev, rounds: newRounds }));
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
     e.preventDefault();
     if (draggedItemIndex === null || draggedItemIndex === index) return;
     const newRounds = [...workout.rounds];
     const draggedItem = newRounds.splice(draggedItemIndex, 1)[0];
     newRounds.splice(index, 0, draggedItem);
     setDraggedItemIndex(index);
     setWorkout(prev => ({...prev, rounds: newRounds}));
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-4xl h-full flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 space-y-4 sm:space-y-6">
          <div className="text-center">
            <img 
              src="/logo.png" 
              alt="Tabata Timer Pro Logo" 
              className="w-16 sm:w-20 lg:w-28 h-auto mx-auto drop-shadow-lg" 
            />
          </div>
          
          <div className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 p-4 sm:p-6 rounded-xl shadow-lg">
            <input
              type="text"
              placeholder="My First Tabata"
              value={workout.name}
              onChange={(e) => updateWorkout('name', e.target.value)}
              className="w-full bg-transparent text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700 focus:border-brand-cyan-500 focus:outline-none focus:ring-0 pb-2 mb-4 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Number of Sets</span>
                <input 
                  type="number" 
                  min="1" 
                  value={workout.sets} 
                  onChange={(e) => updateWorkout('sets', parseInt(e.target.value))} 
                  className="block w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-cyan-500 border-transparent text-sm sm:text-base"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Rest Time between Sets (s)</span>
                <input 
                  type="number" 
                  min="0" 
                  value={workout.setRestTime} 
                  onChange={(e) => updateWorkout('setRestTime', parseInt(e.target.value))} 
                  className="block w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-cyan-500 border-transparent text-sm sm:text-base"
                />
              </label>
            </div>
          </div>
        </header>

        {/* Scrollable Rounds List */}
        <main className="flex-grow py-4 sm:py-6 overflow-y-auto min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200">
              Exercises ({workout.rounds.length})
            </h2>
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-6 py-3 bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white font-bold rounded-lg shadow-md shadow-brand-cyan-500/30 transition-all hover:shadow-lg hover:scale-[1.02]"
              aria-label="Start workout"
            >
              🚀 Start Workout
            </button>
          </div>
          
          <div className="space-y-3">
              {/* Header - hide on mobile, show on tablet+ */}
              <div className="hidden sm:flex items-center text-xs uppercase text-slate-500 dark:text-slate-400 font-bold px-4 pb-2">
                  <span className="w-5 mr-3"></span>
                  <span className="flex-grow">Exercise Name</span>
                  <span className="w-16 lg:w-20 text-center">Work</span>
                  <span className="w-16 lg:w-20 text-center">Rest</span>
                  <span className="w-6 ml-3"></span>
              </div>
              {workout.rounds.map((round, index) => (
                  <RoundCard 
                      key={round.id} 
                      round={round} 
                      index={index} 
                      updateRound={updateRound} 
                      removeRound={removeRound}
                      onDragStart={handleDragStart}
                      onDragEnter={handleDragEnter}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                  />
              ))}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="flex-shrink-0 py-4 sm:py-6">
          <button 
            onClick={addRound} 
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 text-slate-600 dark:text-slate-300 hover:opacity-90 font-semibold py-3 px-4 rounded-xl transition-all hover:shadow-md hover:scale-[1.01]"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="text-sm sm:text-base">Add Exercise</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default WorkoutSetup;
