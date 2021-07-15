import uuid
import json
import secrets
from datetime import datetime
from typing import List, Optional, cast
from urllib.parse import urljoin
import xml.etree.ElementTree as ET
import requests
from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest, Conflict

from .config import HTTP_ORIGIN, MAILGUN_API_KEY, MAILGUN_DOMAIN
from .models import *
from .auth import get_logged_in_admin
from .csv_parse import (
    CSVColumnType,
    CSVValueType,
    decode_csv_file,
    parse_csv,
)


api = Blueprint("api", __name__)


@api.route("/elections", methods=["POST"])
def create_election():
    user = get_logged_in_admin()
    definition = request.files["definition"]
    definition_json = json.loads(definition.read())
    election = Election(
        id=str(uuid.uuid4()),
        organization_id=user.organization_id,
        definition=definition_json,
    )
    db_session.add(election)
    db_session.commit()
    return jsonify(electionId=election.id)


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
                wasManuallyAdded=voter.was_manually_added,
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


def duplicates(items: List):
    seen = set()
    dups = set()
    for item in items:
        if item in seen:
            dups.add(item)
        else:
            seen.add(item)
    return dups


@api.route("/elections/<election_id>/voters/file", methods=["PUT"])
def upload_voter_file(election_id: str):
    election = get_or_404(Election, election_id)
    voter_file = request.files["voterFile"]

    # Parse XML or CSV voter files
    if "xml" in voter_file.mimetype:
        voters = [
            Voter(
                id=str(uuid.uuid4()),
                external_id=voter.find(".//{*}VoterIdentification").attrib["Id"],  # type: ignore
                email=voter.find(".//{*}AddressLine[@type='email']").text,  # type: ignore
                precinct=voter.find(".//{*}BallotFormIdentifier").text,  # type: ignore
                ballot_style=voter.find(".//{*}PollingPlace").attrib["IdNumber"],  # type: ignore
                election_id=election_id,
            )
            for voter in ET.parse(voter_file).getroot().findall(".//{*}VoterDetails")  # type: ignore
        ]
        duplicate_emails = duplicates([voter.email for voter in voters])
        if len(duplicate_emails) > 0:
            raise BadRequest(
                "Each voter must have a unique email."
                f" Found duplicates: {', '.join(duplicate_emails)}"
            )

    elif "csv" in voter_file.mimetype:
        parsed_voters = parse_csv(
            decode_csv_file(voter_file),
            [
                CSVColumnType(name="Voter ID", value_type=CSVValueType.TEXT),
                CSVColumnType(name="Email", value_type=CSVValueType.EMAIL, unique=True),
                CSVColumnType(name="Ballot Style", value_type=CSVValueType.TEXT),
                CSVColumnType(name="Precinct", value_type=CSVValueType.TEXT),
            ],
        )
        voters = [
            Voter(
                id=str(uuid.uuid4()),
                external_id=voter["Voter ID"],
                email=voter["Email"],
                ballot_style=voter["Ballot Style"],
                precinct=voter["Precinct"],
                election_id=election_id,
                was_manually_added=False,
            )
            for voter in parsed_voters
        ]
    else:
        raise BadRequest("Voter file must be in XML or CSV format")

    # Validate voter data against election
    for voter in voters:
        if not any(
            precinct["id"] == voter.precinct
            for precinct in election.definition["precincts"]
        ):
            raise BadRequest(
                f"Precinct {voter.precinct} is not in the election definition (voter {voter.email})"
            )
        ballot_style = next(
            (
                ballot_style
                for ballot_style in election.definition["ballotStyles"]
                if ballot_style["id"] == voter.ballot_style
            ),
            None,
        )
        if ballot_style is None:
            raise BadRequest(
                f"Ballot style {voter.ballot_style} is not in the election definition (voter {voter.email})"
            )
        if voter.precinct not in ballot_style["precincts"]:
            raise BadRequest(
                f"Precinct {voter.precinct} is not associated with ballot style {voter.ballot_style} in the election definition (voter {voter.email})"
            )

    # Add new voters
    existing_voter_emails = {
        email
        for (email,) in Voter.query.filter_by(election_id=election_id).values(
            Voter.email
        )
    }
    voters_to_add = [
        voter for voter in voters if voter.email not in existing_voter_emails
    ]
    db_session.add_all(voters_to_add)

    # Delete outdated voters
    Voter.query.filter_by(election_id=election_id, was_manually_added=False).filter(
        Voter.email.notin_([voter.email for voter in voters])
    ).delete(synchronize_session=False)

    db_session.commit()

    return jsonify(status="ok")


@api.route("/elections/<election_id>/voters", methods=["POST"])
def add_voter(election_id: str):
    get_or_404(Election, election_id)
    voter = cast(dict, request.get_json())

    if Voter.query.filter_by(
        election_id=election_id, email=voter["email"]
    ).one_or_none():
        raise Conflict(
            f"A voter with email {voter['email']} has already been added to this election"
        )

    db_session.add(
        Voter(
            id=str(uuid.uuid4()),
            external_id=voter["externalId"],
            email=voter["email"],
            ballot_style=voter["ballotStyle"],
            precinct=voter["precinct"],
            election_id=election_id,
            was_manually_added=True,
        )
    )
    db_session.commit()
    return jsonify(status="ok")


@api.route("/elections/<election_id>/voters/<voter_id>", methods=["DELETE"])
def delete_voter(election_id: str, voter_id: str):
    voter = Voter.query.filter_by(election_id=election_id, id=voter_id).one_or_none()
    if voter is None:
        return NotFound()
    if not voter.was_manually_added:
        return Conflict(
            "Cannot individually delete voters that were not individually added"
        )
    db_session.delete(voter)
    db_session.commit()
    return jsonify(status="ok")


@api.route("/elections/<election_id>/voters/emails", methods=["POST"])
def send_voter_ballot_emails(election_id: str):
    email_request = cast(dict, request.get_json())
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
