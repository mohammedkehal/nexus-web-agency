const API_URL = "http://127.0.0.1:8000/portfolio/";
const TOKEN_URL = "http://127.0.0.1:8000/token";

let token = localStorage.getItem("jwt_token");

window.onload = () => {
  fetchPortfolio();
  checkAuth();
};

// --- GESTION DE L'AFFICHAGE (Back-office vs Public) ---
function checkAuth() {
  const loginDiv = document.getElementById('login-container');
  const addDiv = document.getElementById('add-project-container');

  if (!loginDiv || !addDiv) return;

  if (token) {
    loginDiv.style.display = 'none';
    addDiv.style.display = 'block';
  } else {
    loginDiv.style.display = 'block';
    addDiv.style.display = 'none';
  }
}

// --- CONNEXION ---
async function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const params = new URLSearchParams();
  params.append('username', user);
  params.append('password', pass);

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (response.ok) {
      const data = await response.json();
      token = data.access_token;
      localStorage.setItem("jwt_token", token);
      checkAuth();
    } else {
      document.getElementById('login-msg').innerText = "Identifiants incorrects.";
    }
  } catch (error) {
    console.error("Erreur de connexion :", error);
  }
}

// --- DÉCONNEXION ---
function logout() {
  token = null;
  localStorage.removeItem("jwt_token");
  checkAuth();
}

// --- AJOUTER UN PROJET ---
async function addProject() {
  const title = document.getElementById('new-title').value;
  const category = document.getElementById('new-category').value;
  const img = document.getElementById('new-img').value;
  const desc = document.getElementById('new-desc').value;

  const projectData = { title: title, description: desc, category: category, image_url: img };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(projectData)
    });

    if (response.ok) {
      fetchPortfolio();
      document.getElementById('new-title').value = '';
      document.getElementById('new-category').value = '';
      document.getElementById('new-img').value = '';
      document.getElementById('new-desc').value = '';
      alert("Projet ajouté avec succès !");
    }
  } catch (error) {
    console.error("Erreur d'ajout :", error);
  }
}

// --- CHARGER LA GRILLE ET RENDRE LES CARTES CLIQUABLES ---
async function fetchPortfolio() {
  try {
    const response = await fetch(API_URL);
    const projects = await response.json();
    const grid = document.getElementById('portfolio-grid');

    if (!grid) return;

    grid.innerHTML = "";

    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'card';

      const fullImageUrl = `http://127.0.0.1:8000/${project.image_url}`;

      // On rend toute la carte cliquable
      card.style.cursor = 'pointer';
      card.onclick = () => openModal(fullImageUrl);

      card.innerHTML = `
        <img src="${fullImageUrl}"
             alt="${project.title}"
             style="width:100%; height:250px; object-fit:cover;"
             onerror="this.src='https://via.placeholder.com/600x400?text=Erreur+Extension+Image'">
        <div class="card-content">
            <span class="category">${project.category}</span>
            <h3>${project.title}</h3>
            <p>${project.description}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Erreur API :", error);
  }
}

// --- FONCTIONS POUR LA VUE EN PLEIN ÉCRAN (MODAL) ---
function openModal(imgUrl) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');

  if (modal && modalImg) {
    modalImg.src = imgUrl;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');

  if (modal) {
    modal.style.display = 'none';
    if(modalImg) modalImg.src = "";
    document.body.style.overflow = 'auto';
  }
}
