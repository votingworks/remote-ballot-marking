import uuid
import json
import secrets
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin
import xml.etree.ElementTree as ET
import requests
from flask import Blueprint, request, jsonify

from .config import HTTP_ORIGIN, MAILGUN_API_KEY, MAILGUN_DOMAIN
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
        Voter.query.filter_by(election_id=election_id).order_by(Voter.external_id).all()
    )
    return jsonify(
        id=election.id,
        definition=election.definition,
        voters=[
            dict(
                id=voter.id,
                externalId=voter.external_id,
                email=voter.email,
                precinct=voter.precinct,
                ballotStyle=voter.ballot_style,
                ballotEmailLastSentAt=isoformat(voter.ballot_email_last_sent_at),
            )
            for voter in voters
        ],
    )


@api.route("/elections/<election_id>", methods=["DELETE"])
def delete_election(election_id: str):
    election = get_or_404(Election, election_id)
    db_session.delete(election)
    db_session.commit()
    return jsonify(status="ok")


@api.route("/elections/<election_id>/voters", methods=["PUT"])
def set_election_voters(election_id: str):
    voters = request.files["voters"]

    voters = [
        Voter(
            id=str(uuid.uuid4()),
            external_id=voter.find(".//{*}VoterIdentification").attrib["Id"],  # type: ignore
            email=voter.find(".//{*}AddressLine[@type='email']").text,  # type: ignore
            precinct=voter.find(".//{*}BallotFormIdentifier").text,  # type: ignore
            ballot_style=voter.find(".//{*}PollingPlace").attrib["IdNumber"],  # type: ignore
            election_id=election_id,
        )
        for voter in ET.parse(voters).getroot().findall(".//{*}VoterDetails")
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


@api.route("/elections/<election_id>/voters/emails", methods=["POST"])
def send_voter_ballot_emails(election_id: str):
    email_request = request.get_json()
    voters = (
        Voter.query.filter_by(election_id=election_id)
        .filter(Voter.id.in_(email_request["voterIds"]))
        .all()
    )
    assert len(voters) == len(email_request["voterIds"])
    for voter in voters:
        voter.ballot_url_token = secrets.token_hex(16)
        send_ballot_email(
            voter.email, email_request["template"], voter.ballot_url_token
        )
        voter.ballot_email_last_sent_at = datetime.now(timezone.utc)

    db_session.commit()

    return jsonify(status="ok")


def send_ballot_email(voter_email: str, template: str, ballot_url_token: str):
    ballot_url = urljoin(HTTP_ORIGIN, f"/voter/{ballot_url_token}")

    print("SEND EMAIL", voter_email, template, ballot_url)
    if not (MAILGUN_DOMAIN and MAILGUN_API_KEY):
        raise Exception(
            "Must configure MAILGUN_DOMAIN and MAILGUN_API_KEY to send emails"
        )
    return requests.post(
        f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
        auth=("api", MAILGUN_API_KEY),
        data={
            "from": "VotingWorks Support <rbm@vx.support>",
            "to": [voter_email],
            "subject": "Your Official Ballot",
            "text": f"{template}\n{ballot_url}",
        },
    )


def isoformat(date: Optional[datetime]):
    return date and date.isoformat()
