# Use load_dotenv before importing this module
from pymongo.mongo_client import MongoClient
import os


def connect(flask_app):
    try:
        client = MongoClient(os.getenv("MONGO_URI"))
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        flask_app.config["MONGO_URI"] = os.getenv("MONGO_URI")
        return True
    except Exception as e:
        print(e)
        return False
