import datetime
import os
import jwt
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from flask_pymongo import PyMongo
from mongo_connect import connect
from generate import generate_roadmaps_response, generate_chat_response, generate_agent_response, GeneratedResponse
from models import UserProfileRecord, RoadmapRecord
from flask import Flask, request, jsonify
from threading import Thread
from dotenv import load_dotenv
load_dotenv()


ENVIRONMENT_TYPE = os.getenv("ENVIRONMENT_TYPE", "development")
print(" * Environment: ", "Development" if ENVIRONMENT_TYPE ==
      "development" else "Production")


def is_production():
    return ENVIRONMENT_TYPE == "production" or ENVIRONMENT_TYPE == "prod"


if not is_production():
    # Load the exercise mapping only in development server
    print("[Warning]! Loading heavy dependencies, this may slow down the server, this is only for development!")
    from exercises import exercise_mapping
    import base64
    import cv2
    import numpy as np


# FLASK SETUP
app = Flask(__name__)

client_connected = connect(app)
app.config['SECRET_KEY'] = os.getenv("JWT_SECRET")

if not client_connected:
    print("Failed to connect to MongoDB")
    exit(1)

mongo = PyMongo(app)


def new_conversation_id():
    return str(ObjectId())


def generate_jwt(user_id):
    expiration_time = datetime.datetime.utcnow(
    ) + datetime.timedelta(days=4)  # 4 days expiration
    payload = {
        'user_id': str(user_id),
        'exp': expiration_time
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token


def decode_jwt(token):
    try:
        decoded_token = jwt.decode(
            token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded_token['user_id']
        return user_id, None, 200
    except jwt.ExpiredSignatureError:
        return None, "Token has expired", 401
    except jwt.InvalidTokenError:
        return None, "Invalid token", 401


def has_token():
    token = request.headers.get('Authorization')
    if not token:
        return None, "Token is missing", 401

    return decode_jwt(token)


def _get_user_data(user_id):
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    user["user_id"] = str(user.pop("_id"))
    return UserProfileRecord.from_dict(user)


@app.route('/')
def home():
    return jsonify({"message": "Welcome to Aarogya API!"}), 200


@app.route('/status')
def status():
    return jsonify({"message": "API is up and running"}), 200


@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get("name")
    username = data.get("username")
    password = data.get("password")

    if not username or not password or not name:
        return jsonify({"message": "Name, Username and password are required"}), 400

    existing_user = mongo.db.users.find_one({"username": username})
    if existing_user:
        return jsonify({"message": "Username already exists"}), 400

    # Hash the password before storing it
    hashed_password = generate_password_hash(password)

    user_profile = UserProfileRecord(
        user_id=None, name=name, username=username, password=hashed_password)

    user = mongo.db.users.insert_one(user_profile.to_dict(include_id=False))

    user_profile.user_id = user.inserted_id
    token = generate_jwt(user_profile.user_id)

    return jsonify({"message": "User signed up successfully", "token": token, "user": user_profile.to_dict(include_password=False)}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    user = mongo.db.users.find_one({"username": username})

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid password"}), 401

    token = generate_jwt(user["_id"])

    del user["password"]

    id = user.pop("_id")
    user["id"] = str(id)

    return jsonify({"message": "User logged in successfully", "token": token, "user": {**user}}), 200


@app.route('/user/profile', methods=['GET'])
def get_user_profile():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404

    user["user_id"] = str(user.pop("_id"))
    user_profile = UserProfileRecord.from_dict(user)
    return jsonify({"user": user_profile.to_dict(include_password=False), "formFilled": user_profile.is_filled()}), 200


@app.route('/user/profile', methods=['POST'])
def update_user_profile():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    data = request.get_json()

    update_set = {}
    for field in UserProfileRecord.get_field_names(include_id=False):
        if field in data and data[field] is not None:
            update_set[field] = data[field]

    mongo.db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_set}
    )

    return jsonify({"message": "User profile updated successfully"}), 200


def _generate_roadmap_force(user_id):
    user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"message": "User not found"}), 404

    for k in UserProfileRecord.get_field_names(include_id=False):
        if k not in user:
            user[k] = "NOT_ADDED"

    user = UserProfileRecord.from_dict(user)

    response = generate_roadmaps_response(user=user)
    print("GENERATED ROADMAP:", response.content)

    if response.is_error():
        return jsonify({"message": f"Failed to generate a roadmap: {response.error_content()}"}), 500
    if response.content:
        roadmap = {
            "user_id": ObjectId(user_id),
            "content": response.content,
            "generation_info": response.get_generation_info(),
            "created_at": datetime.datetime.utcnow()
        }
        Thread(target=mongo.db.roadmaps.insert_one, args=(roadmap,)).start()
        return jsonify({
            "message": "Roadmap saved successfully",
            "roadmap": response.content,
            "generation_info": response.get_generation_info()
        }), 200
    else:
        return jsonify({"message": "Failed to generate a roadmap: Roadmap was empty"}), 500


@app.route('/user/generate-roadmap-force', methods=['POST'])
def generate_roadmap_force():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    return _generate_roadmap_force(user_id)


