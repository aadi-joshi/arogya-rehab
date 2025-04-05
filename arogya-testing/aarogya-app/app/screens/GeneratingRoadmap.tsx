import React, { useContext, useEffect, useState } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, Animated } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import RoadmapUtils from "../utils/RoadmapUtils";
import AppContext from "../auth/AuthContext";
import { MainStackNavigationProps } from "../routes/MainStack";
import * as SecureStore from 'expo-secure-store';
import ErrorMessage from "../components/ErrorMessage";

const messages = [
    "Generating a Roadmap for you...",
    "Thinking, what fits best...",
    "Analyzing your needs...",
    "Crafting your plan..."
];

const colors = ["#F99E16", "#16A085", "#3498DB", "#E74C3C"];

export interface RoadmpaGenerationExtraProps {
    force?: boolean;
    isReEvaluation?: boolean;
}

export default function GeneratingRoadmapScreen() {
    const navigation = useNavigation<MainStackNavigationProps>();
    const { user } = useContext(AppContext);
    const [index, setIndex] = useState(0);
    const fadeAnim = new Animated.Value(1);
    const [roadmapGenerated, setRoadmapGenerated] = React.useState(false);
    const roadmapGeneratorRef = React.useRef(new RoadmapUtils(user!!.id!!));
    const retryCount = React.useRef(0);
    const route = useRoute();
    const force = (route.params as RoadmpaGenerationExtraProps)?.force || false;
    const isReEvaluation = (route.params as RoadmpaGenerationExtraProps)?.isReEvaluation || false;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        generateRoadmap();
    }, []);

    const generateRoadmap = () => {
        setError(null);

        if (!roadmapGenerated) {
            roadmapGeneratorRef.current.generateRoadmap({
                force: force
            })
                .then((roadmapData) => {
                    setRoadmapGenerated(true);

                    // Set current date as start date for re-evaluation
                    if (isReEvaluation) {
                        // Update start date to current date 
                        if (roadmapData.roadmap) {
                            const currentDate = new Date().toISOString().split('T')[0];
                            roadmapData.startDate = currentDate;
                            // Save updated roadmap with new start date
                            SecureStore.setItemAsync("roadmap", JSON.stringify(roadmapData));
                        }
                    }

                    navigation.navigate("MainTabs");
                })
                .catch((error) => {
                    console.error("Error generating roadmap: ", error);
                    setError("We're having trouble generating your fitness roadmap. Please try again.");

                    if (retryCount.current < 3) {
                        retryCount.current += 1;
                        setTimeout(() => {
                            generateRoadmap();
                        }, 2000); // Add a small delay before retrying
                    } else {
                        console.error("Failed to generate roadmap after 3 retries.");
                        setError("We couldn't generate your roadmap after multiple attempts. Please try again later.");
                    }
                });
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true,
            }).start(() => {
                setIndex((prev) => (prev + 1) % messages.length); // Change text
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }).start();
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                {error ? (
                    <View style={{ padding: 20 }}>
                        <ErrorMessage
                            message={error}
                            onRetry={() => {
                                retryCount.current = 0;
                                generateRoadmap();
                            }}
                        />
                    </View>
                ) : (
                    <>
                        <LottieView
                            source={require("../../assets/loading_animation.json")}
                            autoPlay
                            loop
                            style={{
                                width: 100,
                                height: 100,
                            }}
                        />
                        <Animated.Text
                            style={{
                                color: colors[index],
                                fontSize: 21,
                                fontWeight: "600",
                                textAlign: "center",
                                opacity: fadeAnim,
                            }}>
                            {messages[index]}
                        </Animated.Text>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}