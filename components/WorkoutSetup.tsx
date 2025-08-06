import React, { useState } from 'react';
import type { Workout, Round } from '../types';
import { PlusIcon, GripVerticalIcon, TrashIcon, SaveIcon, FolderOpenIcon } from './icons';

interface WorkoutSetupProps {
  workout: Workout;
  setWorkout: React.Dispatch<React.SetStateAction<Workout>>;
  onStart: () => void;
  onSave: () => void;
  onLoad: () => void;
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
      className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 p-2 rounded-lg shadow flex items-center space-x-3 transition-shadow"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="cursor-move text-slate-400 dark:text-slate-500">
        <GripVerticalIcon className="w-5 h-5"/>
      </div>
      <input
        type="text"
        placeholder="Exercise Name"
        value={round.exerciseName}
        onChange={(e) => updateRound(index, 'exerciseName', e.target.value)}
        className="flex-grow bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent"
      />
      <input
        type="number"
        min="0"
        value={round.workTime}
        onChange={(e) => updateRound(index, 'workTime', parseInt(e.target.value) || 0)}
        className="w-20 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-center"
        aria-label="Work time in seconds"
      />
      <input
        type="number"
        min="0"
        value={round.restTime}
        onChange={(e) => updateRound(index, 'restTime', parseInt(e.target.value) || 0)}
        className="w-20 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-center"
        aria-label="Rest time in seconds"
      />
      <button onClick={() => removeRound(index)} className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
        <TrashIcon className="w-6 h-6" />
      </button>
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
    <div className="min-h-screen">
      <div className="p-4 md:p-6 max-w-3xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center mb-4"><img src="/logo.png" alt="Tabata Timer Pro Logo" className="w-20 md:w-28 max-w-xs h-auto drop-shadow-lg" /></div>
          <div className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 p-5 rounded-xl shadow-lg">
            <input
              type="text"
              placeholder="My First Tabata"
              value={workout.name}
              onChange={(e) => updateWorkout('name', e.target.value)}
              className="w-full bg-transparent text-xl font-bold text-slate-800 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700 focus:border-brand-cyan-500 focus:outline-none focus:ring-0 pb-2 mb-4"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Number of Sets</span>
                <input type="number" min="1" value={workout.sets} onChange={(e) => updateWorkout('sets', parseInt(e.target.value))} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-cyan-500 border-transparent"/>
              </label>
              <label className="block">
                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Rest Time between Sets (s)</span>
                <input type="number" min="0" value={workout.setRestTime} onChange={(e) => updateWorkout('setRestTime', parseInt(e.target.value))} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-cyan-500 border-transparent"/>
              </label>
            </div>
          </div>
        </div>

        {/* Scrollable Rounds List */}
        <div className="flex-grow py-6 overflow-y-auto min-h-0">
          <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                  Rounds ({workout.rounds.length})
              </h2>
              <div className="flex items-center space-x-2">
                  <button onClick={onLoad} title="Load Workout" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                      <FolderOpenIcon />
                  </button>
                  <button onClick={onSave} title="Save Workout" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                      <SaveIcon />
                  </button>
              </div>
          </div>
          
          <div className="space-y-3">
              <div className="flex items-center text-xs uppercase text-slate-500 dark:text-slate-400 font-bold px-4 pb-2">
                  <span className="w-5 mr-3"></span>
                  <span className="flex-grow">Exercise Name</span>
                  <span className="w-20 text-center">Work</span>
                  <span className="w-20 text-center">Rest</span>
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
        </div>
        
        {/* Footer Buttons */}
        <div className="py-4 flex items-stretch gap-4 flex-shrink-0">
          <button onClick={addRound} className="w-full flex items-center justify-center space-x-2 bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold py-3 px-4 rounded-xl transition">
            <PlusIcon />
            <span>Add Round</span>
          </button>
        </div>
         <div className="pb-4 flex-shrink-0">
           <button
            onClick={onStart}
            className="w-full bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white font-bold text-lg py-4 px-4 rounded-xl shadow-lg shadow-brand-cyan-500/30 transform hover:scale-[1.02] transition"
          >
            Start Workout
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutSetup;
