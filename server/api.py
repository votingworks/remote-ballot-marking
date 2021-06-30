import uuid
import json
import xml.etree.ElementTree as ET
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


@api.route("/elections/<election_id>", methods=["GET"])
def get_election(election_id: str):
    election = get_or_404(Election, election_id)
    voters = (
        Voter.query.filter_by(election_id=election_id).order_by(Voter.voter_id).all()
    )
    return jsonify(
        id=election.id,
        definition=election.definition,
        voters=[
            dict(
                voterId=voter.voter_id,
                email=voter.email,
                precinct=voter.precinct,
                ballotStyle=voter.ballot_style,
            )
            for voter in voters
        ],
    )


@api.route("/elections/<election_id>/voters", methods=["PUT"])
def set_election_voters(election_id: str):
    voters = request.files["voters"]

    tree = ET.parse(voters)
    voters = [
        Voter(
            id=str(uuid.uuid4()),
            voter_id=voter.find(".//{*}VoterIdentification").attrib["Id"],
            email=voter.find(".//{*}AddressLine[@type='email']").text,
            precinct="TODO",
            ballot_style="TODO",
            election_id=election_id,
        )
        for voter in tree.getroot().findall(".//{*}Voter")
    ]

    # Remove duplicates
    voters_by_email = {voter.email: voter for voter in voters}

    # Add new voters
    existing_voter_emails = {
        email
        for (email,) in Voter.query.filter_by(election_id=election_id).values(
            Voter.email
        )
    }
    voters_to_add = [
        voter
        for email, voter in voters_by_email.items()
        if email not in existing_voter_emails
    ]
    db_session.add_all(voters_to_add)

    # Delete outdated voters
    Voter.query.filter_by(election_id=election_id).filter(
        Voter.email.notin_(voters_by_email.keys())
    ).delete(synchronize_session=False)

    db_session.commit()

    return jsonify(status="ok")
