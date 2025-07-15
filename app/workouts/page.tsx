"use client"

import { useState } from "react"
import { useWorkoutStore, SavedWorkout } from "@/store/workoutStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Play, Trash2, Calendar, Clock, Dumbbell } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SavedWorkoutsPage() {
  const { savedWorkouts, deleteWorkout, loadWorkout } = useWorkoutStore()
  const [selectedWorkout, setSelectedWorkout] = useState<SavedWorkout | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [workoutToDelete, setWorkoutToDelete] = useState<string | null>(null)
  const router = useRouter()

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    } else if (mins > 0) {
      return `${mins}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleStartWorkout = (workoutId: string) => {
    loadWorkout(workoutId)
    router.push('/')
  }

  const handleDeleteWorkout = (workoutId: string) => {
    deleteWorkout(workoutId)
    setIsDeleteDialogOpen(false)
    setWorkoutToDelete(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 p-2"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                Saved Workouts
              </h1>
              <p className="text-gray-300 text-lg">
                {savedWorkouts.length} workout{savedWorkouts.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
        </div>

        {/* Workouts Grid */}
        {savedWorkouts.length === 0 ? (
          <div className="text-center py-16">
            <Dumbbell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No saved workouts yet</h2>
            <p className="text-gray-400 mb-6">Create your first workout and save it for later!</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                Create Workout
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedWorkouts.map((workout) => (
              <Card key={workout.id} className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{workout.name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setWorkoutToDelete(workout.id)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {workout.description && (
                    <p className="text-gray-300 text-sm">{workout.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-cyan-400" />
                      <span>{workout.exercises.length} exercises</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-400" />
                      <span>{formatDuration(workout.totalDuration)}</span>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    <span>Created: {formatDate(workout.createdAt)}</span>
                  </div>

                  {/* Last Used */}
                  {workout.lastUsed && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Play className="h-3 w-3" />
                      <span>Last used: {formatDate(workout.lastUsed)}</span>
                    </div>
                  )}

                  {/* Exercise Preview */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-gray-300">Exercises:</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      {workout.exercises.slice(0, 3).map((exercise, index) => (
                        <div key={exercise.id} className="flex justify-between">
                          <span>{exercise.name}</span>
                          <span>{formatDuration(exercise.duration)}</span>
                        </div>
                      ))}
                      {workout.exercises.length > 3 && (
                        <div className="text-center text-gray-500">
                          +{workout.exercises.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleStartWorkout(workout.id)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                    <Button
                      onClick={() => setSelectedWorkout(workout)}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Workout Details Dialog */}
        <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
          <DialogContent className="bg-black/50 backdrop-blur-xl border border-white/20 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedWorkout?.name}</DialogTitle>
              {selectedWorkout?.description && (
                <p className="text-gray-300">{selectedWorkout.description}</p>
              )}
            </DialogHeader>
            
            {selectedWorkout && (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-cyan-400">{selectedWorkout.exercises.length}</div>
                    <div className="text-sm text-gray-300">Exercises</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-400">{formatDuration(selectedWorkout.totalDuration)}</div>
                    <div className="text-sm text-gray-300">Duration</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">
                      {Math.round(selectedWorkout.totalDuration / selectedWorkout.exercises.length / 60)}m
                    </div>
                    <div className="text-sm text-gray-300">Avg/Exercise</div>
                  </div>
                </div>

                {/* Exercise List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Exercise List</h3>
                  <div className="space-y-2">
                    {selectedWorkout.exercises.map((exercise, index) => (
                      <div key={exercise.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm bg-white/20 rounded-full w-6 h-6 flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium">{exercise.name}</span>
                        </div>
                        <div className="text-sm text-gray-300">
                          {formatDuration(exercise.duration)} work • {formatDuration(exercise.restTime)} rest
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => {
                    handleStartWorkout(selectedWorkout.id)
                    setSelectedWorkout(null)
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start This Workout
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-black/50 backdrop-blur-xl border border-white/20 text-white">
            <DialogHeader>
              <DialogTitle>Delete Workout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete this workout? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsDeleteDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => workoutToDelete && handleDeleteWorkout(workoutToDelete)}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/20"
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
