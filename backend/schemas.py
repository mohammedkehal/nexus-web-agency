from pydantic import BaseModel

class PortfolioItemCreate(BaseModel):
    title: str
    description: str
    category: str
    image_url: str
    is_visible: bool = True  # <-- LA NOUVELLE LIGNE EST ICI

class PortfolioItemResponse(PortfolioItemCreate):
    id: int

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str