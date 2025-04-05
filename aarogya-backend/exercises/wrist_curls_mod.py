import mediapipe as mp
import cv2
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['MEDIAPIPE_VLOG_V'] = '0'
os.environ["GLOG_minloglevel"] = "2"


# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands


class WristCurls:

    @staticmethod
    def run(frame, state):

        current_hand = state['current_hand']
        rep_count = state['rep_count']
        movement_state = state['movement_state']
        total_reps_each = state['total_reps_each']
        messages = []

        with mp_hands.Hands(min_detection_confidence=0.5, min_tracking_confidence=0.5, max_num_hands=1) as hands:
            # Flip for mirrored effect
            frame = cv2.flip(frame, 1)
            # SCREEN_HEIGHT, SCREEN_WIDTH, _ = frame.shape  # Adjust dynamically
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_frame)

            # Process Hand Landmarks
            if results.multi_hand_landmarks:
                for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                    hand_label = handedness.classification[0].label.lower()
                    if hand_label != current_hand:
                        continue  # Ignore if it's not the current hand

                    # Extract Wrist and Index Finger (as an elbow approximation)
                    wrist = hand_landmarks.landmark[mp_hands.HandLandmark.WRIST]
                    # Approximate elbow
                    index_finger = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_PIP]

                    # Convert Coordinates
                    h, w, _ = frame.shape
                    wrist_y = int(wrist.y * h)
                    elbow_y = int(index_finger.y * h)

                    # Define movement threshold relative to elbow
                    threshold_up = elbow_y - 20
                    threshold_down = elbow_y + 20

                    # Track Repetitions Properly
                    if movement_state == "down" and wrist_y < threshold_up:
                        movement_state = "up"

                    if movement_state == "up" and wrist_y > threshold_down:
                        movement_state = "down"
                        rep_count += 1  # Count one full rep (up & down)

            messages.append(
                f"{current_hand.capitalize()} Hand Reps: {rep_count}/{total_reps_each}")
            # Check if reps are completed for this hand
            if rep_count >= total_reps_each:
                rep_count = 0  # Reset reps for the next hand
                current_hand = "left" if current_hand == "right" else "done"

                if current_hand == "left":
                    messages.append("Switching to left hand.")

                elif current_hand == "done":
                    messages.append("All exercises completed. Well done!")
                    return 1

            return {
                'current_hand': current_hand,
                'rep_count': rep_count,
                'movement_state': movement_state,
                'total_reps_each': total_reps_each,
                'messages': '\n'.join(messages)
            }

        messages.append("No hands detected.")
        state['messages'] = '\n'.join(messages)
        return state

    @staticmethod
    def initial_state():
        current_hand = "right"  # Start with right hand
        rep_count = 0  # Tracks repetitions for each hand
        movement_state = "down"  # Initial movement state
        total_reps_each = 5  # Total reps for each hand

        state = {
            'current_hand': current_hand,
            'rep_count': rep_count,
            'movement_state': movement_state,
            'total_reps_each': total_reps_each
        }

        return state

    @staticmethod
    def runit(frame, state):
        state = state if state else WristCurls.initial_state()
        return WristCurls.run(frame, state)

    @staticmethod
    def initial_instruction():
        return "Raise your wrist above your elbow to complete a rep."


def main():
    # Exercise state
    state = WristCurls.initial_state()
    print(f"Starting with the {state['current_hand']} hand.")

    cap = cv2.VideoCapture(0)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            exit(0)
        new_state = WristCurls.run(frame, state)
        if new_state == 1:
            break
        state = new_state
        os.system("clear")

    cap.release()


if __name__ == "__main__":
    main()
