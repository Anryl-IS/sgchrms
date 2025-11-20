
const SUPABASE_URL = "https://hzafznqoyinfjbqrrerp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const irTbody = document.getElementById("irTbody");
const irModal = document.getElementById("irModal");
const irForm = document.getElementById("irForm");

const ir_record_id = document.getElementById("ir_record_id");
const ir_agent = document.getElementById("ir_agent");
const ir_area = document.getElementById("ir_area");
const ir_date = document.getElementById("ir_date");
const ir_status = document.getElementById("ir_status");
const ir_file = document.getElementById("ir_file");
const ir_file_preview = document.getElementById("ir_file_preview");

const addIrBtn = document.getElementById("addIrBtn");
const refreshBtn = document.getElementById("refreshBtn");
const irCancelBtn = document.getElementById("irCancelBtn");


const kpiTotal = document.getElementById("kpiTotal");
const kpiOpen = document.getElementById("kpiOpen");
const kpiPending = document.getElementById("kpiPending");
const kpiClosed = document.getElementById("kpiClosed");

const TABLE = "ir_cases";


function showModal() {
  irModal.classList.add("show");
  irModal.removeAttribute("aria-hidden");
  ir_agent.focus();
}

function hideModal() {
  irModal.classList.remove("show");
  irModal.setAttribute("aria-hidden", "true");
}


async function loadReports() {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .select("*")
    .order("date_posted", { ascending: false });

  if (error) return console.error(error);


  kpiTotal.textContent = data.length;
  kpiOpen.textContent = data.filter(r => r.status === "Open").length;
  kpiPending.textContent = data.filter(r => r.status === "Pending").length;
  kpiClosed.textContent = data.filter(r => r.status === "Closed").length;

irTbody.innerHTML = data.map(r => `
  <tr>
    <td>${r.agent_name}</td>
    <td>${r.transcode || ""}</td>
    <td>${r.file_url ? `<a href="${r.file_url}" target="_blank">${r.file_name}</a>` : "-"}</td>
    <td>${new Date(r.date_posted).toLocaleDateString()}</td>
    <td>${r.area}</td>
    <td>${r.status}</td>
    <td>
      <button class="ghost-btn" onclick="editReport('${r.id}')">Edit</button>
      <button class="ghost-btn" onclick="deleteReport('${r.id}')">Delete</button>
    </td>
  </tr>
`).join("");

}

async function saveReport(e) {
  e.preventDefault();

  let uploadedUrl = null;
  const file = ir_file.files[0];

  if (file) {
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const path = `ir_cases/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("incident_files")
      .upload(path, file);

    if (uploadError) return console.error("Upload failed:", uploadError);

    uploadedUrl = supabaseClient
      .storage
      .from("incident_files")
      .getPublicUrl(path).data.publicUrl;
  }


  let transcode;
  if (!ir_record_id.value) {

    const { data: existing } = await supabaseClient
      .from(TABLE)
      .select("id")
      .eq("area", ir_area.value);
    const nextNum = (existing?.length || 0) + 1;
    transcode = `${ir_area.value}-IR-${String(nextNum).padStart(3, "0")}`;
  } else {

    const { data: existing } = await supabaseClient
      .from(TABLE)
      .select("transcode")
      .eq("id", ir_record_id.value)
      .single();
    transcode = existing.transcode;
  }

  const payload = {
    agent_name: ir_agent.value,
    area: ir_area.value,
    date_posted: ir_date.value,
    status: ir_status.value,
    file_url: uploadedUrl,
    file_name: file?.name || null,
    transcode
  };

  try {
    if (ir_record_id.value) {
      await supabaseClient.from(TABLE).update(payload).eq("id", ir_record_id.value);
    } else {
      await supabaseClient.from(TABLE).insert(payload);
    }
  } catch (err) {
    console.error("Save failed:", err);
  }

  hideModal();
  irForm.reset();
  ir_file_preview.textContent = "No file selected";
  loadReports();
}

async function editReport(id) {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) return console.error(error);

  ir_record_id.value = data.id;
  ir_agent.value = data.agent_name;
  ir_area.value = data.area;
  ir_date.value = data.date_posted;
  ir_status.value = data.status;
  ir_file_preview.textContent = data.file_name || "No file selected";

  showModal();
}

async function deleteReport(id) {
  if (!confirm("Delete this report?")) return;

  await supabaseClient.from(TABLE).delete().eq("id", id);
  loadReports();
}


addIrBtn.addEventListener("click", () => {
  irForm.reset();
  ir_record_id.value = "";
  ir_file_preview.textContent = "No file selected";
  showModal();
});

ir_file.addEventListener("change", () => {
  ir_file_preview.textContent = ir_file.files[0]?.name || "No file selected";
});

irCancelBtn.addEventListener("click", hideModal);
irForm.addEventListener("submit", saveReport);
refreshBtn.addEventListener("click", loadReports);


window.editReport = editReport;
window.deleteReport = deleteReport;


loadReports();
