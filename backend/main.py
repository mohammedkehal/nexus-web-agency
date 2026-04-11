from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

import smtplib
from email.mime.text import MIMEText
import os
from datetime import datetime
import ssl  # <-- TRÈS IMPORTANT : Ajouté pour la sécurité de l'e-mail

import schemas
import models
import auth
from database import engine, SessionLocal

# --- NOUVEAUX MODÈLES POUR LE FORMULAIRE ---
class ClientRequestDB(models.Base):
    __tablename__ = "client_requests"
    id = Column(Integer, primary_key=True, index=True)
    company = Column(String)
    manager = Column(String)
    email = Column(String)
    whatsapp = Column(String)
    created_at = Column(DateTime, default=datetime.now)

class ClientRequestCreate(BaseModel):
    company: str
    manager: str
    email: str
    whatsapp: str

script_dir = os.path.dirname(__file__)
images_path = os.path.join(script_dir, "..", "frontend", "images")

# --- INITIALISATION DE LA BASE DE DONNÉES ---
models.Base.metadata.create_all(bind=engine)

# Initialisation de l'application
app = FastAPI(
    title="API Plateforme Agence Nexus Web",
    description="Backend sécurisé pour la gestion du portfolio et CRM",
    version="1.0.0"
)

app.mount("/images", StaticFiles(directory="../frontend/images"), name="images")

