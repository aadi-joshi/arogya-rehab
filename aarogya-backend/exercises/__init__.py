try:
    import mediapipe as mp
    import numpy as np
    import cv2
except ImportError as e:
    missing_module = str(e).split()[-1].replace("'", "")
    print(
        f"Error: '{missing_module}' is not installed. \nPlease install it with 'pip install <package-name>'")
    exit(-1)

from .finger_splaying import FingerSplays
from .neck_lr import NeckLeftRight
from .wrist_curls_mod import WristCurls

exercise_mapping = {
    "finger_splaying": FingerSplays,
    "neck_lr": NeckLeftRight,
    "wrist_curls": WristCurls
}