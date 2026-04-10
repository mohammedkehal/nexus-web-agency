// --- CONFIGURATION API ---
const API_URL = "http://127.0.0.1:8000/portfolio/";
const TOKEN_URL = "http://127.0.0.1:8000/token";

let token = localStorage.getItem("jwt_token");

window.onload = () => {
  fetchPortfolio();
  checkAuth();
};

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
      fetchPortfolio(); // On recharge les données pour le graph après login
    } else {
      document.getElementById('login-msg').innerText = "Identifiants incorrects.";
    }
  } catch (error) {
    console.error("Erreur de connexion :", error);
  }
}

function logout() {
  token = null;
  localStorage.removeItem("jwt_token");
  checkAuth();
}

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

async function fetchPortfolio() {
  try {
    const response = await fetch(API_URL);
    const projects = await response.json();

    // 1. Mise à jour de la grille (si on est sur index.html)
    const grid = document.getElementById('portfolio-grid');
    if (grid) {
      grid.innerHTML = "";
      projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'card';
        const fullImageUrl = project.image_url.startsWith('http') ? project.image_url : `http://127.0.0.1:8000/${project.image_url}`;
        card.onclick = () => openModal(fullImageUrl);
        card.innerHTML = `
          <img src="${fullImageUrl}" alt="${project.title}" onerror="this.src='https://via.placeholder.com/600x400?text=Nexus+Web'">
          <div class="card-content">
              <span class="category">${project.category}</span>
              <h3>${project.title}</h3>
              <p>${project.description}</p>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    // 2. Mise à jour du graphique (si on est sur admin.html)
    updateAdminChart(projects);

  } catch (error) {
    console.error("Erreur API :", error);
  }
}

function updateAdminChart(projects) {
  const canvas = document.getElementById('agencyChart');
  if (!canvas) return;

  const stats = {};
  projects.forEach(p => {
    const cat = p.category || "Autre";
    stats[cat] = (stats[cat] || 0) + 1;
  });

  const labels = Object.keys(stats);
  const dataValues = Object.values(stats);

  if (window.myNexusChart) {
    window.myNexusChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  window.myNexusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '70%'
    }
  });
}

// --- MODAL ---
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
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}


// --- FONCTIONS POUR LE GUIDE CLIENT FLOTTANT ---
function openGuideModal() {
  const guideModal = document.getElementById('guide-modal');
  if (guideModal) {
    guideModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Empêche de scroller derrière
  }
}

function closeGuideModal() {
  const guideModal = document.getElementById('guide-modal');
  if (guideModal) {
    guideModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Réactive le scroll
  }
}

// Fermer le guide si on clique en dehors de la boîte blanche
window.onclick = function(event) {
  const guideModal = document.getElementById('guide-modal');
  if (event.target === guideModal) {
    closeGuideModal();
  }
}
