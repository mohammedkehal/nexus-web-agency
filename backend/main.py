from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles

import schemas
import models
import auth
from database import engine, SessionLocal

import os
# On construit le chemin absolu vers le dossier images
script_dir = os.path.dirname(__file__)
images_path = os.path.join(script_dir, "..", "frontend", "images")


# --- INITIALISATION DE LA BASE DE DONNÉES ---
# Cette ligne crée le fichier 'agence_portfolio.db' et les tables au démarrage
models.Base.metadata.create_all(bind=engine)
# ---------------------------------------------------------------


# Initialisation de l'application
app = FastAPI(
    title="API Plateforme Agence",
    description="Backend sécurisé pour la gestion du portfolio",
    version="1.0.0"
)

app.mount("/images", StaticFiles(directory="../frontend/images"), name="images")

# Configuration de la sécurité CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION SÉCURITÉ JWT ---
# Indique à Swagger où aller chercher le jeton de sécurité
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Fonction pour obtenir la session de base de données
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ROUTES SYSTÈME ---
class HealthCheckResponse(BaseModel):
    status: str
    message: str

@app.get("/health", response_model=HealthCheckResponse, tags=["Système"])
async def health_check():
    return {"status": "success", "message": "L'API est opérationnelle et sécurisée."}

@app.get("/", tags=["Accueil"])
async def read_root():
    return {"message": "Bienvenue sur l'API de l'agence ! Votre infrastructure est prête."}

# --- ROUTES SÉCURITÉ (LOGIN / REGISTER) ---
@app.post("/register", response_model=schemas.UserCreate, tags=["Sécurité"])
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Créer le compte administrateur de l'agence"""

    # 1. On vérifie d'abord si l'utilisateur existe déjà
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris !")

    # 2. S'il n'existe pas, on le crée
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token, tags=["Sécurité"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Se connecter pour obtenir un jeton JWT"""
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    # Création du jeton valable 60 minutes
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- ROUTES PORTFOLIO ---
@app.post("/portfolio/", response_model=schemas.PortfolioItemResponse, tags=["Portfolio"])
def create_item(
        item: schemas.PortfolioItemCreate,
        db: Session = Depends(get_db),
        token: str = Depends(oauth2_scheme) # <-- VERROU DE SÉCURITÉ
):
    """Ajouter un nouveau site au portfolio (Nécessite d'être connecté)"""
    db_item = models.PortfolioItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/portfolio/", response_model=list[schemas.PortfolioItemResponse], tags=["Portfolio"])
def get_all_portfolio_items(db: Session = Depends(get_db)):
    """Récupère tous les exemples de sites du portfolio (Accès public)"""
    items = db.query(models.PortfolioItem).all()
    return items