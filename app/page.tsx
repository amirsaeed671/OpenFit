"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Play,
  Pause,
  SkipForward,
  Trash2,
  Edit,
  Save,
  BookOpen,
} from "lucide-react";
import confetti from "canvas-confetti";
import exerciseData from "@/data/exercises.json";
import { useWorkoutStore } from "@/store/workoutStore";
import type { Exercise } from "@/store/workoutStore";
import Link from "next/link";

interface PredefinedExercise {
  id: number;
  name: string;
  description: string;
  category: string;
  equipment: string;
  videoUrl: string;
}

export default function FitnessApp() {
  const { saveWorkout, currentWorkout, setCurrentWorkout } = useWorkoutStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Save workout dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingFromStore = useRef(false);

  // Form state
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [isCustomExercise, setIsCustomExercise] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [restTime, setRestTime] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Load current workout from store only on mount
  useEffect(() => {
    if (currentWorkout.length > 0 && exercises.length === 0) {
      isLoadingFromStore.current = true;
      setExercises(currentWorkout);
      isLoadingFromStore.current = false;
    }
  }, [currentWorkout]); // Removed exercises dependency to prevent loop

  // Update store when exercises change, but only if not loading from store
  useEffect(() => {
    if (!isLoadingFromStore.current) {
      setCurrentWorkout(exercises);
    }
  }, [exercises, setCurrentWorkout]);

  // Trigger confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Add or update exercise
  const handleSaveExercise = () => {
    if (!exerciseName || !exerciseDuration || !restTime) return;

    let finalExerciseName = exerciseName;
    let finalVideoUrl = videoUrl;

    // If using predefined exercise, get data from exercises.json
    if (!isCustomExercise && selectedExercise) {
      const predefinedExercise = exerciseData.exercises.find(
        (ex: PredefinedExercise) => ex.id.toString() === selectedExercise
      );
      if (predefinedExercise) {
        finalExerciseName = predefinedExercise.name;
        finalVideoUrl = predefinedExercise.videoUrl;
      }
    }

    const newExerciseData = {
      id: editingExercise?.id || Date.now().toString(),
      name: finalExerciseName,
      duration: Number.parseInt(exerciseDuration),
      restTime: Number.parseInt(restTime),
      videoUrl: finalVideoUrl,
    };

    if (editingExercise) {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === editingExercise.id ? newExerciseData : ex))
      );
    } else {
      setExercises((prev) => [...prev, newExerciseData]);
    }

    // Reset form
    setSelectedExercise("");
    setIsCustomExercise(false);
    setExerciseName("");
    setExerciseDuration("");
    setRestTime("");
    setVideoUrl("");
    setEditingExercise(null);
    setIsAddDialogOpen(false);
  };

  // Delete exercise
  const deleteExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  // Edit exercise
  const editExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseName(exercise.name);
    setExerciseDuration(exercise.duration.toString());
    setRestTime(exercise.restTime.toString());
    setVideoUrl(exercise.videoUrl);
    setIsCustomExercise(true); // When editing, allow custom modification
    setSelectedExercise("");
    setIsAddDialogOpen(true);
  };

  // Start workout
  const startWorkout = () => {
    if (exercises.length === 0) return;

    setIsWorkoutActive(true);
    setCurrentExerciseIndex(0);
    setTimeRemaining(exercises[0].duration);
    setIsResting(false);
    setIsPaused(false);
  };

  // Stop workout
  const stopWorkout = () => {
    setIsWorkoutActive(false);
    setCurrentExerciseIndex(0);
    setTimeRemaining(0);
    setIsResting(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Skip to next exercise
  const skipToNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setTimeRemaining(exercises[nextIndex].duration);
      setIsResting(false);
    } else {
      // Workout complete
      stopWorkout();
      triggerConfetti();
    }
  };

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
                setIsResting(true);
                return exercises[currentExerciseIndex].restTime;
              } else {
                // No rest time, move to next exercise
                skipToNext();
                return 0;
              }
            } else {
              // Rest finished, move to next exercise
              skipToNext();
              return 0;
            }
          } else {
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isWorkoutActive, isPaused, isResting, currentExerciseIndex, exercises]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Handle exercise selection from dropdown
  const handleExerciseSelection = (value: string) => {
    if (value === "custom") {
      setIsCustomExercise(true);
      setSelectedExercise("");
      setExerciseName("");
      setVideoUrl("");
    } else {
      setIsCustomExercise(false);
      setSelectedExercise(value);
      const predefinedExercise = exerciseData.exercises.find(
        (ex: PredefinedExercise) => ex.id.toString() === value
      );
      if (predefinedExercise) {
        setExerciseName(predefinedExercise.name);
        setVideoUrl(predefinedExercise.videoUrl);
      }
    }
  };

  // Save current workout
  const handleSaveWorkout = () => {
    if (!workoutName.trim() || exercises.length === 0) return;

    saveWorkout(
      workoutName.trim(),
      exercises,
      workoutDescription.trim() || undefined
    );
    setWorkoutName("");
    setWorkoutDescription("");
    setIsSaveDialogOpen(false);

    // Show success feedback
    triggerConfetti();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                OpenFit
              </h1>
              <p className="text-gray-300 text-lg">
                Your Personal Workout Companion
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <Link href="/workouts">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10 p-3"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  Saved Workouts
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {!isWorkoutActive ? (
          /* Exercise Management View */
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-8 py-3 rounded-2xl transition-all duration-300"
                    onClick={() => {
                      setEditingExercise(null);
                      setSelectedExercise("");
                      setIsCustomExercise(false);
                      setExerciseName("");
                      setExerciseDuration("");
                      setRestTime("");
                      setVideoUrl("");
                    }}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Exercise
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black/50 backdrop-blur-xl border border-white/20 text-white">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExercise ? "Edit Exercise" : "Add New Exercise"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="exercise-select">Select Exercise</Label>
                      <Select
                        value={isCustomExercise ? "custom" : selectedExercise}
                        onValueChange={handleExerciseSelection}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Choose an exercise or create custom" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/20">
                          {exerciseData.exercises.map((exercise) => (
                            <SelectItem
                              key={exercise.id}
                              value={exercise.id.toString()}
                              className="text-white hover:bg-white/10"
                            >
                              {exercise.name} - {exercise.category}
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="custom"
                            className="text-white hover:bg-white/10"
                          >
                            Create Custom Exercise
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(isCustomExercise || editingExercise) && (
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
                    )}

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

                    {(isCustomExercise || editingExercise) && (
                      <div>
                        <Label htmlFor="video">
                          YouTube Video URL (optional)
                        </Label>
                        <Input
                          id="video"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>
                    )}

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
            {exercises.length === 0 ? (
              <div className="text-center py-16">
                <Plus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-white mb-2">
                  No exercises added yet
                </h2>
                <p className="text-gray-400 mb-6">
                  Add your first exercise to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {exercise.name}
                        </CardTitle>
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
                        {exercise.videoUrl ? (
                          <img
                            src={`https://img.youtube.com/vi/${getYouTubeVideoId(
                              exercise.videoUrl
                            )}/maxresdefault.jpg`}
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <img
                            src="/placeholder.svg"
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-gray-300">
                        <span>Duration: {formatTime(exercise.duration)}</span>
                        <span>Rest: {formatTime(exercise.restTime)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {exercises.length > 0 && (
              <div className="flex justify-center gap-4 mt-8">
                <Dialog
                  open={isSaveDialogOpen}
                  onOpenChange={setIsSaveDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-8 py-3 rounded-2xl transition-all duration-300">
                      <Save className="mr-2 h-5 w-5" />
                      Save Workout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black/50 backdrop-blur-xl border border-white/20 text-white">
                    <DialogHeader>
                      <DialogTitle>Save Workout</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="workout-name">Workout Name *</Label>
                        <Input
                          id="workout-name"
                          value={workoutName}
                          onChange={(e) => setWorkoutName(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="e.g., Morning HIIT Routine"
                        />
                      </div>
                      <div>
                        <Label htmlFor="workout-description">
                          Description (optional)
                        </Label>
                        <Textarea
                          id="workout-description"
                          value={workoutDescription}
                          onChange={(e) =>
                            setWorkoutDescription(e.target.value)
                          }
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                          placeholder="Describe your workout..."
                          rows={3}
                        />
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-sm text-gray-300 mb-1">
                          This workout contains {exercises.length} exercise
                          {exercises.length !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          Total duration: ~
                          {Math.round(
                            exercises.reduce(
                              (acc, ex) => acc + ex.duration + ex.restTime,
                              0
                            ) / 60
                          )}{" "}
                          minutes
                        </p>
                      </div>
                      <Button
                        onClick={handleSaveWorkout}
                        disabled={!workoutName.trim()}
                        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Workout
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

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
                  {isResting
                    ? "Rest Time"
                    : exercises[currentExerciseIndex]?.name}
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
                    {exercises[currentExerciseIndex]?.videoUrl ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeVideoId(
                          exercises[currentExerciseIndex].videoUrl
                        )}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeVideoId(
                          exercises[currentExerciseIndex].videoUrl
                        )}`}
                        title={exercises[currentExerciseIndex]?.name}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <img
                        src="/placeholder.svg"
                        alt={exercises[currentExerciseIndex]?.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-2 mb-6">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${
                        ((currentExerciseIndex + (isResting ? 0.5 : 0)) /
                          exercises.length) *
                        100
                      }%`,
                    }}
                  />
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={togglePause}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl"
                  >
                    {isPaused ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <Pause className="h-5 w-5" />
                    )}
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
  );
}
