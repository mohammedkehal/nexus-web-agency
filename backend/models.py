from sqlalchemy import Column, Integer, String, Text, Boolean # <-- Boolean AJOUTÉ ICI
from database import Base

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)          # Ex: "Site Vitrine Clinique"
    description = Column(Text)      # Ex: "Gestion de rendez-vous en ligne"
    category = Column(String)       # Ex: "Santé", "Restauration", "E-commerce"
    image_url = Column(String)      # Le lien vers l'image du mockup
    is_visible = Column(Boolean, default=True) # <-- NOUVELLE COLONNE AJOUTÉE ICI

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String) # Jamais de mot de passe en clair !