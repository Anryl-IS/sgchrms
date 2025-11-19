<script>
document.addEventListener("DOMContentLoaded", () => {
  const { createClient } = supabase;
  const supabaseClient = createClient(
    "https://hzafznqoyinfjbqrrerp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8"
  );

  let editingEmployeeId = null;
  let editingIRId = null;

  // ======== DOM Elements ========
  const modal = document.getElementById("employeeModal");
  const dbTbody = document.getElementById("dbTbody");
  const addEmployeeBtn = document.getElementById("addEmployeeBtn");
  const employeeForm = document.getElementById("employeeForm");
  const photoPreview = document.getElementById("photoPreview");

  const reportsTbody = document.getElementById("reportsTbody");
  const noResults = document.getElementById("noResults");
  const noReportsResults = document.getElementById("noReportsResults");

  const profileModal = document.getElementById("profileModal");
  const profileDetails = document.getElementById("profileDetails");
  const closeProfileModalBtn = document.getElementById("closeProfileModal"); // fixed typo

  const irModal = document.getElementById("irModal");
  const irForm = document.getElementById("irForm");
  const irIdInput = document.getElementById("irId");
  const irFileInput = document.getElementById("file");
  const irFilePreview = document.getElementById("filePreview");
  const formMsg = document.getElementById("formMsg");

  // ======== Employees Tab ========
  async function loadEmployees() {
    const { data, error } = await supabaseClient.from("employees").select("*").order("id", { ascending: true });
    if (error) return console.error(error);

    dbTbody.innerHTML = data.length ? data.map(e => `
      <tr>
        <td>${e.id}</td>
        <td>${e.photo_url ? `<img src="${e.photo_url}" class="db-photo">` : ""}</td>
        <td>${e.name_english || ""}</td>
        <td>${e.email || ""}</td>
        <td>${e.position || ""}</td>
        <td>
          <button class="action-btn edit" onclick="editEmployee(${e.id})">Edit</button>
          <button class="action-btn delete" onclick="deleteEmployee(${e.id})">Delete</button>
        </td>
      </tr>
    `).join('') : '';

    document.getElementById("employeeTable").style.display = data.length ? "table" : "none";
    noResults.style.display = data.length ? "none" : "block";
  }

  window.editEmployee = async id => {
    const { data, error } = await supabaseClient.from("employees").select("*").eq("id", id).single();
    if (error || !data) return console.error(error);

    document.getElementById("name_english").value = data.name_english || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("position").value = data.position || "";
    document.getElementById("dob").value = data.dob || "";
    document.getElementById("blood_type").value = data.blood_type || "";
    document.getElementById("mobile").value = data.mobile || "";
    photoPreview.innerHTML = data.photo_url ? `<img src="${data.photo_url}" alt="photo">` : '<span style="color:#8e8e93;">(photo)</span>';

    editingEmployeeId = id;
    modal.style.display = "flex";
  };

  window.deleteEmployee = async id => {
    if (!confirm("Delete this employee?")) return;
    const { error } = await supabaseClient.from("employees").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
    else loadEmployees();
  };

  employeeForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name_english = document.getElementById("name_english").value.trim();
    const email = document.getElementById("email").value.trim();
    const position = document.getElementById("position").value.trim();
    const dob = document.getElementById("dob").value;
    const blood_type = document.getElementById("blood_type").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const file = document.getElementById("photo")?.files[0];
    let photo_url = null;

    if (file) {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabaseClient.storage.from("employee_photos").upload(fileName, file, { upsert: true });
      if (uploadError) { alert("Upload failed: " + uploadError.message); return; }
      const { data: urlData } = supabaseClient.storage.from("employee_photos").getPublicUrl(fileName);
      photo_url = urlData.publicUrl;
    }

    if (editingEmployeeId) {
      const { error } = await supabaseClient.from("employees")
        .update({ name_english, email, position, dob, blood_type, mobile, ...(photo_url && { photo_url }) })
        .eq("id", editingEmployeeId);
      if (error) { alert("Update failed: " + error.message); return; }
      editingEmployeeId = null;
    } else {
      const { error } = await supabaseClient.from("employees")
        .insert([{ name_english, email, position, dob, blood_type, mobile, photo_url }]);
      if (error) { alert("Insert failed: " + error.message); return; }
    }
    modal.style.display = "none";
    loadEmployees();
  });

  addEmployeeBtn.onclick = () => {
    editingEmployeeId = null;
    employeeForm.reset();
    photoPreview.innerHTML = '<span style="color:#8e8e93;">(photo)</span>';
    modal.style.display = "flex";
  };

  // ======== Profile Modal ========
  window.openProfileModal = async empId => {
    const { data, error } = await supabaseClient.from("employees").select("*").eq("id", empId).single();
    if (error || !data) { alert("Error loading profile."); return; }

    profileDetails.innerHTML = `
      <p><strong>Name:</strong> ${data.name_english || ""}</p>
      <p><strong>Email:</strong> ${data.email || ""}</p>
      <p><strong>Position:</strong> ${data.position || ""}</p>
      <p><strong>DOB:</strong> ${data.dob || ""}</p>
      <p><strong>Blood Type:</strong> ${data.blood_type || ""}</p>
      <p><strong>Mobile:</strong> ${data.mobile || ""}</p>
      ${data.photo_url ? `<img src="${data.photo_url}" class="db-photo" style="margin-top:10px;">` : ""}
    `;
    profileModal.style.display = "flex";
  };

  closeProfileModalBtn.onclick = () => profileModal.style.display = "none";
  window.onclick = e => {
    if (e.target === profileModal) profileModal.style.display = "none";
    if (e.target === modal) modal.style.display = "none";
    if (e.target === irModal) irModal.classList.remove("show");
  };

  // ======== Incident Reports ========
  async function fetchIRs() {
    reportsTbody.innerHTML = '';
    const { data, error } = await supabaseClient
      .from('incident_reports_sales')
      .select('*')
      .order('date_posted', { ascending: false });

    if (error) { console.error(error); return; }

    if (!data.length) { noReportsResults.style.display = "block"; return; }
    noReportsResults.style.display = "none";

    data.forEach(ir => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${ir.agent_name}</td>
        <td>${ir.file_name ? `<a href="${ir.file_url}" target="_blank">${ir.file_name}</a>` : ''}</td>
        <td>${ir.date_posted}</td>
        <td>${ir.area}</td>
        <td>${ir.status}</td>
        <td>
          <button class="action-btn edit" data-id="${ir.id}">Edit</button>
          <button class="action-btn delete" data-id="${ir.id}">Delete</button>
          <button class="action-btn view" data-url="${ir.file_url}">View</button>
        </td>
      `;
      reportsTbody.appendChild(tr);
    });
  }

  // ======== IR Modal Handling ========
  function openIRModal(edit=false, ir=null){
    irModal.classList.add('show');
    formMsg.style.display='none';
    if(edit && ir){
      irIdInput.value = ir.id;
      document.getElementById('agent_name').value = ir.agent_name;
      document.getElementById('area').value = ir.area;
      document.getElementById('date_posted').value = ir.date_posted;
      document.getElementById('status').value = ir.status;
      irFilePreview.innerHTML = ir.file_url ? `<a href="${ir.file_url}" target="_blank">${ir.file_name}</a>` : '';
    } else {
      irForm.reset();
      irIdInput.value='';
      irFilePreview.innerHTML='';
    }
  }

  document.getElementById('addIRBtn').onclick = () => openIRModal();

  reportsTbody.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if(e.target.classList.contains('edit')){
      const { data } = await supabaseClient.from('incident_reports_salesforce').select('*').eq('id', id).single();
      openIRModal(true, data);
    }
    if(e.target.classList.contains('delete')){
      if(confirm('Delete this IR?')){
        await supabaseClient.from('incident_reports_salesforce').delete().eq('id', id);
        fetchIRs();
      }
    }
    if(e.target.classList.contains('view')){
      window.open(e.target.dataset.url, '_blank');
    }
  });

  irForm.addEventListener('submit', async e => {
    e.preventDefault();
    const agent_name = document.getElementById('agent_name').value.trim();
    const area = document.getElementById('area').value.trim();
    const date_posted = document.getElementById('date_posted').value;
    const status = document.getElementById('status').value;
    const file = irFileInput.files[0];

    let file_url = '';
    let file_name = '';

    if(file){
      const filePath = `${Date.now()}_${file.name}`;
      const { data, error: uploadError } = await supabaseClient.storage.from('incident_reports_sales').upload(filePath, file, { upsert: true });
      if(uploadError) { alert("File upload failed"); return; }
      const { data: urlData } = supabaseClient.storage.from('incident_reports_sales').getPublicUrl(filePath);
      file_url = urlData.publicUrl;
      file_name = file.name;
    }

    const payload = { agent_name, area, date_posted, status };
    if(file_url) payload.file_url = file_url;
    if(file_name) payload.file_name = file_name;

    try{
      if(irIdInput.value){ // update
        await supabaseClient.from('incident_reports_salesforce').update(payload).eq('id', irIdInput.value);
      } else { // insert
        await supabaseClient.from('incident_reports_salesforce').insert(payload);
      }
      irModal.classList.remove('show');
      fetchIRs();
    } catch(err){ console.error(err); formMsg.style.display='block'; formMsg.textContent='Error saving IR'; }
  });

  // ======== Tab Switching ========
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");

      if (btn.dataset.tab === "reportsTab") fetchIRs();
      if (btn.dataset.tab === "databaseTab") loadEmployees();
    };
  });

  // ======== Initial Load ========
  loadEmployees();
  fetchIRs();
});
</script>
