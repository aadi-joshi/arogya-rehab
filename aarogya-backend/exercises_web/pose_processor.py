import cv2
import mediapipe as mp
import numpy as np
import time

class FingerSplayTracker:
    def __init__(self, reps=10):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )
        self.reset_tracking(reps)
        
    def reset_tracking(self, reps=5):
        self.max_reps = reps
        self.splay_count = {"right": 0, "left": 0}
        self.prev_spread = {"right": None, "left": None}
        self.splay_complete = {"right": False, "left": False}
        self.exercise_order = ["right", "left"]
        self.current_exercise = 0
        self.exercise_complete = False
        self.last_hand_detected = time.time()

    def calculate_spread(self, landmarks, frame_width):
        index_tip = landmarks[self.mp_hands.HandLandmark.INDEX_FINGER_TIP]
        pinky_tip = landmarks[self.mp_hands.HandLandmark.PINKY_TIP]
        return abs(int(pinky_tip.x * frame_width) - int(index_tip.x * frame_width))

    def process_frame(self, frame):
        try:
            frame = cv2.flip(frame, 1)
            height, width, _ = frame.shape
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb_frame)
            
            current_hand = self.exercise_order[self.current_exercise]
            hand_detected = False

            if results.multi_hand_landmarks:
                for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                    hand_label = handedness.classification[0].label.lower()
                    if hand_label != current_hand:
                        continue
                        
                    hand_detected = True
                    self.last_hand_detected = time.time()
                    current_spread = self.calculate_spread(hand_landmarks.landmark, width)
                    
                    if self.prev_spread[hand_label] is not None:
                        spread_diff = current_spread - self.prev_spread[hand_label]
                        
                        if spread_diff > 25:  # Fingers spreading
                            self.splay_complete[hand_label] = True
                        
                        if self.splay_complete[hand_label] and spread_diff < -25:  # Fingers closing
                            self.splay_count[hand_label] += 1
                            print(f"Backend rep count - {hand_label}: {self.splay_count[hand_label]}")  # Console log
                            self.splay_complete[hand_label] = False
                            
                    self.prev_spread[hand_label] = current_spread

            # Reset if no hand detected for 3 seconds
            if not hand_detected and (time.time() - self.last_hand_detected) > 3:
                self.prev_spread[current_hand] = None
                self.splay_complete[current_hand] = False

            progress = int((self.splay_count[current_hand] / self.max_reps) * 100)
            
            if self.splay_count[current_hand] >= self.max_reps:
                if self.current_exercise < len(self.exercise_order) - 1:
                    self.current_exercise += 1
                    self.splay_count[current_hand] = 0
                else:
                    self.exercise_complete = True

            return {
                'splay_count': self.splay_count,
                'current_hand': current_hand,
                'progress': progress,
                'exercise_complete': self.exercise_complete,
                'hand_detected': hand_detected
            }

        except Exception as e:
            return {
                'error': str(e),
                'hand_detected': False
            }

    def stop(self):
        if self.hands:
            self.hands.close()