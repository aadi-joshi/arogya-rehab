class UserProfileRecord:
    def __init__(self, user_id, username, password, name, age="", gender="", height="", weight="", problems="", doYouDrink="", doYouSmoke="", medicalHistory=""):
        self.user_id = str(user_id)
        self.username = username
        self.password = password
        self.name = name
        self.age = age
        self.gender = gender
        self.height = height
        self.weight = weight
        self.problems = problems
        self.doYouDrink = doYouDrink
        self.doYouSmoke = doYouSmoke
        self.medicalHistory = medicalHistory
        
    @staticmethod
    def get_field_names(include_id=True):
        fields = ["user_id", "username", "name", "age", "gender", "height", "weight", "problems", "doYouDrink", "doYouSmoke", "medicalHistory"]
        return fields if include_id else fields[1:]
        
    def to_dict(self, include_password=True, include_id=True):
        res = {
            "user_id": self.user_id,
            "username": self.username,
            "password": self.password,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "height": self.height,
            "weight": self.weight,
            "problems": self.problems,
            "doYouDrink": self.doYouDrink,
            "doYouSmoke": self.doYouSmoke,
            "medicalHistory": self.medicalHistory,
            "formFilled": self.is_filled()
        }
        if not include_password:
            del res["password"]
        if not include_id:
            del res["user_id"]
        return res
    
    def is_filled(self):
        return all([self.age, self.height, self.weight, self.problems, self.doYouDrink, self.doYouSmoke, self.medicalHistory])

    @staticmethod
    def from_dict(data):
        return UserProfileRecord(
            user_id=str(data.get("user_id", "")),
            username=data.get("username", ""),
            password=data.get("password", ""),
            name=data.get("name", ""),
            age=data.get("age", ""),
            gender=data.get("gender", ""),
            height=data.get("height", ""),
            weight=data.get("weight", ""),
            problems=data.get("problems", ""),
            doYouDrink=data.get("doYouDrink", ""),
            doYouSmoke=data.get("doYouSmoke", ""),
            medicalHistory=data.get("medicalHistory", "")
        )

    def __str__(self):
        return f"User: {self.user_name}, Email: {self.user_email}"
    
    
class RoadmapRecord:
    def __init__(self, roadmap_id, user_id, date, content):
        self.roadmap_id = str(roadmap_id)
        self.user_id = str(user_id)
        self.date = str(date)
        self.content = content

    def __str__(self):
        return f"User: {self.user_name}, Email: {self.user_email}"
        
    def to_dict(self):
        return {
            "roadmap_id": self.roadmap_id,
            "user_id": self.user_id,
            "date": self.date,
            "content": self.content
        }