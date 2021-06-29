import uuid
import json
from flask import Blueprint, request, jsonify

from .models import *
from .auth import get_logged_in_admin


api = Blueprint("api", __name__)


@api.route("/elections", methods=["POST"])
def create_election():
    user = get_logged_in_admin()
    definition = request.files["definition"]
    definition_json = json.loads(definition.read())
    db_session.add(
        Election(
            id=str(uuid.uuid4()),
            organization_id=user.organization_id,
            definition=definition_json,
        )
    )
    db_session.commit()
    return jsonify(status="ok")


@api.route("/elections", methods=["GET"])
def list_elections():
    user = get_logged_in_admin()
    elections = (
        Election.query.filter_by(organization_id=user.organization_id)
        .order_by(Election.created_at)
        .all()
    )
    return jsonify(
        [dict(id=election.id, definition=election.definition) for election in elections]
    )
