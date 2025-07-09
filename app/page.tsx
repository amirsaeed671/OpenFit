"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Play, Pause, SkipForward, Trash2, Edit } from "lucide-react"
import confetti from "canvas-confetti"

interface Exercise {
  id: string
  name: string
  duration: number // in seconds
  restTime: number // in seconds
  gifUrl: string
}

export default function FitnessApp() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Form state
  const [exerciseName, setExerciseName] = useState("")
  const [exerciseDuration, setExerciseDuration] = useState("")
  const [restTime, setRestTime] = useState("")
  const [gifUrl, setGifUrl] = useState("")

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Create beep sound
  const playBeep = (frequency = 800, duration = 200) => {
    if (!audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.value = frequency
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration / 1000)
  }

  // Speak countdown numbers
  const speakCountdown = (number: number) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(number.toString())
      utterance.rate = 1.2
      utterance.volume = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  // Trigger confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  // Add or update exercise
  const handleSaveExercise = () => {
    if (!exerciseName || !exerciseDuration || !restTime) return

    const exerciseData = {
      id: editingExercise?.id || Date.now().toString(),
      name: exerciseName,
      duration: Number.parseInt(exerciseDuration),
      restTime: Number.parseInt(restTime),
      gifUrl: gifUrl || `/placeholder.svg?height=200&width=300&text=${encodeURIComponent(exerciseName)}`,
    }

    if (editingExercise) {
      setExercises((prev) => prev.map((ex) => (ex.id === editingExercise.id ? exerciseData : ex)))
    } else {
      setExercises((prev) => [...prev, exerciseData])
    }

    // Reset form
    setExerciseName("")
    setExerciseDuration("")
    setRestTime("")
    setGifUrl("")
    setEditingExercise(null)
    setIsAddDialogOpen(false)
  }

  // Delete exercise
  const deleteExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
  }

  // Edit exercise
  const editExercise = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setExerciseName(exercise.name)
    setExerciseDuration(exercise.duration.toString())
    setRestTime(exercise.restTime.toString())
    setGifUrl(exercise.gifUrl)
    setIsAddDialogOpen(true)
  }

  // Start workout
  const startWorkout = () => {
    if (exercises.length === 0) return

    setIsWorkoutActive(true)
    setCurrentExerciseIndex(0)
    setTimeRemaining(exercises[0].duration)
    setIsResting(false)
    setIsPaused(false)
  }

  // Stop workout
  const stopWorkout = () => {
    setIsWorkoutActive(false)
    setCurrentExerciseIndex(0)
    setTimeRemaining(0)
    setIsResting(false)
    setIsPaused(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  // Skip to next exercise
  const skipToNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextIndex)
      setTimeRemaining(exercises[nextIndex].duration)
      setIsResting(false)
    } else {
      // Workout complete
      stopWorkout()
      triggerConfetti()
    }
  }

  // Timer effect
  useEffect(() => {
    if (isWorkoutActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time's up for current phase
            if (!isResting) {
              // Exercise finished, start rest
              if (exercises[currentExerciseIndex].restTime > 0) {
                setIsResting(true)
                return exercises[currentExerciseIndex].restTime
              } else {
                // No rest time, move to next exercise
                skipToNext()
                return 0
              }
            } else {
              // Rest finished, move to next exercise
              skipToNext()
              return 0
            }
          } else {
            // Countdown audio cues
            if (prev <= 3 && prev > 0) {
              speakCountdown(prev - 1)
              playBeep(prev === 1 ? 1000 : 800)
            }
            return prev - 1
          }
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isWorkoutActive, isPaused, isResting, currentExerciseIndex, exercises])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            FitFlow
          </h1>
          <p className="text-gray-300 text-lg">Your Personal Workout Companion</p>
        </div>

        {!isWorkoutActive ? (
          /* Exercise Management View */
          <div className="space-y-6">
            {/* Add Exercise Button */}
            <div className="flex justify-center">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-8 py-3 rounded-2xl transition-all duration-300"
                    onClick={() => {
                      setEditingExercise(null)
                      setExerciseName("")
                      setExerciseDuration("")
                      setRestTime("")
                      setGifUrl("")
                    }}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Exercise
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/50 backdrop-blur-xl border border-white/20 text-white">
                  <DialogHeader>
                    <DialogTitle>{editingExercise ? "Edit Exercise" : "Add New Exercise"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Exercise Name</Label>
                      <Input
                        id="name"
                        value={exerciseName}
                        onChange={(e) => setExerciseName(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        placeholder="e.g., Push-ups"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="duration">Duration (seconds)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={exerciseDuration}
                          onChange={(e) => setExerciseDuration(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rest">Rest Time (seconds)</Label>
                        <Input
                          id="rest"
                          type="number"
                          value={restTime}
                          onChange={(e) => setRestTime(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="gif">GIF URL (optional)</Label>
                      <Input
                        id="gif"
                        value={gifUrl}
                        onChange={(e) => setGifUrl(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                        placeholder="https://example.com/exercise.gif"
                      />
                    </div>
                    <Button
                      onClick={handleSaveExercise}
                      className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                    >
                      {editingExercise ? "Update Exercise" : "Add Exercise"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Exercise List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exercises.map((exercise) => (
                <Card key={exercise.id} className="bg-white/10 backdrop-blur-md border border-white/20 text-white">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{exercise.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editExercise(exercise)}
                          className="h-8 w-8 p-0 hover:bg-white/20"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteExercise(exercise.id)}
                          className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-black/20">
                      <img
                        src={exercise.gifUrl || "/placeholder.svg"}
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Duration: {formatTime(exercise.duration)}</span>
                      <span>Rest: {formatTime(exercise.restTime)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Start Workout Button */}
            {exercises.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={startWorkout}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-12 py-4 rounded-2xl text-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  <Play className="mr-3 h-6 w-6" />
                  Start Workout
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Workout Player View */
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 text-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">
                  {isResting ? "Rest Time" : exercises[currentExerciseIndex]?.name}
                </CardTitle>
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-gray-300">
                  Exercise {currentExerciseIndex + 1} of {exercises.length}
                </p>
              </CardHeader>
              <CardContent>
                {!isResting && (
                  <div className="aspect-video mb-6 rounded-lg overflow-hidden bg-black/20">
                    <img
                      src={exercises[currentExerciseIndex]?.gifUrl || "/placeholder.svg"}
                      alt={exercises[currentExerciseIndex]?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-2 mb-6">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${((currentExerciseIndex + (isResting ? 0.5 : 0)) / exercises.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={togglePause}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl"
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                  <Button
                    onClick={skipToNext}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={stopWorkout}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl"
                  >
                    Stop
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
