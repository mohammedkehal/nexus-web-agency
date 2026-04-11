// --- CONFIGURATION API ---
const BASE_URL = "http://127.0.0.1:8000";
const API_URL = `${BASE_URL}/portfolio/`;
const TOKEN_URL = `${BASE_URL}/token`;

let token = localStorage.getItem("jwt_token");

window.onload = () => {
  fetchPortfolio();
  checkAuth();

  if (document.getElementById('crm-table-body')) {
    loadAdminRequests();
  }
};

function checkAuth() {
  const loginDiv = document.getElementById('login-container');
  const addDiv = document.getElementById('add-project-container');
  const accessBtn = document.getElementById('btn-manage-access'); // On récupère le bouton
  if (!loginDiv || !addDiv) return;

  if (token) {
    loginDiv.style.display = 'none';
    addDiv.style.display = 'block';
    if(accessBtn) accessBtn.style.display = 'block'; // On affiche le bouton
    loadAdmins();
  } else {
    loginDiv.style.display = 'block';
    addDiv.style.display = 'none';
    if(accessBtn) accessBtn.style.display = 'none'; // On cache le bouton
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
      fetchPortfolio();
      loadAdminRequests();
      loadAdmins(); // NOUVEAU : On charge la liste des admins juste après le login
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

// ==========================================
// 1. GESTION DU PORTFOLIO
// ==========================================

async function addProject() {
  const title = document.getElementById('new-title').value;
  const category = document.getElementById('new-category').value;
  const img = document.getElementById('new-img').value;
  const desc = document.getElementById('new-desc').value;

  if (!title || !category || !img || !desc) {
    alert("⚠️ Veuillez remplir tous les champs, y compris la description !");
    return;
  }

  const projectData = { title: title, description: desc, category: category, image_url: img, is_visible: true };

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
      alert("✅ Projet ajouté avec succès !");
    } else {
      const errorData = await response.json();
      alert("❌ Erreur du serveur : " + JSON.stringify(errorData));
    }
  } catch (error) {
    console.error("Erreur d'ajout :", error);
    alert("❌ Impossible de contacter le serveur Python.");
  }
}

async function fetchPortfolio() {
  try {
    const response = await fetch(API_URL);
    const projects = await response.json();

    const grid = document.getElementById('portfolio-grid');
    if (grid) {
      grid.innerHTML = "";
      projects.forEach(project => {
        if (project.is_visible !== false) {
          const card = document.createElement('div');
          card.className = 'card';
          const fullImageUrl = project.image_url.startsWith('http') ? project.image_url : `${BASE_URL}/${project.image_url}`;
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
        }
      });
    }

    updateAdminChart(projects);
    updateAdminPortfolioList(projects);

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
      plugins: { legend: { position: 'bottom' } },
      cutout: '70%'
    }
  });
}

// ==========================================
// 2. FONCTIONS DE GESTION (CACHER / SUPPRIMER)
// ==========================================

function updateAdminPortfolioList(projects) {
  const tbody = document.getElementById('admin-portfolio-list');
  if (!tbody) return;

  tbody.innerHTML = '';
  projects.forEach(p => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = "1px solid #e2e8f0";

    const visibilityBtn = p.is_visible === false
      ? `<button onclick="toggleProjectVisibility(${p.id})" style="background: #f59e0b; padding: 6px 12px; font-size: 0.85rem; width: auto; border-radius: 6px;">👁️ Rendre Visible</button>`
      : `<button onclick="toggleProjectVisibility(${p.id})" style="background: #64748b; padding: 6px 12px; font-size: 0.85rem; width: auto; border-radius: 6px;">🙈 Cacher</button>`;

    const statusBadge = p.is_visible === false
      ? `<span style="background: #fee2e2; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Caché</span>`
      : `<span style="background: #d1fae5; color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">En Ligne</span>`;

    const imgUrl = p.image_url.startsWith('http') ? p.image_url : `${BASE_URL}/${p.image_url}`;

    tr.innerHTML = `
      <td style="padding: 12px;"><img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://via.placeholder.com/50'"></td>
      <td style="padding: 12px; font-weight: bold; color: #0f172a;">${p.title}</td>
      <td style="padding: 12px; color: #64748b;">${p.category}</td>
      <td style="padding: 12px;">${statusBadge}</td>
      <td style="padding: 12px; text-align: center; display: flex; gap: 10px; justify-content: center; align-items: center; height: 100%;">
        ${visibilityBtn}
        <button onclick="deleteProject(${p.id})" style="background: #ef4444; padding: 6px 12px; font-size: 0.85rem; width: auto; border-radius: 6px;">🗑️ Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteProject(id) {
  if (!confirm("⚠️ Voulez-vous vraiment supprimer définitivement cette maquette ?")) return;
  try {
    const response = await fetch(`${API_URL}${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) fetchPortfolio();
  } catch (error) { console.error(error); }
}

async function toggleProjectVisibility(id) {
  try {
    const response = await fetch(`${API_URL}${id}/toggle`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) fetchPortfolio();
  } catch (error) { console.error(error); }
}

// ==========================================
// 3. FONCTIONS CRM (DEMANDES CLIENTS)
// ==========================================

