import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState, useEffect } from "react";
import {
	SafeAreaView,
	View,
	FlatList,
	Image,
	Text,
	Dimensions,
	StyleSheet,
	TouchableOpacity,
	Animated,
} from "react-native";
import { MainStackNavigationProps } from "../routes/MainStack";
import { useNavigation } from "expo-router";
import Loading from "../components/Loading";

interface Badge {
	name: string;
	description: string;
	imageUrl: any;
}

const badgesData = [
	{
		id: 1,
		name: "First Step Badge",
		description: "For getting 500 total score",
		imageUrl: "https://kylesethgray.com/content/images/2018/08/thanksgiving_day_challenge_5k.png",
		requiredScore: 500,
	},
	{
		id: 2,
		name: "Second Step Badge",
		description: "For getting 1000 total score",
		imageUrl: "https://kylesethgray.com/content/images/2018/08/new_year_2017.png",
		requiredScore: 1000,
	},
	{
		id: 3,
		name: "Five Steps Badge",
		description: "For getting 5000 total score",
		imageUrl: "https://kylesethgray.com/content/images/2018/08/VeteransDay_Sticker.png",
		requiredScore: 5000,
	},
	{
		id: 5,
		name: "Consistency Champion",
		description: "For completing activities 7 days in a row",
		imageUrl: "https://media.istockphoto.com/id/905084084/vector/bw-icon-finish-line.jpg?s=612x612&w=0&k=20&c=lhUJ8l42IlT9JX6g7AR7wG5a3FarXNtZq6Q4yUT-wSA=",
		requiredScore: 2500,
		specialRequirement: "7-day streak",
	},
];

// Temporary data for testing
const badgesUnlocked: Badge[] = badgesData;

const { width } = Dimensions.get("window");

export default function UnlockedBadgeScreen() {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
	const navigation = useNavigation<MainStackNavigationProps>();
	const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
		if (viewableItems.length > 0) {
			setCurrentIndex(viewableItems[0].index);
		}
	}).current;

	useEffect(() => {
		// Simulate loading of badge data
		const timer = setTimeout(() => {
			setLoading(false);
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<SafeAreaView style={styles.container}>
			{loading ? (
				<Loading visible={true} />
			) : (
				<>
					<View
						style={{
							alignItems: "center",
							justifyContent: "center",
							gap: 10,
							paddingVertical: 10,
							marginHorizontal: 30,
						}}
					>
						{/* Add animation to the badge icon */}
						<Animated.View
							style={{
								transform: [{ scale: new Animated.Value(1) }],
							}}
						>
							<Ionicons
								name="ribbon"
								size={36}
								color="#F99E16"
								style={{
									shadowColor: "#F99E16",
									shadowOffset: { width: 0, height: 0 },
									shadowOpacity: 0.5,
									shadowRadius: 10,
								}}
							/>
						</Animated.View>
						<Text style={{ fontSize: 26, fontWeight: "bold", textAlign: "center", color: "#21160A" }}>
							Congrats! You've unlocked new badges!
						</Text>
					</View>
					<FlatList
						data={badgesUnlocked}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						keyExtractor={(item, index) => index.toString()}
						renderItem={({ item }) => (
							<View style={styles.badgeContainer}>
								<Image source={{ uri: item.imageUrl }} style={styles.image} />
								<Text style={styles.title}>{item.name}</Text>
								<Text style={styles.description}>{item.description}</Text>
							</View>
						)}
						viewabilityConfig={viewabilityConfig}
						onViewableItemsChanged={onViewableItemsChanged}
					/>
					<View style={styles.dotContainer}>
						{badgesUnlocked.map((_, index) => (
							<View
								key={index}
								style={[styles.dot, currentIndex === index && styles.activeDot]}
							/>
						))}
					</View>

					{/* Add a consistent button to return */}
					<TouchableOpacity
						style={{
							backgroundColor: "#F99E16",
							paddingVertical: 15,
							paddingHorizontal: 30,
							borderRadius: 12,
							alignSelf: "center",
							marginBottom: 20,
						}}
						onPress={() =>
							navigation.reset({
								index: 0,
								routes: [{ name: "MainTabs" }],
							})
						}
					>
						<Text
							style={{
								color: "#21160A",
								fontSize: 16,
								fontWeight: "600",
							}}
						>
							Continue
						</Text>
					</TouchableOpacity>
				</>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFFFF",
		alignItems: "center",
		justifyContent: "center",
	},
	badgeContainer: {
		justifyContent: "center",
		display: "flex",
		width,
		alignItems: "center",
		padding: 20,
	},
	image: {
		width: 350,
		height: 350,
		borderRadius: 10,
		marginBottom: 40,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 5,
	},
	description: {
		fontSize: 16,
		color: "#666",
	},
	dotContainer: {
		flexDirection: "row",
		position: "absolute",
		bottom: 90,
		alignSelf: "center",
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#ccc",
		marginHorizontal: 4,
	},
	activeDot: {
		backgroundColor: "#333",
		width: 10,
		height: 10,
	},
});
