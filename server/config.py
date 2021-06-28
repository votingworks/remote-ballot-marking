import os
import logging
from typing import Tuple
from datetime import timedelta


DEVELOPMENT_ENVS = ("development", "test")


def setup_flask_config() -> Tuple[str, bool]:
    """
    Configure Flask-specific environment variables.

    We do this here because Flask attempts to set some of its application config
    based on `FLASK_ENV` and `FLASK_DEBUG` environment variables, and that
    happens _after_ initialization and initial configuration, when calling
    `app.run(…)`. Therefore, we set them here to ensure they end up with the
    right values.

    Specifically, setting FLASK_ENV=test by itself means `app.debug` will remain
    `False`, which isn't what we want.
    """
    flask_env = os.environ.get("FLASK_ENV", "production")

    if "FLASK_DEBUG" not in os.environ:
        os.environ["FLASK_DEBUG"] = str(flask_env in DEVELOPMENT_ENVS)

    return (flask_env, os.environ["FLASK_DEBUG"].lower() not in ("0", "no", "false"))


FLASK_ENV, FLASK_DEBUG = setup_flask_config()


DEVELOPMENT_DATABASE_URL = "postgresql://rbm:rbm@localhost:5432/rbm"
TEST_DATABASE_URL = "postgresql://rbm:rbm@localhost:5432/rbmtest"


def read_database_url_config() -> str:
    environment_database_url = os.environ.get("DATABASE_URL", None)
    if environment_database_url:
        return environment_database_url

    if FLASK_ENV == "development":
        return DEVELOPMENT_DATABASE_URL
    elif FLASK_ENV == "test":
        return TEST_DATABASE_URL
    else:
        raise Exception("Missing DATABASE_URL env var")


DATABASE_URL = read_database_url_config()

STATIC_FOLDER = os.path.normpath(
    os.path.join(
        __file__, "..", "..", "client", "public" if FLASK_ENV == "test" else "build",
    )
)


def read_session_secret() -> str:
    session_secret = os.environ.get("RBM_SESSION_SECRET", None)

    if not session_secret:
        if FLASK_ENV in DEVELOPMENT_ENVS:
            # Allow omitting in development, use a fixed secret instead.
            session_secret = f"rbm-{FLASK_ENV}-session-secret-v1"
        else:
            raise Exception(
                "RBM_SESSION_SECRET env var for managing sessions is missing"
            )

    return session_secret


SESSION_SECRET = read_session_secret()

# Max time a session can be used after it's created
SESSION_LIFETIME = timedelta(hours=8)
# Max time a session can be used after the last request
SESSION_INACTIVITY_TIMEOUT = timedelta(hours=1)


def read_http_origin() -> str:
    http_origin = os.environ.get("RBM_HTTP_ORIGIN", None)

    if not http_origin:
        if FLASK_ENV in DEVELOPMENT_ENVS:
            http_origin = "http://localhost:3000"
        # For Heroku Review Apps, which get created automatically for each pull
        # request, we need to create the http origin based on the app name.
        elif FLASK_ENV == "staging":
            http_origin = f"https://{os.environ.get('HEROKU_APP_NAME')}.herokuapp.com"
        else:
            raise Exception(
                "RBM_HTTP_ORIGIN env var, e.g. https://rbm.example.com, is missing"
            )

    return http_origin


HTTP_ORIGIN = read_http_origin()


def read_admin_auth0_creds() -> Tuple[str, str, str]:
    return (
        os.environ.get("ADMIN_AUTH0_BASE_URL", ""),
        os.environ.get("ADMIN_AUTH0_CLIENT_ID", ""),
        os.environ.get("ADMIN_AUTH0_CLIENT_SECRET", ""),
    )


(
    ADMIN_AUTH0_BASE_URL,
    ADMIN_AUTH0_CLIENT_ID,
    ADMIN_AUTH0_CLIENT_SECRET,
) = read_admin_auth0_creds()


SENTRY_DSN = os.environ.get("SENTRY_DSN")

RUN_BACKGROUND_TASKS_IMMEDIATELY = bool(
    os.environ.get("RUN_BACKGROUND_TASKS_IMMEDIATELY")
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rbm.config")

logger.info(f"{DATABASE_URL=}")
logger.info(f"{HTTP_ORIGIN=}")
logger.info(f"{FLASK_ENV=}")