async function submitClientRequest() {
  const data = {
    company: document.getElementById('client-company').value,
    manager: document.getElementById('client-manager').value,
    email: document.getElementById('client-email').value,
    whatsapp: document.getElementById('client-whatsapp').value
  };

  try {
    const response = await fetch(`${BASE_URL}/submit-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert("🚀 Demande envoyée avec succès !");
      document.getElementById('client-form').reset();
    }
  } catch (error) { console.error(error); }
}

async function loadAdminRequests() {
  const tbody = document.getElementById('crm-table-body');
  if (!tbody) return;

  try {
    const response = await fetch(`${BASE_URL}/admin/requests`);
    if (response.ok) {
      const requests = await response.json();
      tbody.innerHTML = '';

      requests.reverse().forEach(req => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #e2e8f0";

        let dateStr = "Date inconnue";
        let timeStr = "";
        if (req.created_at) {
          const dateObj = new Date(req.created_at);
          dateStr = dateObj.toLocaleDateString('fr-FR');
          timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        const waNumber = req.whatsapp ? req.whatsapp.replace(/[^0-9]/g, '') : "";

        tr.innerHTML = `
          <td style="padding: 12px; color: #64748b;">📅 ${dateStr}<br>🕒 ${timeStr}</td>
          <td style="padding: 12px; font-weight: bold; color: #0f172a;">🏢 ${req.company}</td>
          <td style="padding: 12px;">👤 ${req.manager}</td>
          <td style="padding: 12px;"><a href="mailto:${req.email}" style="color: #3b82f6; text-decoration: none;">✉️ ${req.email}</a></td>
          <td style="padding: 12px; text-align: center;">
            <span style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #475569;">${req.whatsapp}</span>
            <div style="display: flex; gap: 8px; justify-content: center;">
                <a href="https://wa.me/${waNumber}" target="_blank" style="background: #10b981; color: white; padding: 6px 10px; border-radius: 4px; text-decoration: none; font-size: 0.85rem; display: inline-block;">
                  Ouvrir Chat 💬
                </a>
                <button onclick="deleteCRMRequest(${req.id})" style="background: #ef4444; color: white; padding: 6px 10px; border-radius: 4px; font-size: 0.85rem; border: none; cursor: pointer;">
                  🗑️
                </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (error) { console.error(error); }
}

async function deleteCRMRequest(id) {
  if (!confirm("⚠️ Voulez-vous vraiment supprimer cette demande client ?")) return;
  try {
    const response = await fetch(`${BASE_URL}/admin/requests/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) loadAdminRequests();
  } catch (error) { console.error(error); }
}

// ==========================================
// 4. MODALS (IMAGES ET GUIDE)
// ==========================================

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

function openGuideModal() {
  const guideModal = document.getElementById('guide-modal');
  if (guideModal) {
    guideModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

function closeGuideModal() {
  const guideModal = document.getElementById('guide-modal');
  if (guideModal) {
    guideModal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

window.onclick = function(event) {
  const guideModal = document.getElementById('guide-modal');
  if (event.target === guideModal) {
    closeGuideModal();
  }
}

// ==========================================
// 5. GESTION DES ADMINISTRATEURS (DESIGN PREMIUM)
// ==========================================

async function loadAdmins() {
  const currentToken = localStorage.getItem('jwt_token');
  if (!currentToken) return;

  try {
    const response = await fetch(`${BASE_URL}/admin/users-list`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    if (response.ok) {
      const users = await response.json();
      const listElement = document.getElementById('admins-list');
      if(listElement) {
        listElement.innerHTML = '';

        users.forEach(user => {
          // On récupère la première lettre du pseudo pour l'avatar
          const initial = user.username.charAt(0).toUpperCase();

          listElement.innerHTML += `
            <li style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; transition: all 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#ffffff'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#f8fafc'; this.style.boxShadow='none'">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="background: #e0f2fe; color: #0284c7; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; border: 2px solid #bae6fd;">
                  ${initial}
                </div>
                <div>
                  <div style="font-weight: 600; color: #0f172a; font-size: 0.95rem;">${user.username}</div>
                  <div style="color: #64748b; font-size: 0.8rem;">ID Unique : #${user.id}</div>
                </div>
              </div>
              <div style="background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 6px; border: 1px solid #a7f3d0;">
                <span style="display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%; box-shadow: 0 0 4px #10b981;"></span> Actif
              </div>
            </li>
          `;
        });
      }
    }
  } catch (error) {
    console.error("Erreur de chargement des admins:", error);
  }
}

async function createAdmin() {
  const currentToken = localStorage.getItem('jwt_token');
  const usernameInput = document.getElementById('new-admin-username').value;
  const passwordInput = document.getElementById('new-admin-password').value;

  try {
    const response = await fetch(`${BASE_URL}/admin/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        username: usernameInput,
        password: passwordInput
      })
    });

    const result = await response.json();

    if (response.ok) {
      alert("✅ " + result.message);
      document.getElementById('create-admin-form').reset();
      loadAdmins();
    } else {
      alert("❌ Erreur : " + result.detail);
    }
  } catch (error) {
    alert("❌ Erreur de connexion au serveur.");
  }
}

function openAdminModal() {
  const modal = document.getElementById('access-modal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Empêche de scroller la page derrière
  }
}

function closeAdminModal() {
  const modal = document.getElementById('access-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Réactive le scroll
  }
}