# Configuration de la sécurité CORS
origins = [
    "http://localhost:3000",
    "http://localhost:63342",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:63342",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# --- FONCTION UNIQUE D'ENVOI D'EMAIL RÉEL (VERSION AVEC LOGO INTÉGRÉ) ---
def send_notification_email(company: str, manager: str, email: str, whatsapp: str):
    """Envoie un véritable e-mail au format HTML avec le logo embarqué"""

    recipients = ["medkehalofficiel@gmail.com", "almaomaima@gmail.com" , "nexuswebrabat@gmail.com"]

    # ⚠️ ACTION REQUISE ICI : Mettez votre VRAIE adresse Gmail ci-dessous
    sender_email = "nexuswebrabat@gmail.com"
    sender_password = "xnvurkerigzmbxap"


    subject = f"🚀 NOUVEAU PROSPECT : {company}"
    wa_number = "".join(filter(str.isdigit, whatsapp))

    # Création du conteneur "Multipart" (qui permet de mélanger du texte HTML et des images)
    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = f"Nexus Web Rabat <{sender_email}>"
    msg['To'] = ", ".join(recipients)

    # --- DESIGN HTML DE L'EMAIL (AVEC LA BALISE CID) ---
    html_body = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
            .header {{ background-color: #0b1120; padding: 30px 20px; text-align: center; border-bottom: 4px solid #3b82f6; }}
            .content {{ padding: 30px; }}
            .title-box {{ border-left: 4px solid #3b82f6; padding-left: 15px; margin-bottom: 25px; }}
            .title-box h2 {{ margin: 0; color: #0f172a; font-size: 20px; }}
            .title-box p {{ margin: 5px 0 0 0; color: #64748b; font-size: 14px; }}
            .info-table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            .info-table th, .info-table td {{ padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 15px; }}
            .info-table th {{ background-color: #f8fafc; color: #475569; width: 40%; font-weight: 600; border-radius: 6px 0 0 6px; }}
            .info-table td {{ font-weight: 500; color: #0f172a; }}
            .btn-container {{ text-align: center; margin-top: 35px; margin-bottom: 10px; }}
            .btn {{ background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }}
            .footer {{ background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; }}
            .footer-text {{ font-size: 13px; color: #64748b; margin-bottom: 15px; font-weight: 600; }}
            .legal {{ background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: justify; border: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_nexus" alt="Nexus Web Rabat" style="max-width: 250px; height: auto;">
            </div>
            
            <div class="content">
                <div class="title-box">
                    <h2>Nouvelle Demande de Projet</h2>
                    <p>Enregistrée depuis la plateforme nexusweb.ma</p>
                </div>

                <table class="info-table">
                    <tr>
                        <th>🏢 Entreprise</th>
                        <td>{company}</td>
                    </tr>
                    <tr>
                        <th>👤 Gérant du Projet</th>
                        <td>{manager}</td>
                    </tr>
                    <tr>
                        <th>✉️ Adresse Email</th>
                        <td><a href="mailto:{email}" style="color: #3b82f6; text-decoration: none;">{email}</a></td>
                    </tr>
                    <tr>
                        <th>📱 Numéro WhatsApp</th>
                        <td>{whatsapp}</td>
                    </tr>
                </table>

                <div class="btn-container">
                    <a href="https://wa.me/{wa_number}" class="btn">💬 Démarrer le chat WhatsApp</a>
                </div>
            </div>

            <div class="footer">
                <div class="footer-text">
                    Système d'Alerte Automatisé - Console CRM Nexus Web
                </div>
                <div class="legal">
                    <strong>AVERTISSEMENT DE CONFIDENTIALITÉ :</strong> Ce courriel, ainsi que ses éventuelles pièces jointes, est établi à l'intention exclusive de ses destinataires (Équipe Dirigeante Nexus Web Rabat) et contient des informations strictement confidentielles. Si vous avez reçu ce message par erreur, veuillez en avertir immédiatement l'expéditeur et procéder à sa destruction. Toute lecture, utilisation, copie ou diffusion de ce message par des personnes non autorisées est formellement interdite et passible de poursuites légales.
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    # 1. On attache le code HTML au message
    html_part = MIMEText(html_body, 'html', 'utf-8')
    msg.attach(html_part)

    # 2. On charge physiquement le logo et on l'embarque dans l'email
    logo_path = os.path.join(images_path, "LogoNexusWebRabat-removebg.png")
    try:
        with open(logo_path, 'rb') as img_file:
            logo_img = MIMEImage(img_file.read())
            # On donne un ID à cette image pour que le HTML puisse l'afficher avec "cid:logo_nexus"
            logo_img.add_header('Content-ID', '<logo_nexus>')
            logo_img.add_header('Content-Disposition', 'inline')
            msg.attach(logo_img)
    except FileNotFoundError:
        print(f"⚠️ Attention: Le fichier logo est introuvable au chemin : {logo_path}")

    # 3. Envoi du paquet complet
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipients, msg.as_string())

        print(f"✅ EMAIL HTML (AVEC LOGO) ENVOYÉ AVEC SUCCÈS À : {recipients}")
    except Exception as e:
        print(f"❌ ERREUR LORS DE L'ENVOI DE L'EMAIL : {e}")


def send_client_confirmation_email(company: str, manager: str, client_email: str):
    """Envoie un reçu professionnel au client pour confirmer la réception"""

    # ⚠️ Utilisez les mêmes identifiants que pour l'autre mail
    sender_email = "nexuswebrabat@gmail.com"
    sender_password = "xnvurkerigzmbxap"

    subject = "✅ Confirmation de réception - Nexus Web Rabat"

    msg = MIMEMultipart('related')
    msg['Subject'] = subject
    msg['From'] = f"Nexus Web Rabat <{sender_email}>"
    msg['To'] = client_email

    html_body = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }}
            .header {{ background-color: #0b1120; padding: 30px; text-align: center; border-bottom: 4px solid #10b981; }}
            .content {{ padding: 40px; text-align: center; }}
            .icon {{ font-size: 50px; margin-bottom: 20px; }}
            h2 {{ color: #0f172a; margin-bottom: 10px; }}
            .message {{ color: #64748b; line-height: 1.6; margin-bottom: 30px; }}
            .summary {{ background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: left; border: 1px solid #e2e8f0; }}
            .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:logo_nexus" alt="Nexus Web" style="max-width: 200px;">
            </div>
            <div class="content">
                <div class="icon">📩</div>
                <h2>Merci de votre confiance, {manager} !</h2>
                <p class="message">
                    Nous avons bien reçu votre demande concernant l'entreprise <strong>{company}</strong>.<br>
                    Nos ingénieurs analysent actuellement vos besoins. Un membre de l'équipe Nexus Web vous contactera sous 24h.
                </p>
                <div class="summary">
                    <strong>Récapitulatif de votre demande :</strong><br>
                    • Client : {manager}<br>
                    • Structure : {company}<br>
                    • Statut : <span style="color: #10b981; font-weight: bold;">En cours de traitement</span>
                </div>
            </div>
            <div class="footer">
                Nexus Web Rabat — Expertise en Développement & Cybersécurité<br>
                Faculté des Sciences, Rabat (FSR)
            </div>
        </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    # On embarque le logo (même méthode que pour l'autre mail)
    logo_path = os.path.join(images_path, "LogoNexusWebRabat-removebg.png")
    try:
        with open(logo_path, 'rb') as img_file:
            logo_img = MIMEImage(img_file.read())
            logo_img.add_header('Content-ID', '<logo_nexus>')
            msg.attach(logo_img)
    except Exception: pass

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, client_email, msg.as_string())
    except Exception as e:
        print(f"❌ Erreur envoi client : {e}")



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

# --- ROUTES SÉCURITÉ ---
@app.post("/register", response_model=schemas.UserCreate, tags=["Sécurité"])
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris !")
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=schemas.Token, tags=["Sécurité"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- ROUTES PORTFOLIO ---
@app.post("/portfolio/", response_model=schemas.PortfolioItemResponse, tags=["Portfolio"])
def create_item(item: schemas.PortfolioItemCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    db_item = models.PortfolioItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/portfolio/", response_model=list[schemas.PortfolioItemResponse], tags=["Portfolio"])
def get_all_portfolio_items(db: Session = Depends(get_db)):
    items = db.query(models.PortfolioItem).all()
    return items

@app.delete("/portfolio/{item_id}", tags=["Portfolio"])
def delete_portfolio_item(item_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    item = db.query(models.PortfolioItem).filter(models.PortfolioItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(item)
    db.commit()
    return {"message": "Maquette supprimée avec succès"}

@app.put("/portfolio/{item_id}/toggle", tags=["Portfolio"])
def toggle_portfolio_item(item_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    item = db.query(models.PortfolioItem).filter(models.PortfolioItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    item.is_visible = not item.is_visible
    db.commit()
    return {"message": "Visibilité modifiée", "is_visible": item.is_visible}

# --- ROUTES CRM ---
# --- ROUTES CRM (FORMULAIRE CLIENT) ---

@app.post("/submit-request", tags=["CRM"])
async def receive_request(
        req: ClientRequestCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db)
):
    """Reçoit la soumission du formulaire et déclenche les deux emails"""

    # 1. Sauvegarde immédiate dans la base agence_portfolio.db
    new_request = ClientRequestDB(
        company=req.company,
        manager=req.manager,
        email=req.email,
        whatsapp=req.whatsapp
    )
    db.add(new_request)
    db.commit()

    # 2. Tâche de fond : Alerte pour Mohammed et Omaima (Le design sombre)
    background_tasks.add_task(
        send_notification_email,
        req.company,
        req.manager,
        req.email,
        req.whatsapp
    )

    # 3. Tâche de fond : Reçu de confirmation pour le Client (Le design clair)
    background_tasks.add_task(
        send_client_confirmation_email,
        req.company,
        req.manager,
        req.email
    )

    return {"status": "success", "message": "Demande enregistrée et emails envoyés."}

@app.get("/admin/requests", tags=["CRM"])
async def get_requests(db: Session = Depends(get_db)):
    requests = db.query(ClientRequestDB).all()
    return requests

@app.delete("/admin/requests/{request_id}", tags=["CRM"])
def delete_client_request(request_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Supprimer définitivement une demande client de l'historique"""
    req = db.query(ClientRequestDB).filter(ClientRequestDB.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    db.delete(req)
    db.commit()
    return {"message": "Demande supprimée avec succès"}



# --- GESTION SÉCURISÉE DES ADMINISTRATEURS ---

@app.get("/admin/users-list", tags=["Sécurité"])
def get_all_admins(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Affiche les administrateurs sans exposer les mots de passe hachés"""
    users = db.query(models.User).all()
    # On renvoie uniquement l'ID et le Username par sécurité
    return [{"id": user.id, "username": user.username} for user in users]

@app.post("/admin/create-user", tags=["Sécurité"])
def create_new_admin(user: schemas.UserCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    """Crée un nouvel admin (Uniquement accessible si on possède un Token JWT valide)"""
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris !")

    # Hachage du mot de passe avant insertion
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    return {"message": f"L'administrateur '{user.username}' a été créé avec succès."}