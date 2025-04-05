from prompts import SYS_PROMPT_MODE_CHAT_AI_MAIN, SYS_PROMPT_MODE_ROADMAP_AI, SYS_PROMPT_MODE_ROADMAP_AI_SUFFIX, SYS_PREV_MESSAGES_HISTORY, USER_HISTORY_TEMPLATE, SYS_PROMPT_MODE_YOUTUBE_SEARCH_AGENT, SYS_PROMPT_MODE_CHAT_AI_CONTEXT
import google.generativeai as genai
from groq import Groq
from dotenv import load_dotenv
from typing import Any
from models import UserProfileRecord
import json
import os
import time
import requests

load_dotenv()

MESSAGES_HISTORY_LIMIT = 10

MESSAGES_HISTORY_METHOD_APPEND = "append_to_system_message"
MESSAGES_HISTORY_METHOD_ADD = "add_as_messages"
MESSAGES_HISTORY_METHOD = os.getenv(
    "MESSAGES_HISTORY_METHOD", MESSAGES_HISTORY_METHOD_ADD)

if MESSAGES_HISTORY_METHOD not in [MESSAGES_HISTORY_METHOD_ADD, MESSAGES_HISTORY_METHOD_APPEND]:
    MESSAGES_HISTORY_METHOD = MESSAGES_HISTORY_METHOD_ADD


# GEMINI API SETUP
_GOOGLE_GEMINI_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")
_GROQ_API_KEY = os.getenv("GROQ_API_KEY")
_YOUTUBE_DATA_API_KEY = os.getenv("YOUTUBE_DATA_API_KEY")

if not _YOUTUBE_DATA_API_KEY:
    print("Please set YOUTUBE_DATA_API_KEY in .env file")
    exit(1)

YOUTUBE_SEARCH_MAX_RESULTS = 2
YOUTUBE_SEARCH_URL = f"https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults={YOUTUBE_SEARCH_MAX_RESULTS}&key={_YOUTUBE_DATA_API_KEY}" + "&q={query}"

"""Options: GROQ, GEMINI"""
SELECTED_MODEL = os.getenv("ACTIVE_MODEL", "GROQ")

if SELECTED_MODEL not in ["GROQ", "GEMINI"]:
    SELECTED_MODEL = "GROQ"

if not _GOOGLE_GEMINI_API_KEY:
    print("Please set GOOGLE_GEMINI_API_KEY in .env file")
    exit(1)

genai.configure(api_key=_GOOGLE_GEMINI_API_KEY)
_gemini_model = genai.GenerativeModel('gemini-1.5-flash')
_groq_client = Groq()


class GeneratedResponse:
    def __init__(self, content: Any, error: bool = False, error_message: str = None, generation_info: dict = {}):
        self.content = content
        self.error = error
        self._error_message = error_message
        self._generation_info = generation_info

    def is_error(self):
        return self.error

    def error_content(self):
        return self._error_message if self.error else None

    def get_generation_info(self):
        return self._generation_info

    def print_self(self):
        print(self.__str__())

    def __str__(self):
        return json.dumps({
            "content": self.content,
            "error": self.error,
            "error_message": self._error_message,
            "generation_info": self._generation_info
        })


def _run_gemini_model(messages: list):
    prompt = ""
    for m in messages:
        if m['role'] == "user":
            prompt += f"User's Question: "
        if m['role'] == "assistant":
            prompt += f"Response: "

        prompt += f"{m['content']}\n"

    try:
        res = _gemini_model.generate_content(prompt).text
        return False, res
    except Exception as e:
        return True, str(e)


def _run_groq_model(messages: list, parse_as_json: bool = False):
    try:
        other_config = {}
        if parse_as_json:
            other_config = {
                "response_format": {"type": "json_object"},
            }
            if not parse_as_json:
                other_config["max_completion_tokens"] = 200
        completion = _groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=1,
            top_p=1,
            stream=False,
            stop=None,
            **other_config
        )
        res = completion.choices[0].message.content
        return False, res
    except Exception as e:
        return True, str(e)


def _post_process_response(response: str):
    """
    Process the response to remove any markdown and return the json object

    Returns:
        - error: True if there is an error, False otherwise
        - response: The processed JSON response or the original response if there is an error while parsing it as JSON
    """
    response = response.strip()
    json_prefixes = [
        "```json\n",
        "```json",
        "```\n",
        "```"
    ]

    # Remove prefix if present
    for prefix in json_prefixes:
        if response.startswith(prefix):
            response = response[len(prefix):]
            break

    # Remove trailing markdown
    suffixes = ["\n```", "```"]
    for suffix in suffixes:
        if response.endswith(suffix):
            response = response[:-len(suffix)]
            break

    # Final cleanup
    response = response.strip()
    try:
        return False, json.loads(response), None
    except json.JSONDecodeError as e:
        return True, response, str(e)
    except Exception as e:
        # Handle any other unexpected errors
        return True, response, str(e)


def generate_response(messages: list, parse_as_json: bool = False) -> GeneratedResponse:
    start = time.time()
    if SELECTED_MODEL == "GEMINI":
        error, response = _run_gemini_model(messages)
    else:
        error, response = _run_groq_model(messages)
    end = time.time()

    if error:
        r = GeneratedResponse(
            content=response, error=True, error_message=error)
        r.print_self()
        return r

    if parse_as_json:
        error, parsed_response, error_message = _post_process_response(
            response)
        if error:
            r = GeneratedResponse(content=parsed_response,
                                  error=True, error_message=error_message)
            r.print_self()
            return r
        response = parsed_response
    else:
        parsed_response = response

    r = GeneratedResponse(parsed_response, generation_info={
        "model": SELECTED_MODEL,
        "time_taken": end - start  # Time taken to generate the response in seconds
    })
    r.print_self()
    return r


