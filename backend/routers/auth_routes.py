"""Registration, login and current-user endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
from auth import create_token, get_current_user, hash_password, verify_password
from database import get_db
from schemas import LoginRequest, RegisterRequest

router = APIRouter(tags=["auth"])


def serialize_user(user: models.User) -> dict:
    return {"id": user.id, "username": user.username, "email": user.email}


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    exists = (
        db.query(models.User)
        .filter(or_(models.User.username == payload.username, models.User.email == email))
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Username or email is already registered")

    user = models.User(
        username=payload.username,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": serialize_user(user)}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(
            or_(
                models.User.username == payload.username,
                models.User.email == payload.username.lower(),
            )
        )
        .first()
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return {"token": create_token(user.id), "user": serialize_user(user)}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return serialize_user(user)