@app.route('/user/generate-roadmap', methods=['POST'])
def generate_roadmap():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    roadmaps = mongo.db.roadmaps.find({"user_id": ObjectId(user_id)})
    roadmaps = list(roadmaps)
    if len(roadmaps) > 0:
        return jsonify({"message": "Previously generated roadmap returned", "roadmap": roadmaps[-1]["content"]}), 200

    return generate_roadmap_force()


@app.route('/user/roadmaps', methods=['GET'])
def get_user_roadmaps():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    roadmaps = mongo.db.roadmaps.find({"user_id": ObjectId(user_id)})
    roadmaps = list(roadmaps)
    if not roadmaps:
        return jsonify({"message": "No roadmaps found"}), 404

    roadmaps = [RoadmapRecord(str(roadmap["_id"]), str(
        roadmap["user_id"]), roadmap["created_at"], roadmap["content"]) for roadmap in roadmaps]
    roadmaps = [roadmap.to_dict() for roadmap in roadmaps]
    return jsonify({"roadmaps": roadmaps}), 200


def compress_bot_message(bot_message):
    if type(bot_message) == str:
        return bot_message
    return bot_message['conversation_text']


def get_messages_history(conversation_id):
    messages = mongo.db.messages.find({"conversation_id": conversation_id})
    messages = list(messages)
    if not messages:
        return None
    messages = [{"user_message": message["user_message"],
                 "bot_message": compress_bot_message(message["bot_message"])} for message in messages]
    return messages


@app.route('/chat', methods=['POST'])
def chat():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    data = request.get_json()
    user_message = data.get('message')
    conversation_id = data.get('conversation_id') or None
    extra_context_data = data.get('context') or None
    user_model = _get_user_data(user_id)

    if not user_message:
        return jsonify({"message": "message is required"}), 400

    history = []
    if conversation_id:
        history = get_messages_history(conversation_id)
        if not history:
            return jsonify({"message": "Invalid conversation id"}), 400

    response: GeneratedResponse = generate_agent_response(
        user_message, history, context=extra_context_data, user=user_model)
    
    print(response)
    
    if response.is_error():
        return jsonify({"message": f"Failed to generate response, {response.error_content()}"}), 500
    if response:
        ai_response = response.content
        if not conversation_id:
            conversation_id = new_conversation_id()

        complete_message = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "user_message": user_message,
            "bot_message": ai_response,
            "created_at": datetime.datetime.utcnow()
        }

        Thread(target=mongo.db.messages.insert_one,
               args=(complete_message,)).start()
        return jsonify({"message": ai_response, "conversation_id": conversation_id}), 200
    else:
        return jsonify({"message": "Failed to fetch response from API"}), 500


@app.route('/conversations/:id', methods=['GET'])
def get_conversation():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    conversation_id = request.args.get('id')
    if not conversation_id:
        return jsonify({"message": "conversation id is required"}), 400

    messages = mongo.db.messages.find(
        {"conversation_id": conversation_id, "user_id": user_id})
    messages = list(messages)
    if not messages:
        return jsonify({"message": "No messages found"}), 404

    messages = [{"user_message": message["user_message"], "bot_message": message["bot_message"],
                 "created_at": message["created_at"]} for message in messages]
    return jsonify({"messages": messages}), 200


@app.route('/conversations', methods=['GET'])
def get_conversations():
    user_id, error, status = has_token()
    if error:
        return jsonify({"message": error}), status

    conversations = mongo.db.messages.find(
        {"user_id": user_id}).distinct("conversation_id")
    if not conversations:
        return jsonify({"message": "No conversations found"}), 404

    return jsonify({"conversations": conversations}), 200


def process_image(image):
    """
    Decode the base64 image and converts it to a NumPy array
    """
    try:
        image_data = image
        # Decode the base64 image
        if image.startswith("data:image"):
            image_data = image.split(",")[1]
        decoded_image = base64.b64decode(image_data)
    except:
        return None, "Failed to decode image", 400

    # Convert bytes to a NumPy array
    nparr = np.frombuffer(decoded_image, np.uint8)
    # Decode image using OpenCV
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    return frame, None, None


@app.route('/record-exercise', methods=['POST'])
def record_exercise():
    if is_production():
        return jsonify({
            "message": "This endpoint is disabled in production due to vercel storage limits, this endpoint is to be run on local machine only"
        }), 400

    return _record_exercise()


@app.route('/supported-exercises', methods=['GET'])
def supported_exercises():
    return jsonify({"exercises": list(exercise_mapping.keys())}), 200


def _record_exercise():
    # user_id, error, status = has_token()
    # if error:
    #     return jsonify({"message": error}), status

    data = request.get_json()
    exercise = data.get('exercise')
    image = data.get('image')
    
    data.pop('image', None)
    data.pop('exercise', None)

    if not exercise or not image:
        return jsonify({"message": "exercise and image are required"}), 400

    if exercise not in exercise_mapping:
        return jsonify({"message": "Exercise not supported"}), 400

    frame, error, status = process_image(image)
    if error:
        return jsonify({"message": error}), status

    def wrap_response(response):
        if response == 1:
            return {
                "completed": True,
                }
        return response

    try:
        state = data.get('state', None)
        response = wrap_response(exercise_mapping[exercise].runit(frame, state))
        if "error" in response:
            return jsonify({"message": "Failed to analyse image"}), 500
    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

    return jsonify({"message": "Exercise recorded successfully", "result": response}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
