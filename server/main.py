import os
from .config import FLASK_DEBUG, FLASK_ENV, DEVELOPMENT_ENVS
from .app import app

if __name__ == "__main__":
    app.run(
        use_reloader=FLASK_ENV in DEVELOPMENT_ENVS,
        port=int(os.environ.get("PORT", 3001)),
        host="0.0.0.0",
        threaded=True,
        debug=FLASK_DEBUG,
    )
