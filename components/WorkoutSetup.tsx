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
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>, index: number) => void;
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: () => void;
  isDragging: boolean;
}> = ({ round, index, updateRound, removeRound, onDragStart, onDragEnter, onDragEnd, onDragOver, onTouchStart, onTouchMove, onTouchEnd, isDragging }) => {
  return (
    <div
      className={`bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 p-2 rounded-lg shadow flex items-center space-x-2 md:space-x-3 transition-shadow ${isDragging ? 'opacity-50 scale-105' : ''}`}
      draggable
      data-round-index={index}
      onDragStart={() => onDragStart(index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onTouchStart={(e) => onTouchStart(e, index)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <div className="cursor-move text-slate-400 dark:text-slate-500">
        <GripVerticalIcon className="w-4 md:w-5 h-4 md:h-5"/>
      </div>
      <input
        type="text"
        placeholder="Exercise Name"
        value={round.exerciseName}
        onChange={(e) => updateRound(index, 'exerciseName', e.target.value)}
        className="flex-grow bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-1.5 md:p-2 text-sm md:text-base focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent"
      />
      
      {/* Work time */}
      <input
        type="number"
        min="0"
        value={round.workTime}
        onChange={(e) => updateRound(index, 'workTime', parseInt(e.target.value) || 0)}
        className="w-16 md:w-20 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-1.5 md:p-2 text-sm md:text-base focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-center"
        aria-label="Work time in seconds"
      />
      
      {/* Rest time */}
      <input
        type="number"
        min="0"
        value={round.restTime}
        onChange={(e) => updateRound(index, 'restTime', parseInt(e.target.value) || 0)}
        className="w-16 md:w-20 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-md p-1.5 md:p-2 text-sm md:text-base focus:ring-2 focus:ring-brand-cyan-500 border-transparent focus:border-transparent text-center"
        aria-label="Rest time in seconds"
      />
      
      <button onClick={() => removeRound(index)} className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
        <TrashIcon className="w-5 md:w-6 h-5 md:h-6" />
      </button>
    </div>
  );
};


const WorkoutSetup: React.FC<WorkoutSetupProps> = ({ workout, setWorkout, onStart, onSave, onLoad }) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Touch event handlers for mobile drag & drop
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setDraggedItemIndex(index);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || draggedItemIndex === null) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    setTouchCurrentY(touch.clientY);
    
    // Find the element under the touch point
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const roundCard = elementBelow?.closest('[data-round-index]');
    
    if (roundCard) {
      const targetIndex = parseInt(roundCard.getAttribute('data-round-index') || '0');
      if (targetIndex !== draggedItemIndex) {
        const newRounds = [...workout.rounds];
        const draggedItem = newRounds.splice(draggedItemIndex, 1)[0];
        newRounds.splice(targetIndex, 0, draggedItem);
        setDraggedItemIndex(targetIndex);
        setWorkout(prev => ({...prev, rounds: newRounds}));
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedItemIndex(null);
    setTouchStartY(null);
    setTouchCurrentY(null);
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }

  return (
    <div className="min-h-screen">
      <div className="p-3 md:p-6 max-w-3xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0">
          <div className="flex justify-center mb-2"><img src="/logo.png" alt="Tabata Timer Pro Logo" className="w-16 md:w-28 max-w-xs h-auto drop-shadow-lg" /></div>
          <div className="bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 p-3 md:p-5 rounded-xl shadow-lg">
            <input
              type="text"
              placeholder="Tabata"
              value={workout.name}
              onChange={(e) => updateWorkout('name', e.target.value)}
              className="w-full bg-transparent text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700 focus:border-brand-cyan-500 focus:outline-none focus:ring-0 pb-2 mb-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-medium">Number of Sets</span>
                <input type="number" min="1" value={workout.sets} onChange={(e) => updateWorkout('sets', parseInt(e.target.value))} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-2 md:p-2.5 focus:ring-2 focus:ring-brand-cyan-500 border-transparent"/>
              </label>
              <label className="block">
                <span className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-medium">Rest Time between Sets (s)</span>
                <input type="number" min="0" value={workout.setRestTime} onChange={(e) => updateWorkout('setRestTime', parseInt(e.target.value))} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg p-2 md:p-2.5 focus:ring-2 focus:ring-brand-cyan-500 border-transparent"/>
              </label>
            </div>
          </div>
        </div>

        {/* Scrollable Rounds List */}
        <div className="flex-grow py-4 md:py-6 overflow-y-auto min-h-0">
          <div className="flex items-center mb-2 md:mb-3 px-1">
            <h2 className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-200 flex-1">
              Rounds ({workout.rounds.length})
            </h2>
            <button
              onClick={onStart}
              className="px-4 md:px-6 py-2 md:py-3 bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white font-bold text-sm md:text-base rounded-none shadow-md shadow-brand-cyan-500/30 transition-colors"
              aria-label="Start"
            >
              Start
            </button>
            <div className="flex-1"></div>
          </div>
          
          <div className="space-y-2 md:space-y-3">
              <div className="flex items-center text-xs uppercase text-slate-500 dark:text-slate-400 font-bold px-3 md:px-4 pb-1 md:pb-2">
                  <span className="w-4 md:w-5 mr-2 md:mr-3"></span>
                  <span className="flex-grow">Exercise Name</span>
                  <span className="w-16 md:w-20 text-center">Work</span>
                  <span className="w-16 md:w-20 text-center">Rest</span>
                  <span className="w-5 md:w-6 ml-2 md:ml-3"></span>
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
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      isDragging={isDragging && draggedItemIndex === index}
                  />
              ))}
          </div>
        </div>
        
        {/* Footer Buttons */}
        <div className="py-3 md:py-4 flex items-stretch gap-3 md:gap-4 flex-shrink-0">
          <button onClick={addRound} className="w-full flex items-center justify-center space-x-2 bg-gradient-to-br from-orange-200 via-pink-200 to-cyan-200 dark:from-red-900 dark:via-purple-900 dark:to-teal-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold py-2 md:py-3 px-3 md:px-4 rounded-xl transition text-sm md:text-base">
            <PlusIcon />
            <span>Add Round</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutSetup;
