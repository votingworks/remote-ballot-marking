# pylint: disable=invalid-name
import sys
import uuid
import secrets
from typing import Optional
from urllib.parse import urlparse
from auth0.v3.authentication import GetToken
from auth0.v3.management import Auth0
from auth0.v3.exceptions import Auth0Error

from server.models import AdminUser, Organization, db_session
from server.config import (
    FLASK_ENV,
    ADMIN_AUTH0_BASE_URL,
    ADMIN_AUTH0_CLIENT_ID,
    ADMIN_AUTH0_CLIENT_SECRET,
)

AUTH0_DOMAIN = urlparse(ADMIN_AUTH0_BASE_URL).hostname


def auth0_get_token() -> str:
    response = GetToken(AUTH0_DOMAIN).client_credentials(
        ADMIN_AUTH0_CLIENT_ID,
        ADMIN_AUTH0_CLIENT_SECRET,
        f"https://{AUTH0_DOMAIN}/api/v2/",
    )
    return str(response["access_token"])


def auth0_create_audit_admin(email: str) -> Optional[str]:
    # In dev/staging environments, if we're pointing to a fake OAuth server
    # instead of Auth0, we shouldn't try to use the Auth0 API
    if FLASK_ENV in ["development", "staging"] and "auth0.com" not in str(AUTH0_DOMAIN):
        return None  # pragma: no cover

    token = auth0_get_token()
    auth0 = Auth0(AUTH0_DOMAIN, token)
    try:
        user = auth0.users.create(
            dict(
                email=email,
                password=secrets.token_urlsafe(),
                connection="Username-Password-Authentication",
            )
        )
        return str(user["user_id"])
    except Auth0Error as error:
        # If user already exists in Auth0, no problem!
        if error.status_code == 409:
            users = auth0.users_by_email.search_users_by_email(email.lower())
            return str(users[0]["user_id"])
        raise error


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m scripts.create-admin <org_id> <user_email>")
        sys.exit(1)

    org_id, email = sys.argv[1:]  # pylint: disable=unbalanced-tuple-unpacking
    user = AdminUser.query.filter_by(email=email).first()
    if user:
        print("User already exists")
        sys.exit(1)

    org = Organization.query.get(org_id)
    if not org:
        print("Organization not found")
        sys.exit(1)

    user = AdminUser(id=str(uuid.uuid4()), email=email, organization_id=org_id)
    db_session.add(user)

    auth0_create_audit_admin(email)

    db_session.commit()
    print(f"Created user {email} and added to Auth0")
