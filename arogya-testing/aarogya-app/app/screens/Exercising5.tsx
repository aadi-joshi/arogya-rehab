import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, Alert, Linking, Platform, Image } from "react-native";
import { CameraView, Camera, useCameraPermissions, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import ExerciseUtils from "../utils/ExerciseUtils";
import { useRoute } from "@react-navigation/native";
import { CountdownScreenProps } from "./Countdown";
import { useNavigation } from "expo-router";
import { MainStackNavigationProps } from "../routes/MainStack";
import Localdb from "../utils/Localdb";

export type ExerciseScreenProps = {
    exerciseName: string;
}

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
    )
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
    const [exerciseMessage, setExerciseMessage] = useState("Follow the instructions and tap the camera button to record your exercise");
    const [isCompleted, setIsCompleted] = useState(false);
    const TOTAL_COUNT = 10;
    const [activeTab, setActiveTab] = useState("Exercise");

    useEffect(() => {
        (async () => {
            // Initialize exercise utility
            exerciseRef.current = new ExerciseUtils(extraExerciseName);
        })();
    }, []);

    useEffect(() => {
        // Check if exercise is completed
        if (count >= TOTAL_COUNT) {
            setIsCompleted(true);
            setExerciseMessage("Well done! You have completed the exercise.");
            exerciseRef.current.save();
        }
    }, [count]);

    useEffect(() => {
        if (permission?.granted == true) return;

        if (!permission?.granted && permission?.canAskAgain) {
            showPermissionAlert();
        }
    }, [permission]);

    const showPermissionAlert = () => {
        Alert.alert(
            "Camera Permission Required",
            "Please grant camera access to use this feature.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: openSettings }
            ]
        );
    };

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    const toggleView = () => {
        setShowCamera(!showCamera);
    };

    const toggleCamera = () => {
        setFacing(facing === 'front' ? 'back' : 'front');
    };

    const takePicture = async () => {
        if (camera.current && !isCompleted) {
            try {
                const photo = await camera.current.takePictureAsync();
                setCapturedImage(photo?.uri || null);
                
                // Increment count when photo is taken
                setCount(prev => {
                    const newCount = prev + 1;
                    setExerciseMessage(`Great job! ${newCount}/${TOTAL_COUNT} completed`);
                    return newCount;
                });
                
                // Clear captured image after a short delay
                setTimeout(() => {
                    setCapturedImage(null);
                }, 1000);
                
            } catch (error) {
                console.error("Error taking picture:", error);
                setExerciseMessage("Failed to take picture. Please try again.");
            }
        }
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
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
                    {
                        !isCompleted && (
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
                                    {exerciseMessage}
                                </Text>
                                <Text style={{
                                    color: "#21160A",
                                    fontSize: 14,
                                    fontWeight: "600"
                                }}>
                                    {`Progress: ${count}/${TOTAL_COUNT}`}
                                </Text>
                            </View>
                        )
                    }

                    {
                        !isCompleted && (
                            <View style={{
                                alignItems: "center",
                                justifyContent: "center",
                                width: '100%',
                                marginVertical: 5
                            }}>
                                <TabButtons 
                                    tabs={["Exercise", "View Demo"]} 
                                    activeTab={activeTab} 
                                    setActiveTab={(tab) => {
                                        setActiveTab(tab);
                                        setShowCamera(tab === "Exercise");
                                    }} 
                                />
                            </View>
                        )
                    }
                </View>

                {
                    isCompleted ? (
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
                        </View>
                    ) : (
                        <View style={{ flex: 1, width: '100%', marginTop: 120 }}>
                            {permission?.granted ? (
                                showCamera ? (
                                    <View style={{ flex: 1 }}>
                                        <CameraView
                                            ref={camera}
                                            style={{ flex: 1 }}
                                            facing={facing}
                                        />
                                        {capturedImage && (
                                            <View style={{ 
                                                position: 'absolute', 
                                                top: 0, 
                                                left: 0, 
                                                right: 0, 
                                                bottom: 0, 
                                                justifyContent: 'center', 
                                                alignItems: 'center',
                                                backgroundColor: 'rgba(0,0,0,0.5)'
                                            }}>
                                                <Image 
                                                    source={{ uri: capturedImage }} 
                                                    style={{ width: 200, height: 200, borderRadius: 10 }}
                                                />
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <ExerciseDemoVideo url={null} />
                                )
                            ) : (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text>No access to camera</Text>
                                    <TouchableOpacity
                                        onPress={requestPermission}
                                        style={{ marginTop: 20, padding: 10, backgroundColor: '#F99E16', borderRadius: 5 }}
                                    >
                                        <Text style={{ color: '#21160A' }}>Request Permission</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )
                }

                <View
                    style={{
                        zIndex: 10,
                        width: '100%',
                        bottom: 0,
                        position: "absolute",
                        paddingVertical: 10,
                    }}
                >
                    {
                        !isCompleted && showCamera && permission?.granted && (
                            <View style={{
                                alignItems: "center",
                                width: '100%',
                                marginBottom: 25,
                            }}>
                                <View style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: '100%'
                                }}>
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        backgroundColor: "#F9F4EF",
                                        borderRadius: 24,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginHorizontal: 12,
                                        shadowColor: "#0000001A",
                                        shadowOpacity: 0.1,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowRadius: 4,
                                        elevation: 4
                                    }}>
                                        <TouchableOpacity onPress={toggleView}>
                                            <Ionicons
                                                name={showCamera ? "videocam-outline" : "camera-outline"}
                                                size={24}
                                                color="black"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{
                                        width: 64,
                                        height: 64,
                                        backgroundColor: "#F9F4EF",
                                        borderRadius: 32,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginHorizontal: 12,
                                        shadowColor: "#0000001A",
                                        shadowOpacity: 0.1,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowRadius: 4,
                                        elevation: 4
                                    }}>
                                        <TouchableOpacity onPress={takePicture}>
                                            <Ionicons
                                                name="camera"
                                                size={32}
                                                color="#F99E16"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{
                                        width: 48,
                                        height: 48,
                                        backgroundColor: "#F9F4EF",
                                        borderRadius: 24,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginHorizontal: 12,
                                        shadowColor: "#0000001A",
                                        shadowOpacity: 0.1,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowRadius: 4,
                                        elevation: 4
                                    }}>
                                        <TouchableOpacity onPress={toggleCamera}>
                                            <Ionicons name="sync-outline" size={24} color="black" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )
                    }

                    <View style={{ width: '100%', paddingHorizontal: 16 }}>
                        <View style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 2,
                            width: '100%'
                        }}>
                            {
                                !isCompleted && (
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            alignItems: "center",
                                            backgroundColor: "#F4EADB",
                                            borderRadius: 8,
                                            paddingVertical: 18,
                                            marginRight: 8
                                        }}
                                        onPress={() => {
                                            navigation.goBack();
                                        }}
                                    >
                                        <Text style={{ color: "#21160A", fontSize: 16 }}>
                                            {"Back"}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }

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
                                        navigation.reset({
                                            index: 0,
                                            routes: [{ name: "MainTabs" }],
                                        });
                                    } else {
                                        // Skip the exercise
                                        setIsCompleted(true);
                                        exerciseRef.current.save();
                                    }
                                }}
                            >
                                <Text style={{ color: "#FFFFFF", fontSize: 16 }}>
                                    {isCompleted ? "Finish" : "Skip"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    )
}