/**
 * Exercise Web Adapter
 * 
 * This script helps bridge your web-based exercise applications with React Native WebView.
 * Include this script in your exercise web apps to standardize communication.
 */

(function() {
    // Check if we're in a WebView environment
    const isInWebView = window.ReactNativeWebView !== undefined;
    
    // Global rep counter
    let repCounter = 0;
    let maxReps = 10; // Default, can be changed
    let isCompleted = false;
    
    // Function to send rep count updates to React Native
    function updateRepCount(count) {
        repCounter = count;
        
        if (isInWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'exercise_progress',
                reps: repCounter
            }));
        }
        
        console.log(`Rep count: ${repCounter}/${maxReps}`);
        
        // Check for exercise completion
        if (repCounter >= maxReps && !isCompleted) {
            completeExercise();
        }
    }
    
    // Function to mark exercise as complete
    function completeExercise() {
        isCompleted = true;
        
        if (isInWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'exercise_complete',
                message: 'Exercise completed successfully!'
            }));
        }
        
        console.log('Exercise completed!');
    }
    
    // Override console.log to detect rep count changes
    const originalConsoleLog = console.log;
    console.log = function() {
        const args = Array.from(arguments);
        const logStr = args.join(' ');
        
        // Try to extract rep count information from logs
        const repRegex = /rep.?(?:count|s)?:?\s*(\d+)|count:?\s*(\d+)|completed:?\s*(\d+)|progress:?\s*(\d+)|(\d+)\s*\/\s*(\d+)/i;
        const matches = logStr.match(repRegex);
        
        if (matches) {
            const reps = parseInt(matches[1] || matches[2] || matches[3] || matches[4] || matches[5] || "0");
            if (!isNaN(reps) && reps > 0 && reps !== repCounter) {
                updateRepCount(reps);
                
                // If there's a total count mentioned, update maxReps
                if (matches[6]) {
                    maxReps = parseInt(matches[6]);
                }
            }
        }
        
        // Forward the log to React Native if in WebView
        if (isInWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'console_log',
                message: logStr
            }));
        }
        
        // Continue with original console.log
        originalConsoleLog.apply(console, args);
    };
    
    // Expose API for web exercise apps to use directly
    window.exerciseAdapter = {
        updateRepCount,
        completeExercise,
        setMaxReps: function(max) {
            maxReps = max;
        }
    };
    
    console.log("Exercise Web Adapter initialized");
})();
