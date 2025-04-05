# Aarogra API

To run locally do following:
1. Clone repo
2. Navigate into cloned project directory
3. Install required packages
```bash
pip install -r requirements_all.txt
```
4. Run the server

## For Windows Users:
```bash
# Gunicorn doesn't work on Windows, use Flask's built-in server instead
pip install waitress  # A Windows-compatible WSGI server
python -m waitress-serve --port=5000 --host=192.168.210.201 app:app

# Or simply use Flask's development server
python -c "from app import app; app.run(host='0.0.0.0', port=5000)"
```

## For Unix/Linux/Mac Users:
```bash
# Use Gunicorn (only works on Unix-based systems)
gunicorn app:app --bind 0.0.0.0:5000
```

Your API will be accessible at `http://192.168.210.201:5000`

## Accessing from Your Frontend
Use this URL in your frontend API configuration to connect to your local backend.