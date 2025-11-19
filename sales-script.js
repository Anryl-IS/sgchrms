/* ————————— SUPABASE CONFIG ————————— */
const SUPABASE_URL = "https://hzafznqoyinfjbqrrerp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8";

// Use the global 'supabase' object to create a new client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ————————— DOM ELEMENTS ————————— */
const reportList = document.getElementById("reportList");
const areaSelector = document.getElementById("areaSelector");
const addReportBtn = document.getElementById("addReportBtn");
const irModal = document.getElementById("irModal");
const irForm = document.getElementById("irForm");

const irId = document.getElementById("irId");
const agent_name = document.getElementById("agent_name");
const area = document.getElementById("area");
const date_posted = document.getElementById("date_posted");
const status = document.getElementById("status");
const fileInput = document.getElementById("file");
const filePreview = document.getElementById("filePreview");
const closeModalBtn = document.getElementById("closeModalBtn");

let selectedArea = null;

/* ————————— TABLE MAP ————————— */
const areaTables = {
  "MAG NORTE": "ir_mag_norte",
  "MAG SUR": "ir_mag_sur",
  "LDN": "ir_ldn",
  "LDS": "ir_lds",
  "COTABATO": "ir_cot"
};

const tableFor = (area) => areaTables[area];

/* ————————— UI UTILS ————————— */
function showModal() { irModal.classList.add("show"); }
function hideModal() { irModal.classList.remove("show"); }

function updateStats(data) {
  document.getElementById("statOpen").textContent = data.filter(r => r.status === "Open").length;
  document.getElementById("statPending").textContent = data.filter(r => r.status === "Pending").length;
  document.getElementById("statClosed").textContent = data.filter(r => r.status === "Closed").length;
}

/* ————————— FETCH & RENDER ————————— */
async function loadReports() {
  if (!selectedArea) return;
  const table = tableFor(selectedArea);

  // Use 'supabaseClient'
  const { data, error } = await supabaseClient.from(table).select("*").order("date_posted", { ascending: false });
  if (error) return console.error(error);

  updateStats(data);

  reportList.innerHTML = data
    .map(r => `
      <div class="ir-card">
        <div class="badge ${r.status.toLowerCase()}">${r.status}</div>
        <strong>${r.agent_name}</strong>
        <span class="muted">${new Date(r.date_posted).toLocaleDateString()}</span>
        ${r.file_url ? `<a href="${r.file_url}" class="file-link" target="_blank">${r.file_name}</a>` : "-"}
        <button class="ghost-btn" onclick="editReport(${r.id})">Edit</button>
        <button class="ghost-btn" onclick="deleteReport(${r.id})">Delete</button>
      </div>
    `).join("");
}

/* ————————— CRUD ————————— */
async function saveReport(e) {
  e.preventDefault();
  if (!selectedArea) return;

  const table = tableFor(selectedArea);

  let uploadedUrl = null;
  const file = fileInput.files[0];

  if (file) {
    const path = `${table}/${Date.now()}-${file.name}`;
    // Use 'supabaseClient' for storage
    const { error: uploadError } = await supabaseClient.storage.from("incident_files").upload(path, file);
    if (uploadError) return console.error("Upload failed:", uploadError);
    uploadedUrl = supabaseClient.storage.from("incident_files").getPublicUrl(path).data.publicUrl;
  }

  const payload = {
    agent_name: agent_name.value,
    date_posted: date_posted.value,
    status: status.value,
    area: selectedArea,
    file_url: uploadedUrl,
    file_name: file?.name || null
  };

  try {
    if (irId.value) {
      // Use 'supabaseClient'
      await supabaseClient.from(table).update(payload).eq("id", irId.value);
    } else {
      // Use 'supabaseClient'
      await supabaseClient.from(table).insert(payload);
    }
  } catch (err) {
    console.error("Save failed:", err);
  }

  hideModal();
  irForm.reset();
  filePreview.textContent = "No file selected";
  loadReports();
}

async function deleteReport(id) {
  const table = tableFor(selectedArea);
  if (!confirm("Are you sure you want to delete this report?")) return;
  // Use 'supabaseClient'
  await supabaseClient.from(table).delete().eq("id", id);
  loadReports();
}

async function editReport(id) {
  const table = tableFor(selectedArea);
  // Use 'supabaseClient'
  const { data, error } = await supabaseClient.from(table).select("*").eq("id", id).single();
  if (error) return console.error(error);

  irId.value = data.id;
  agent_name.value = data.agent_name;
  area.value = data.area;
  date_posted.value = data.date_posted;
  status.value = data.status;
  filePreview.textContent = data.file_name || "No file selected";

  showModal();
}

/* ————————— EVENTS ————————— */
window.editReport = editReport;
window.deleteReport = deleteReport;

areaSelector.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  selectedArea = btn.dataset.area;
  document.querySelectorAll(".area-selector button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  loadReports();
});

addReportBtn.addEventListener("click", () => {
  irForm.reset();
  irId.value = "";
  area.value = selectedArea; 
  filePreview.textContent = "No file selected";
  showModal();
});

fileInput.addEventListener("change", () => {
  filePreview.textContent = fileInput.files[0]?.name || "No file selected";
});

closeModalBtn.addEventListener("click", hideModal);
document.getElementById('refreshBtn').addEventListener('click', loadReports);


/* ————————— INIT ————————— */
selectedArea = "MAG NORTE";
const initialButton = document.querySelector(`button[data-area="${selectedArea}"]`);
if (initialButton) {
    initialButton.classList.add("active");
}
loadReports();

irForm.addEventListener("submit", saveReport);