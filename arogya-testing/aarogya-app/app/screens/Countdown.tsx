import React, { useEffect, useRef } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MainStackNavigationProps } from "../routes/MainStack";

export type CountdownScreenProps = {
    exerciseName: string;
}

export default function CountdownScreen() {
    const [count, setCount] = React.useState(3);
    const navigation = useNavigation<MainStackNavigationProps>();
    const route = useRoute();
    const exerciseName = (route.params as CountdownScreenProps)?.exerciseName || "Exercise";
    const hasNavigated = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount((prevCount) => {
                if (prevCount <= 1) {
                    clearInterval(interval);
                    // Use setTimeout to ensure navigation happens after render is complete
                    if (!hasNavigated.current) {
                        hasNavigated.current = true;
                        setTimeout(() => {
                            // Fix the type error by providing parameters according to the navigation type
                            navigation.replace("Exercising5");
                            // If you need the exerciseName in Exercising5, consider using a global state
                            // or storing it temporarily in AsyncStorage
                        }, 0);
                    }
                    return 0;
                }
                return prevCount - 1;
            });
        }, 1000);
    
        return () => {
            clearInterval(interval); // Clean up on unmount
        };
    }, [navigation, exerciseName]);
    
    return (
        <SafeAreaView
            style={{
                flex: 1,
                backgroundColor: "#FFFFFF",
            }}>
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: "#FFFFFF",
                }}>
                <View
                    style={{
                        backgroundColor: "#F9F4EF",
                        paddingTop: 42,
                    }}>
                    <Text
                        style={{
                            color: "#1C160C",
                            fontSize: 18,
                            marginBottom: 320,
                            marginLeft: 31,
                        }}>
                        {exerciseName}
                    </Text>
                    <Text
                        style={{
                            color: "#F99E16",
                            fontSize: 128,
                            textAlign: "center",
                            marginBottom: 252,
                        }}>
                        {count}
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                            marginHorizontal: 16,
                        }}>
                        <TouchableOpacity
                            style={{
                                width: 167,
                                alignItems: "center",
                                backgroundColor: "#F4EADB",
                                borderRadius: 8,
                                paddingVertical: 18,
                            }} onPress={() => alert('Pressed!')}>
                            <Text
                                style={{
                                    color: "#21160A",
                                    fontSize: 16,
                                }}>
                                {"Alternate"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                width: 160,
                                alignItems: "center",
                                backgroundColor: "#F4EADB",
                                borderRadius: 8,
                                paddingVertical: 18,
                            }} onPress={() => alert('Pressed!')}>
                            <Text
                                style={{
                                    color: "#21160A",
                                    fontSize: 16,
                                }}>
                                {"Next"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View
                        style={{
                            height: 20,
                            backgroundColor: "#F9F4EF",
                        }}>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}