def build_messages_history_prompt(messages):
    prompt = ""
    for message in messages:
        prompt += f"User's Question: {message['user_message']}\n"
        prompt += f"Response: {message['bot_message']}\n"
    return prompt


def build_messages_history_list(messages):
    # Build the messages history list from the last MESSAGES_HISTORY_LIMIT messages
    # TODO: FUTURE SCOPE: Summarize the very old messages and add that as top message in the history as a System message
    history = []
    for msg in messages[-MESSAGES_HISTORY_LIMIT:]:
        history.append({
            "role": "user",
            "content": msg['user_message']
        })
        history.append({
            "role": "assistant",
            "content": msg['bot_message']
        })
    return history


def generate_chat_response(user_message: str, msgs_history: list = [], user: UserProfileRecord = None) -> GeneratedResponse:
    history_prompt = ""
    history_messages = []

    if MESSAGES_HISTORY_METHOD == MESSAGES_HISTORY_METHOD_APPEND:
        if len(msgs_history) > 0:
            history = build_messages_history_prompt(msgs_history)
            history_prompt = SYS_PREV_MESSAGES_HISTORY.format(history=history)
    else:
        history = build_messages_history_list(msgs_history)
        history_messages = history

    user_details = USER_HISTORY_TEMPLATE.format(user=user) if user else ""

    full_prompt = SYS_PROMPT_MODE_CHAT_AI_MAIN.format(
        user_details=user_details,
        history_prompt=history_prompt)

    return generate_response(messages=[
        {
            "role": "system",
            "content": full_prompt
        },
        *history_messages,
        {
            "role": "user",
            "content": user_message
        }
    ], parse_as_json=False)


def generate_roadmaps_response(user: UserProfileRecord) -> GeneratedResponse:
    user_history = USER_HISTORY_TEMPLATE.format(user=user)
    full_prompt = SYS_PROMPT_MODE_ROADMAP_AI + \
        SYS_PROMPT_MODE_ROADMAP_AI_SUFFIX.format(history=user_history)

    messages = [
        {
            "role": "system",
            "content": full_prompt
        }
    ]
    response = generate_response(messages=messages, parse_as_json=True)

    # Retry if error, this is a workaround for the gemini model as it sometimes does not return a valid json response
    i = 1
    while response.is_error():
        response = generate_response(messages=messages, parse_as_json=True)
        i += 1
        if i > 5:
            break
    return response


def youtube_search(query: str) -> list:
    search_results = []
    try:
        response = requests.get(YOUTUBE_SEARCH_URL.format(query=query), headers={
            "Accept": "application/json"
        })
        response = response.json()
        if 'items' in response:
            for item in response['items']:
                search_results.append({
                    "video_id": item['id']['videoId'],
                    "title": item['snippet']['title'],
                    "description": item['snippet']['description'],
                    "thumbnail": item['snippet']['thumbnails']['default']['url'],
                    "channel_title": item['snippet']['channelTitle'],
                    "video_url": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                })

    except Exception as e:
        print(f"Error while searching YouTube: {str(e)}")

    return search_results


def generate_agent_response(user_message: str, msgs_history: list = [], context: dict = None, user: UserProfileRecord = None) -> GeneratedResponse:
    history_prompt = ""
    history_messages = []

    if MESSAGES_HISTORY_METHOD == MESSAGES_HISTORY_METHOD_APPEND:
        if len(msgs_history) > 0:
            history = build_messages_history_prompt(msgs_history)
            history_prompt = SYS_PREV_MESSAGES_HISTORY.format(history=history)
    else:
        history = build_messages_history_list(msgs_history)
        history_messages = history

    user_details = USER_HISTORY_TEMPLATE.format(user=user) if user else ""

    if context:
        context = json.dumps(context, indent=2)
        context = f"User Actions Context: '''{context}'''\n\nDo not mention this to the user, those are for your reference and analysis only."

    full_prompt = SYS_PROMPT_MODE_YOUTUBE_SEARCH_AGENT + SYS_PROMPT_MODE_CHAT_AI_CONTEXT.format(
        user_details=user_details,
        user_actions_context=(context if context else ""),
        history_prompt=history_prompt)

    messages = [
        {
            "role": "system",
            "content": full_prompt
        },
        *history_messages,
        {
            "role": "user",
            "content": user_message
        }
    ]
    response = generate_response(messages=messages, parse_as_json=True)

    # Retry if error, this is a workaround for the gemini model as it sometimes does not return a valid json response
    i = 0
    while response.is_error():
        print(f"Retrying... Attempt: {i}")
        response = generate_response(messages=messages, parse_as_json=True)
        i += 1
        if i >= 3:
            break

    if 'tool' in response.content and type(response.content) == dict:
        if response.content['tool'] == "youtube" and response.content["query"] != "":
            print("--> Executing YouTube Search")
            search_results = youtube_search(response.content['query'])
            content = response.content
            content['search_results'] = search_results
            response.content = content

    # Fallback to string response if there is an error
    if response.is_error():
        response.content = {
            "tool": "",
            "query": "",
            "conversation_text": response.content
        }
        response.error = False

    return response


if __name__ == "__main__":
    # Test the response generation
    while True:
        agent_test_message = str(input("Enter the user message: "))
        response = generate_agent_response(agent_test_message)
        print(json.dumps(response.content, indent=2))
