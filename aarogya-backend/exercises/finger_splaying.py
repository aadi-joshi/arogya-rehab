import cv2
import mediapipe as mp
import numpy as np
import os
import json

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils


class FingerSplays:
    @staticmethod
    def run(frame, state):
        total_reps_each = state["total_reps_each"]  # 5
        splay_count = state["splay_count"]  # {"right": 0, "left": 0}
        prev_spread = state["prev_spread"]  # {"right": [], "left": []}
        # {"right": False, "left": False}
        splay_complete = state["splay_complete"]
        exercise_order = state["exercise_order"]  # ["right", "left"]
        current_exercise = state["current_exercise"]  # 0
        messages = []

        with mp_hands.Hands(min_detection_confidence=0.5, min_tracking_confidence=0.5, max_num_hands=1) as hands:

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_frame)

            current_hand = exercise_order[current_exercise]

            if results.multi_hand_landmarks:
                for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                    hand_label = handedness.classification[0].label.lower()
                    if hand_label != current_hand:
                        continue

                    index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                    pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]

                    h, w, _ = frame.shape
                    index_x, index_y = int(
                        index_tip.x * w), int(index_tip.y * h)
                    pinky_x, pinky_y = int(
                        pinky_tip.x * w), int(pinky_tip.y * h)

                    spread_distance = abs(pinky_x - index_x)
                    last_spread = prev_spread[hand_label]
                    prev_spread[hand_label] = [spread_distance]

                    if len(last_spread) != 0:
                        last_spread_avg = np.average([last_spread])
                        spread_diff = spread_distance - last_spread_avg

                        if spread_diff > 15:
                            splay_complete[hand_label] = True

                        if splay_complete[hand_label] and spread_diff < -15:
                            splay_count[hand_label] += 1
                            splay_complete[hand_label] = False
                        prev_spread[hand_label] += last_spread

                    if len(prev_spread[hand_label]) > 5:
                        prev_spread[hand_label] = prev_spread[hand_label][:10]

            messages.append(
                f"{current_hand.capitalize()} Hand - Finger Splays: {splay_count[current_hand]}/{total_reps_each}")

            if splay_count[current_hand] >= total_reps_each:
                current_exercise += 1
                if current_exercise < len(exercise_order):
                    next_hand = exercise_order[current_exercise]
                    messages.append(f"Switching to {next_hand} hand.")
                else:
                    return 1

            return {
                'total_reps_each': total_reps_each,
                'splay_count': splay_count,
                'prev_spread': prev_spread,
                'splay_complete': splay_complete,
                'exercise_order': exercise_order,
                'current_exercise': current_exercise,
                'rep_count': splay_count[current_hand],
                'message': "\n".join(messages),
                'detection': True
            }

        messages.append("No hands detected.")
        state['message'] = "\n".join(messages)
        state['detection'] = False
        return state

    @staticmethod
    def initial_state():
        # Exercise state
        total_reps_each = 5
        splay_count = {"right": 0, "left": 0}
        prev_spread = {"right": [], "left": []}
        splay_complete = {"right": False, "left": False}
        exercise_order = ["right", "left"]
        current_exercise = 0

        state = {
            'total_reps_each': total_reps_each,
            'splay_count': splay_count,
            'prev_spread': prev_spread,
            'splay_complete': splay_complete,
            'exercise_order': exercise_order,
            'current_exercise': current_exercise
        }

        return state

    @staticmethod
    def runit(frame, state):
        state = state if state else FingerSplays.initial_state()
        return FingerSplays.run(frame, state)

    @staticmethod
    def initial_instruction():
        return "Hold still for 5 seconds to set your initial position."


def main():
    # Exercise state
    state = FingerSplays.initial_state()
    print(f"Starting with the {state['exercise_order'][0]} hand.")

    # Start Instructions
    print("Hold still for 5 seconds to set your initial position.")

    cap = cv2.VideoCapture(0)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            exit(0)
        new_state = FingerSplays.run(frame, state)
        if new_state == 1:
            print("Exercise completed. Great job!")
            break
        print(new_state.get('message', ''))
        state = new_state
        os.system("clear")

    cap.release()


if __name__ == "__main__":
    main()
