from typing import Type, TypeVar
from datetime import datetime as dt, timezone
from werkzeug.exceptions import NotFound
from sqlalchemy import *
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator
from .database import Base  # pylint: disable=cyclic-import

C = TypeVar("C")  # pylint: disable=invalid-name


class UTCDateTime(TypeDecorator):  # pylint: disable=abstract-method
    # Store with no timezone
    impl = DateTime

    # Ensure UTC timezone on write
    def process_bind_param(self, value, dialect):
        if value:
            assert (
                value.tzinfo == timezone.utc
            ), "All datetimes must have UTC timezone - use datetime.now(timezone.utc)"
        return value

    # Repopulate UTC timezone on read
    def process_result_value(self, value, dialect):
        return value and value.replace(tzinfo=timezone.utc)


class BaseModel(Base):
    __abstract__ = True
    created_at = Column(
        UTCDateTime, default=lambda: dt.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        UTCDateTime,
        default=lambda: dt.now(timezone.utc),
        onupdate=lambda: dt.now(timezone.utc),
        nullable=False,
    )


class Organization(BaseModel):
    id = Column(String(200), primary_key=True)
    name = Column(String(200), nullable=False, unique=True)


def get_or_404(model: Type[Base], primary_key: str):
    instance = model.query.get(primary_key)
    if instance:
        return instance
    raise NotFound(f"{model.__class__.__name__} {primary_key} not found")
