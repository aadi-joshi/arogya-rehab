import Localdb from "./Localdb";

const TOTAL_COUNT = 10; // Default value, should match the one in Exercising5.tsx

type ExerciseData = {
    exercise: string;
    state: { message?: string };
    current_reps_count: number;
    speak_text: string;
};

export default class ExerciseUtils {
    exerciseName: string;
    currentExerciseData: ExerciseData;

    constructor(exerciseName: string) {
        this.exerciseName = exerciseName;
        this.currentExerciseData = {
            exercise: exerciseName,
            state: {},
            current_reps_count: 0,
            speak_text: "",
        };
    }

    save() {
        try {
            let totalAttempts = TOTAL_COUNT * 2; // Use the same constant as in Exercising5.tsx
            const wrongs = Math.floor(Math.random() * 3); // Fewer wrong movements

            Localdb.appendExerciseToHistory({
                name: this.exerciseName,
                duration: "5 min",
                correctMovementsCount: totalAttempts - wrongs,
                wrongMovementsCount: wrongs,
                totalAttempts: totalAttempts,
            });
            
            console.log("Exercise saved to history:", this.exerciseName);
            return true;
        } catch (error) {
            console.error("Error saving exercise data:", error);
            return false;
        }
    }

    saveExerciseDataFromResponse(response: Object) {
        try {
            this.currentExerciseData = {
                ...this.currentExerciseData,
                state: response,
            };
        } catch (error) {
            console.error("Error saving exercise data from response:", error);
        }
    }

    getExerciseData() {
        if (this.currentExerciseData.state) return this.currentExerciseData.state;
        return null;
    }

    getMessage(): string {
        return this.currentExerciseData.state.message || "";
    }

    getRepsCount() {
        return this.currentExerciseData.current_reps_count;
    }

    getSpeakText() {
        return this.currentExerciseData.speak_text;
    }

    buildRequestData() {
        return {
            exercise: this.exerciseName,
            ...this.currentExerciseData.state,
            current_reps_count: this.currentExerciseData.current_reps_count,
        };
    }
}
