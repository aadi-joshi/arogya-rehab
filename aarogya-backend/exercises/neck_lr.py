import cv2
import mediapipe as mp
import time
import os

# Initialize MediaPipe Face Detection
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh()


class NeckLeftRight:
    @staticmethod
    def run(frame, state: dict):
        # Variables for tracking
        total_reps_each = state.get('total_reps_each', 5)
        initial_nose_x = state.get('initial_nose_x', None)
        leftmost_nose_x = state.get('leftmost_nose_x', None)
        rightmost_nose_x = state.get('rightmost_nose_x', None)
        rep_count = state.get('rep_count', 0)
        phase = state.get('phase', "setup_initial")
        start_time = state.get('start_time', time.time())
        completed = state.get('completed', False)
        messages = []

        frame = cv2.flip(frame, 1)  # Flip for mirror effect
        h, w, _ = frame.shape

        # Convert frame to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]

            # Get nose landmark (reference point)
            nose = face_landmarks.landmark[1]  # Nose tip index
            nose_x = int(nose.x * w)

            # Step 1: Capture Initial Forward Position
            if phase == "setup_initial":
                messages.append("Hold still... Setting Initial Position")

                if time.time() - start_time >= 5:
                    initial_nose_x = nose_x
                    messages.append(
                        "Now, turn your head to the left and hold for five seconds.")
                    phase = "setup_left"
                    start_time = time.time()

            # Step 2: Capture Leftmost Position
            elif phase == "setup_left":
                messages.append("Turn your head LEFT & hold for 5 seconds")

                if time.time() - start_time >= 5:
                    leftmost_nose_x = nose_x
                    messages.append(
                        "Now, turn your head to the right and hold for five seconds.")
                    phase = "setup_right"
                    start_time = time.time()

            # Step 3: Capture Rightmost Position
            elif phase == "setup_right":
                messages.append("Turn your head RIGHT & hold for 5 seconds")

                if time.time() - start_time >= 5:
                    rightmost_nose_x = nose_x
                    messages.append(
                        "Start the exercise. Turn fully left and right to complete one repetition.")
                    phase = "count_reps"

            # Step 4: Count Repetitions
            elif phase == "count_reps":
                if leftmost_nose_x is not None and rightmost_nose_x is not None:
                    # Turned fully right
                    if nose_x >= rightmost_nose_x - 10:
                        phase = "return_left"

            elif phase == "return_left":
                if nose_x <= leftmost_nose_x + 10:
                    rep_count += 1
                    messages.append(
                        f"Reps Completed: {rep_count}/{total_reps_each}")
                    phase = "count_reps"

            if rep_count > 0:
                messages.append(f"Reps Completed: {rep_count}/{total_reps_each}")

            # Show progress completion (only once)
            if rep_count >= total_reps_each and not completed:
                return 1
        else:
            messages.append("No face detected.")

        return {
            'total_reps_each': total_reps_each,
            'initial_nose_x': initial_nose_x,
            'leftmost_nose_x': leftmost_nose_x,
            'rightmost_nose_x': rightmost_nose_x,
            'rep_count': rep_count,
            'phase': phase,
            'start_time': start_time,
            'completed': completed,
            'message': '\n'.join(messages)
        }

    @staticmethod
    def initial_state():
        total_reps_each = 5
        initial_nose_x = None
        leftmost_nose_x = None
        rightmost_nose_x = None
        rep_count = 0
        phase = "setup_initial"
        start_time = time.time()
        completed = False

        state = {
            "total_reps_each": total_reps_each,
            "initial_nose_x": initial_nose_x,
            "leftmost_nose_x": leftmost_nose_x,
            "rightmost_nose_x": rightmost_nose_x,
            "rep_count": rep_count,
            "phase": phase,
            "start_time": start_time,
            "completed": completed
        }

        return state

    @staticmethod
    def runit(frame, state):
        state = state if state else NeckLeftRight.initial_state()
        return NeckLeftRight.run(frame, state)

    @staticmethod
    def initial_instruction():
        return "Turn your head left and right to complete a rep."

def main():
    state = NeckLeftRight.initial_state()
    # Start Instructions
    print("Hold still for 5 seconds to set your initial position.")

    cap = cv2.VideoCapture(0)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            exit(0)
        new_state = NeckLeftRight.run(frame, state)
        if new_state == 1:
            print("Exercise completed. Great job!")
            break
        print(new_state.get('message', ''))
        state = new_state
        os.system("clear")

    cap.release()


if __name__ == "__main__":
    main()
