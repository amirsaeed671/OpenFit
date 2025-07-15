import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Exercise {
  id: string
  name: string
  duration: number // in seconds
  restTime: number // in seconds
  videoUrl: string
  description?: string
  category?: string
  equipment?: string
}

export interface SavedWorkout {
  id: string
  name: string
  description?: string
  exercises: Exercise[]
  createdAt: Date
  lastUsed?: Date
  totalDuration: number // calculated total workout time
}

interface WorkoutStore {
  savedWorkouts: SavedWorkout[]
  currentWorkout: Exercise[]
  
  // Actions
  saveWorkout: (name: string, exercises: Exercise[], description?: string) => void
  deleteWorkout: (id: string) => void
  loadWorkout: (id: string) => Exercise[]
  updateWorkoutLastUsed: (id: string) => void
  clearCurrentWorkout: () => void
  setCurrentWorkout: (exercises: Exercise[]) => void
}

const calculateTotalDuration = (exercises: Exercise[]): number => {
  return exercises.reduce((total, exercise) => {
    return total + exercise.duration + exercise.restTime
  }, 0)
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      savedWorkouts: [],
      currentWorkout: [],

      saveWorkout: (name: string, exercises: Exercise[], description?: string) => {
        const newWorkout: SavedWorkout = {
          id: Date.now().toString(),
          name,
          description,
          exercises: [...exercises],
          createdAt: new Date(),
          totalDuration: calculateTotalDuration(exercises),
        }

        set((state) => ({
          savedWorkouts: [...state.savedWorkouts, newWorkout]
        }))
      },

      deleteWorkout: (id: string) => {
        set((state) => ({
          savedWorkouts: state.savedWorkouts.filter(workout => workout.id !== id)
        }))
      },

      loadWorkout: (id: string) => {
        const workout = get().savedWorkouts.find(w => w.id === id)
        if (workout) {
          set(() => ({
            currentWorkout: [...workout.exercises]
          }))
          // Update last used
          get().updateWorkoutLastUsed(id)
          return workout.exercises
        }
        return []
      },

      updateWorkoutLastUsed: (id: string) => {
        set((state) => ({
          savedWorkouts: state.savedWorkouts.map(workout =>
            workout.id === id 
              ? { ...workout, lastUsed: new Date() }
              : workout
          )
        }))
      },

      clearCurrentWorkout: () => {
        set(() => ({
          currentWorkout: []
        }))
      },

      setCurrentWorkout: (exercises: Exercise[]) => {
        set(() => ({
          currentWorkout: [...exercises]
        }))
      },
    }),
    {
      name: 'openfit-workouts',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        savedWorkouts: state.savedWorkouts 
      }),
    }
  )
)
