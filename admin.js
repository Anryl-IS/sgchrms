document.addEventListener("DOMContentLoaded", () => {
  // ======== Supabase Setup ========
  const { createClient } = supabase;
  const supabaseClient = createClient(
    "https://hzafznqoyinfjbqrrerp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8"
  );

  let editingEmployeeId = null;
  const IR_TABLE = "ir_cases";

  // ======== DOM Elements ========
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const empModal = document.getElementById("empModal"); 
  const dbTbody = document.getElementById("dbTbody");
  const reportsTbody = document.getElementById("reportsTbody");
  const irModal = document.getElementById("irModal");
  const irForm = document.getElementById("irForm");
  const closeEmpBtn = document.getElementById("closeEmpBtn");
  const closeEmpModal = document.getElementById("closeEmpModal");
  const closeIRModalBtn = document.getElementById("closeModalBtn");

  // ======== 1. TAB SWITCHING LOGIC ========
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) content.classList.add('active');
      });
    });
  });

  // ======== 2. EMPLOYEES LOGIC ========
  async function loadEmployees() {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .order("name_english", { ascending: true });

    if (error) return console.error("Error loading employees:", error);

    dbTbody.innerHTML = data.map(e => {
      // Safely stringify the employee object for the onclick event
      const empData = JSON.stringify(e).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
      
      return `
        <tr class="clickable-row" style="cursor:pointer;" onclick="openEmployeeProfile(${empData})">
          <td>${e.name_english || "N/A"}</td>
          <td>${e.position || "N/A"}</td>
          <td>${e.email || "N/A"}</td>
          <td>${e.mobile || "N/A"}</td>
        </tr>
      `;
    }).join('');
  }

  // GLOBAL FUNCTION: Open Employee Profile Modal
  window.openEmployeeProfile = (emp) => {
    if (!empModal) return;

    // Set Photo
    const photo = document.getElementById("empPhoto");
    if (photo) photo.src = emp.photo_url || "https://i.imgur.com/6SF5KQG.png";

    // Map fields to IDs
    const fields = {
      "emp_name_english": emp.name_english,
      "emp_name_chinese": emp.name_chinese,
      "emp_position": emp.position,
      "emp_sex": emp.sex,
      "emp_blood_type": emp.blood_type,
      "emp_email": emp.email,
      "emp_mobile": emp.mobile,
      "emp_id_card": emp.id_card,
      "emp_dob": emp.dob
    };

    // Update text content for each ID found in HTML
    for (const [id, value] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el) el.textContent = value || "-";
    }

    empModal.style.display = "flex";
  };

  // ======== 3. INCIDENT REPORTS LOGIC ========
  async function fetchIRs() {
    if (!reportsTbody) return;
    const { data, error } = await supabaseClient
      .from(IR_TABLE)
      .select('*')
      .order('date_posted', { ascending: false });

    if (error) return console.error("Error fetching IRs:", error);

    reportsTbody.innerHTML = data.map(ir => `
      <tr>
        <td>${ir.transaction_code || 'N/A'}</td>
        <td>${ir.agent_name}</td>
        <td>${ir.file_url ? `<a href="${ir.file_url}" target="_blank" style="color:#0a84ff;">View File</a>` : 'No File'}</td>
        <td>${ir.date_posted}</td>
        <td>${ir.area}</td>
        <td><span class="status-pill">${ir.status}</span></td>
        <td>
          <button class="action-btn" onclick="prepareIREdit(${ir.id})" style="background:#444;">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  window.prepareIREdit = async (id) => {
    const { data } = await supabaseClient.from(IR_TABLE).select('*').eq('id', id).single();
    if (data) {
      document.getElementById('irId').value = data.id;
      document.getElementById('agent_name').value = data.agent_name;
      document.getElementById('area').value = data.area;
      document.getElementById('date_posted').value = data.date_posted;
      document.getElementById('status').value = data.status;
      irModal.style.display = "flex";
    }
  };

  // ======== 4. MODAL CLOSING LOGIC ========
  const closeModals = () => {
    irModal.style.display = "none";
    empModal.style.display = "none";
  };

  if(closeIRModalBtn) closeIRModalBtn.onclick = closeModals;
  if(closeEmpBtn) closeEmpBtn.onclick = closeModals;
  if(closeEmpModal) closeEmpModal.onclick = closeModals;

  window.onclick = (event) => {
    if (event.target == irModal || event.target == empModal) closeModals();
  };

  // ======== Initialization ========
  loadEmployees();
  fetchIRs();
});