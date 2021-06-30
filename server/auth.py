from typing import Optional
from urllib.parse import urljoin, urlencode
from flask import Blueprint, request, session, jsonify
from authlib.integrations.flask_client import OAuth, OAuthError
from werkzeug.utils import redirect

from .models import *
from .config import (
    ADMIN_AUTH0_BASE_URL,
    ADMIN_AUTH0_CLIENT_ID,
    ADMIN_AUTH0_CLIENT_SECRET,
)

auth = Blueprint("auth", __name__)

oauth = OAuth()

auth0 = oauth.register(
    "auth0_aa",
    client_id=ADMIN_AUTH0_CLIENT_ID,
    client_secret=ADMIN_AUTH0_CLIENT_SECRET,
    api_base_url=ADMIN_AUTH0_BASE_URL,
    access_token_url=f"{ADMIN_AUTH0_BASE_URL}/oauth/token",
    authorize_url=f"{ADMIN_AUTH0_BASE_URL}/authorize",
    authorize_params={"max_age": "0"},
    client_kwargs={"scope": "openid profile email"},
)


def get_logged_in_admin() -> Optional[AdminUser]:
    email = session.get("admin_user_email")
    return email and AdminUser.query.filter_by(email=email).one_or_none()


def set_logged_in_admin(user_email: Optional[str]):
    session["admin_user_email"] = user_email


@auth.route("/auth/me")
def auth_me():
    user = get_logged_in_admin()
    if not user:
        set_logged_in_admin(None)
        return jsonify(None)

    return jsonify(
        email=user.email,
        organization=dict(id=user.organization.id, name=user.organization.name),
    )


@auth.route("/auth/login")
def login():
    redirect_uri = urljoin(request.host_url, "/auth/callback")
    return auth0.authorize_redirect(redirect_uri=redirect_uri)


@auth.route("/auth/callback")
def login_callback():
    auth0.authorize_access_token()
    user = auth0.get("userinfo").json()

    if user and user["email"]:
        db_user = AdminUser.query.filter_by(email=user["email"]).one_or_none()
        if db_user:
            set_logged_in_admin(db_user.email)

    return redirect("/")


@auth.route("/auth/logout")
def logout():
    # Because we have max_age on the oauth requests, we don't need to log out
    # of Auth0.
    set_logged_in_admin(None)
    return redirect("/")


@auth.errorhandler(OAuthError)
def handle_oauth_error(error):
    # If Auth0 sends an error to one of the callbacks, we want to redirect the
    # user to the login screen and display the error.
    return redirect(
        "/?"
        + urlencode(
            {
                "error": "oauth",
                "message": f"Login error: {error.error} - {error.description}",
            }
        )
    )
