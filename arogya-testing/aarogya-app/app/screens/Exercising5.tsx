import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, Alert, Linking, Platform, Image, StatusBar } from "react-native";
import { CameraView, Camera, useCameraPermissions, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import ExerciseUtils from "../utils/ExerciseUtils";
import { useRoute } from "@react-navigation/native";
import { CountdownScreenProps } from "./Countdown";
import { useNavigation } from "expo-router";
import { MainStackNavigationProps } from "../routes/MainStack";
import Localdb from "../utils/Localdb";

export type ExerciseScreenProps = {
    exerciseName: string;
};

const TabButtons = ({ tabs, activeTab, setActiveTab }: { tabs: string[], activeTab: string, setActiveTab: (tab: string) => void }) => {
    return (
        <View style={{ flexDirection: "row", justifyContent: "center", margin: 10 }}>
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={{
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        marginHorizontal: 5,
                        borderRadius: 8,
                        backgroundColor: activeTab === tab ? "#007AFF" : "#E0E0E0",
                    }}
                >
                    <Text style={{ color: activeTab === tab ? "#FFF" : "#000", fontWeight: "bold" }}>
                        {tab}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const ExerciseDemoVideo = ({ url }: { url: string | null } = { url: null }) => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', }}>
            <Text style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>Exercise Demo</Text>
            <View style={{ flex: 1, maxHeight: 320, margin: 15, borderRadius: 16, overflow: 'hidden', borderColor: '#F99E16', borderWidth: 2 }}>
                <WebView
                    style={{
                        height: 20,
                        overflow: 'hidden'
                    }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    source={{ uri: url ? url : 'https://www.youtube.com/embed/5-g_fi3VhIs?si=8gKtdLuV1sBqDvib' }}
                />
            </View>
        </View>
    );
};

export default function Exercising5() {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const camera = useRef<CameraView>(null);
    const [showCamera, setShowCamera] = useState(true);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const route = useRoute();
    const navigation = useNavigation<MainStackNavigationProps>();
    const extraExerciseName = (route.params as CountdownScreenProps)?.exerciseName || "Exercise";
    const exerciseRef = useRef(new ExerciseUtils(extraExerciseName));
    const [count, setCount] = useState(0);
    const [rightHandCount, setRightHandCount] = useState(0);
    const [leftHandCount, setLeftHandCount] = useState(0);
    const [currentHand, setCurrentHand] = useState<string>("right");
    const [exerciseMessage, setExerciseMessage] = useState("Follow the instructions to complete the exercise");
    const [isCompleted, setIsCompleted] = useState(false);
    const TOTAL_COUNT = 10; // 10 reps per hand
    const [activeTab, setActiveTab] = useState("Exercise");
    const webViewRef = useRef<WebView>(null);
    const [webViewError, setWebViewError] = useState<string | null>(null);
    const [useNativeCamera, setUseNativeCamera] = useState(false);
    const [exerciseStarted, setExerciseStarted] = useState(false);
    const startTimeRef = useRef<number>(Date.now());
    const [webViewHeight, setWebViewHeight] = useState<number | undefined>(undefined);
    const [debugVisible, setDebugVisible] = useState(false);
    const [debugMessages, setDebugMessages] = useState<string[]>([]);

    const getServerUrl = () => {
        const useTestUrl = false; // Set to true to use a test URL for debugging

        if (useTestUrl) {
            return 'https://exercise-demo.vercel.app/';
        }

        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:5001';
        }
        return 'http://localhost:5001';
    };

    const addDebugMessage = (message: string) => {
        setDebugMessages(prev => {
            const newMessages = [...prev, `${new Date().toLocaleTimeString()}: ${message}`];
            if (newMessages.length > 20) newMessages.shift();
            return newMessages;
        });
    };

    const handleWebViewError = (syntheticEvent: { nativeEvent: any }) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView error:", JSON.stringify(nativeEvent));
        addDebugMessage(`WebView error: ${JSON.stringify(nativeEvent).substring(0, 100)}...`);
        setWebViewError(`Failed to connect to exercise server. Please check if the backend is running on port 5001.`);
    };

    const injectedJavaScript = `
        (function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'webview_loaded',
                message: 'WebView has loaded'
            }));

            const originalConsoleLog = console.log;
            console.log = function() {
                const args = Array.from(arguments);
                const logStr = args.join(' ');

                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'console_log',
                    message: logStr
                }));

                originalConsoleLog.apply(console, args);
            };

            let startTime = Date.now();
            let foundValidRepCount = false;
            let lastReportedCount = 0;

            function checkForRepCounts() {
                const timeElapsed = Date.now() - startTime;

                document.body.style.backgroundColor = "#f5f5f5";

                if (timeElapsed < 3000) {
                    setTimeout(checkForRepCounts, 1000);
                    return;
                }

                let foundReps = false;

                const allElements = document.querySelectorAll('*');
                for (const element of allElements) {
                    if (element.textContent) {
                        const text = element.textContent.trim();

                        const repRegex = /rep.?(?:count|s)?:?\\s*(\\d+)(?:\\/(\\d+))?|count:?\\s*(\\d+)|completed:?\\s*(\\d+)|progress:?\\s*(\\d+)/i;
                        const matches = text.match(repRegex);

                        if (matches) {
                            const reps = parseInt(matches[1] || matches[3] || matches[4] || matches[5] || "0");
                            if (!isNaN(reps) && reps > 0 && reps !== lastReportedCount) {
                                lastReportedCount = reps;
                                foundReps = true;
                                foundValidRepCount = true;
                                console.log("Found rep count in text:", reps);
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'exercise_progress',
                                    reps: reps
                                }));
                            }
                        }
                    }
                }

                const progressElements = document.querySelectorAll('progress, .progress, [role="progressbar"], .counter, .count');
                for (const element of progressElements) {
                    const valueAttr = element.getAttribute('value') || element.getAttribute('aria-valuenow');
                    if (valueAttr) {
                        const reps = parseInt(valueAttr);
                        if (!isNaN(reps) && reps > 0 && reps !== lastReportedCount) {
                            lastReportedCount = reps;
                            foundReps = true;
                            foundValidRepCount = true;
                            console.log("Found rep count in progress element:", reps);
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'exercise_progress',
                                reps: reps
                            }));
                        }
                    }
                }

                if (!foundReps) {
                    const numberRegex = /\\b(\\d+)\\s*\\/\\s*(\\d+)\\b/;
                    allElements.forEach(element => {
                        if (element.textContent && numberRegex.test(element.textContent)) {
                            const matches = element.textContent.match(numberRegex);
                            if (matches && matches[1]) {
                                const reps = parseInt(matches[1]);
                                if (!isNaN(reps) && reps > 0 && reps !== lastReportedCount) {
                                    lastReportedCount = reps;
                                    foundReps = true;
                                    foundValidRepCount = true;
                                    console.log("Found potential rep count:", reps);
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: 'exercise_progress',
                                        reps: reps
                                    }));
                                }
                            }
                        }
                    });
                }

                if (foundValidRepCount && timeElapsed > 10000) {
                    const completeText = /exercise completed|great job|well done|all exercises completed|finished/i;
                    const completeElements = Array.from(document.querySelectorAll('*')).filter(el => 
                        el.textContent && completeText.test(el.textContent)
                    );

                    if (completeElements.length > 0) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'exercise_complete',
                            message: completeElements[0].textContent || 'Exercise completed!'
                        }));
                    }
                }

                setTimeout(checkForRepCounts, 500);
            }

            setTimeout(checkForRepCounts, 1000);
        })();
    `;

    useEffect(() => {
        startTimeRef.current = Date.now();
        setExerciseStarted(false);

        (async () => {
            exerciseRef.current = new ExerciseUtils(extraExerciseName);

            if (permission?.granted !== true) {
                const { granted } = await requestPermission();
                if (!granted) {
                    Alert.alert(
                        "Camera Permission Required",
                        "This exercise requires camera access to track your movements. Please grant camera permissions.",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Open Settings", onPress: () => Linking.openSettings() }
                        ]
                    );
                }
            }
        })();
    }, []);

    useEffect(() => {
        const totalReps = rightHandCount + leftHandCount;

        if (rightHandCount >= TOTAL_COUNT && currentHand === "right") {
            setCurrentHand("left");
            setExerciseMessage(`Right hand complete! Now working on left hand. ${leftHandCount}/${TOTAL_COUNT} completed`);
        }

        const timeElapsed = Date.now() - startTimeRef.current;
        if (totalReps >= TOTAL_COUNT * 2 && !isCompleted && timeElapsed > 10000 && exerciseStarted) {
            setIsCompleted(true);
            setExerciseMessage("Well done! You have completed the exercise.");
            exerciseRef.current.save();
        }
    }, [rightHandCount, leftHandCount, currentHand, isCompleted, exerciseStarted]);

    const handleWebViewMessage = (event: WebViewMessageEvent) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log("WebView message received:", data.type, data.reps || '');
            addDebugMessage(`Received: ${data.type} ${data.reps || ''}`);

            if (data.type === 'webview_loaded') {
                addDebugMessage('WebView loaded successfully');
                setWebViewError(null);
            }

            if (!exerciseStarted && Date.now() - startTimeRef.current > 5000) {
                setExerciseStarted(true);
                console.log("Exercise started and tracking enabled");
                addDebugMessage("Exercise tracking started");
            }

            if (data.type === 'exercise_progress' && !isCompleted && exerciseStarted) {
                const timeElapsed = Date.now() - startTimeRef.current;
                const maxAllowedInitialReps = Math.min(10, Math.floor(timeElapsed / 1000));

                if (data.reps <= maxAllowedInitialReps || timeElapsed > 15000) {
                    if (currentHand === "right") {
                        if (data.reps > rightHandCount) {
                            setRightHandCount(data.reps);
                            setCount(data.reps);
                            setExerciseMessage(`Right hand: ${data.reps}/${TOTAL_COUNT} completed`);
                            addDebugMessage(`Right hand reps: ${data.reps}`);
                        }
                    } else {
                        if (data.reps > leftHandCount) {
                            setLeftHandCount(data.reps);
                            setCount(rightHandCount + data.reps);
                            setExerciseMessage(`Left hand: ${data.reps}/${TOTAL_COUNT} completed`);
                            addDebugMessage(`Left hand reps: ${data.reps}`);
                        }
                    }
                } else {
                    console.log("Ignoring suspicious rep count:", data.reps, "after only", timeElapsed, "ms");
                    addDebugMessage(`Ignored suspicious count: ${data.reps}`);
                }
            } else if (data.type === 'hand_update' && !isCompleted && exerciseStarted) {
                if (data.hand !== currentHand) {
                    setCurrentHand(data.hand);
                    addDebugMessage(`Hand changed to: ${data.hand}`);
                }
            } else if (data.type === 'exercise_complete' && !isCompleted && exerciseStarted) {
                const totalReps = rightHandCount + leftHandCount;
                const timeElapsed = Date.now() - startTimeRef.current;

                if (totalReps >= TOTAL_COUNT * 2 && timeElapsed > 10000) {
                    setIsCompleted(true);
                    setExerciseMessage("Well done! You have completed the exercise.");
                    exerciseRef.current.save();
                    addDebugMessage("Exercise completed successfully");
                } else {
                    console.log("Ignoring premature completion message, reps:", totalReps, "of", TOTAL_COUNT * 2, "time:", timeElapsed);
                    addDebugMessage(`Premature completion ignored: ${totalReps}/${TOTAL_COUNT * 2}`);
                }
            } else if (data.type === 'console_log') {
                const logMessage = data.message;
                addDebugMessage(`WebView log: ${logMessage.substring(0, 50)}${logMessage.length > 50 ? '...' : ''}`);

                const repRegex = /rep.?(?:count|s)?:?\s*(\d+)|count:?\s*(\d+)|completed:?\s*(\d+)|progress:?\s*(\d+)/i;
                const repMatch = logMessage.match(repRegex);

                if (repMatch) {
                    const reps = parseInt(repMatch[1] || repMatch[2] || repMatch[3] || repMatch[4] || "0");
                    if (!isNaN(reps) && reps > 0) {
                        if (currentHand === "right") {
                            if (reps > rightHandCount) {
                                setRightHandCount(reps);
                                setCount(reps);
                                setExerciseMessage(`Right hand: ${reps}/${TOTAL_COUNT} completed`);
                                addDebugMessage(`From log: Right hand reps: ${reps}`);
                            }
                        } else {
                            if (reps > leftHandCount) {
                                setLeftHandCount(reps);
                                setCount(rightHandCount + reps);
                                setExerciseMessage(`Left hand: ${reps}/${TOTAL_COUNT} completed`);
                                addDebugMessage(`From log: Left hand reps: ${reps}`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error handling WebView message:", error);
            addDebugMessage(`Message parsing error: ${error}`);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={{ flex: 1, flexDirection: 'column' }}>
                <View style={{
                    zIndex: 10,
                    width: '100%',
                    position: "absolute",
                    opacity: 0.9,
                    paddingVertical: 10,
                    backgroundColor: "#FFFFFF",
                }}>
                    <Text style={{
                        fontSize: 18,
                        paddingVertical: 15,
                        flex: 1,
                        textAlign: "center",
                        fontWeight: "400"
                    }}>
                        {extraExerciseName}
                    </Text>
                    {!isCompleted && (
                        <View style={{
                            alignItems: "center",
                            backgroundColor: "#F99E16",
                            padding: 12,
                            marginHorizontal: 20,
                            borderRadius: 8,
                        }}>
                            <Text style={{
                                color: "#21160A",
                                fontSize: 14,
                                flex: 1,
                                marginBottom: 8,
                                fontWeight: "500",
                                textAlign: "center"
                            }}>
                                {webViewError ? webViewError : exerciseMessage}
                            </Text>
                            <Text style={{
                                color: "#21160A",
                                fontSize: 14,
                                fontWeight: "600"
                            }}>
                                {currentHand === "right" ? 
                                    `Right hand: ${rightHandCount}/${TOTAL_COUNT}` : 
                                    `Left hand: ${leftHandCount}/${TOTAL_COUNT}`
                                }
                            </Text>
                            <Text style={{
                                color: "#21160A",
                                fontSize: 12,
                                fontWeight: "400",
                                marginTop: 4
                            }}>
                                {`Total progress: ${rightHandCount + leftHandCount}/${TOTAL_COUNT * 2}`}
                            </Text>
                            
                            <TouchableOpacity 
                                onPress={() => setDebugVisible(!debugVisible)}
                                style={{ position: 'absolute', right: 10, top: 10 }}
                            >
                                <Ionicons name="bug-outline" size={18} color="#21160A" />
                            </TouchableOpacity>
                        </View>
                    )}
                    {!isCompleted && debugVisible && (
                        <View style={{
                            backgroundColor: '#f0f0f0',
                            padding: 10,
                            marginHorizontal: 20,
                            marginTop: 10,
                            borderRadius: 8,
                            maxHeight: 150
                        }}>
                            <ScrollView>
                                {debugMessages.map((msg, i) => (
                                    <Text key={i} style={{ fontSize: 10, color: '#666' }}>{msg}</Text>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                    {!isCompleted && (
                        <View style={{ alignItems: "center", justifyContent: "center", width: '100%', marginVertical: 5 }}>
                            <TabButtons 
                                tabs={["Exercise", "View Demo"]} 
                                activeTab={activeTab} 
                                setActiveTab={setActiveTab} 
                            />
                        </View>
                    )}
                </View>

                {isCompleted ? (
                    <View style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "#FFFFFF"
                    }}>
                        <Ionicons name="checkmark-circle" size={128} color="green" style={{ marginBottom: 18 }} />
                        <Text style={{ fontSize: 24, fontWeight: "bold" }}>Exercise Completed!</Text>
                        <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 20 }}>You earned two new badges!</Text>
                        
                        <TouchableOpacity
                            style={{
                                alignItems: "center",
                                backgroundColor: "green",
                                borderRadius: 8,
                                paddingVertical: 18,
                                paddingHorizontal: 40,
                                marginTop: 40
                            }}
                            onPress={() => {
                                setTimeout(() => {
                                    navigation.reset({ 
                                        index: 0, 
                                        routes: [{ name: "MainTabs" }] 
                                    });
                                }, 300);
                            }}
                        >
                            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: 'bold' }}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ flex: 1, width: '100%', marginTop: 120 }}>
                        {permission?.granted ? (
                            <View style={{ flex: 1 }}>
                                {activeTab === "Exercise" ? (
                                    <View style={{ flex: 1 }}>
                                        {webViewError ? (
                                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                                <Ionicons name="cloud-offline" size={64} color="#F99E16" />
                                                <Text style={{ fontSize: 18, textAlign: 'center', marginTop: 20, marginBottom: 10 }}>
                                                    Connection Error
                                                </Text>
                                                <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                                                    {webViewError}
                                                </Text>
                                                <TouchableOpacity 
                                                    style={{ backgroundColor: "#F99E16", padding: 15, borderRadius: 8 }}
                                                    onPress={() => {
                                                        setWebViewError(null);
                                                        webViewRef.current?.reload();
                                                        addDebugMessage("WebView reload requested");
                                                    }}
                                                >
                                                    <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>Try Again</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : useNativeCamera ? (
                                            <CameraView
                                                ref={camera}
                                                style={{ flex: 1 }}
                                                facing={facing}
                                            />
                                        ) : (
                                            <View style={{ flex: 1, overflow: 'hidden' }}>
                                                <WebView
                                                    ref={webViewRef}
                                                    key="webViewKey"
                                                    style={{ 
                                                        flex: 1, 
                                                        backgroundColor: "#f5f5f5",
                                                        opacity: 1,
                                                        ...(webViewHeight !== undefined ? { height: webViewHeight } : {})
                                                    }}
                                                    source={{ uri: getServerUrl() }}
                                                    javaScriptEnabled={true}
                                                    domStorageEnabled={true}
                                                    allowsFullscreenVideo={true}
                                                    mediaPlaybackRequiresUserAction={false}
                                                    onMessage={handleWebViewMessage}
                                                    injectedJavaScript={injectedJavaScript}
                                                    onError={handleWebViewError}
                                                    onHttpError={handleWebViewError}
                                                    originWhitelist={['*']}
                                                    startInLoadingState={true}
                                                    allowsInlineMediaPlayback={true}
                                                    allowsBackForwardNavigationGestures={true}
                                                    allowFileAccess={true}
                                                    allowFileAccessFromFileURLs={true}
                                                    allowUniversalAccessFromFileURLs={true}
                                                    useWebView2={true}
                                                    onNavigationStateChange={(navState) => {
                                                        console.log("Navigation state changed:", navState.url);
                                                        addDebugMessage(`Navigated to: ${navState.url}`);
                                                    }}
                                                    onLoad={() => {
                                                        console.log("WebView loaded");
                                                        addDebugMessage("WebView onLoad event fired");
                                                    }}
                                                    onLoadStart={() => {
                                                        console.log("WebView load starting");
                                                        addDebugMessage("WebView load starting");
                                                    }}
                                                    onLoadEnd={() => {
                                                        console.log("WebView load ended");
                                                        setWebViewHeight(undefined); // Use flex: 1 instead of height: 100%
                                                        addDebugMessage("WebView load ended");
                                                    }}
                                                    onContentProcessDidTerminate={() => {
                                                        console.log("WebView process terminated, reloading");
                                                        addDebugMessage("WebView process terminated, reloading");
                                                        webViewRef.current?.reload();
                                                    }}
                                                    userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36"
                                                    renderLoading={() => (
                                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#f5f5f5" }}>
                                                            <Text style={{ marginBottom: 20 }}>Loading exercise tracking...</Text>
                                                            <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginHorizontal: 20 }}>
                                                                Make sure the backend server is running on port 5001.
                                                                {Platform.OS === 'android' ? "\nConnecting to: 10.0.2.2:5001" : "\nConnecting to: localhost:5001"}
                                                            </Text>
                                                        </View>
                                                    )}
                                                />
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <ExerciseDemoVideo url={null} />
                                )}
                            </View>
                        ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
                                    Camera permission is required to use this feature
                                </Text>
                                <TouchableOpacity
                                    style={{ backgroundColor: "#F99E16", padding: 15, borderRadius: 8 }}
                                    onPress={requestPermission}
                                >
                                    <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>Grant Camera Permission</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                <View style={{ width: '100%', paddingHorizontal: 16 }}>
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 2,
                        width: '100%'
                    }}>
                        {!isCompleted && (
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    alignItems: "center",
                                    backgroundColor: "#F4EADB",
                                    borderRadius: 8,
                                    paddingVertical: 18,
                                    marginRight: 8
                                }}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={{ color: "#21160A", fontSize: 16 }}>Back</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                alignItems: "center",
                                backgroundColor: isCompleted ? "green" : "#F99E16",
                                borderRadius: 8,
                                paddingVertical: 18,
                                marginLeft: isCompleted ? 0 : 8
                            }}
                            onPress={() => {
                                if (isCompleted) {
                                    setTimeout(() => {
                                        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
                                    }, 300);
                                } else {
                                    setIsCompleted(true);
                                    exerciseRef.current.save();
                                    addDebugMessage("Exercise skipped and saved");
                                }
                            }}
                        >
                            <Text style={{ color: "#FFFFFF", fontSize: 16 }}>
                                {isCompleted ? "Finish" : "End"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}