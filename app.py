import os
import sys

# Set working directory to backend
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

from app import app, init_db

if __name__ == "__main__":
    init_db()
    print("[AeroGuard Backend] Running on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
