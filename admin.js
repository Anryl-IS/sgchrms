document.addEventListener("DOMContentLoaded", () => {

  const { createClient } = supabase;
  const supabaseClient = createClient(
    "https://hzafznqoyinfjbqrrerp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8"
  );

  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const loader = document.getElementById("loader");
  const loaderTxt = document.getElementById("loaderTxt");


  const reportsTbody = document.getElementById("reportsTbody");
  const areaFilter = document.getElementById("areaFilter");
  const filterBtn = document.getElementById("filterBtn");
  const addIRBtn = document.getElementById("addIRBtn");
  const irModal = document.getElementById("irModal");
  const irForm = document.getElementById("irForm");
  const closeIRModalBtn = document.getElementById("closeModalBtn");
  const fileInput = document.getElementById("file");
  const filePreview = document.getElementById("filePreview");


  const caseForm = document.getElementById("caseForm");
  const caseTbody = document.getElementById("caseTbody");
  const caseModal = document.getElementById("caseModal");
  const closeCaseModal = document.getElementById("closeCaseModal");
  const cancelCaseBtn = document.getElementById("cancelCaseBtn");
  const saveCaseBtn = document.getElementById("saveCaseBtn");
  const detail_STATUS = document.getElementById("detail_STATUS");
  const savedMsg = document.getElementById("savedMsg");


  const dbTbody = document.getElementById("dbTbody");
  const empSearch = document.getElementById("empSearch");
  const empModal = document.getElementById("empModal");
  const closeEmpModal = document.getElementById("closeEmpModal");
  const closeEmpBtn = document.getElementById("closeEmpBtn");


  const logoutBtn = document.getElementById("logoutBtn");


  let reportsData = [];
  let casesData = [];
  let employeesData = [];
  let editingIRId = null;
  let editingCaseId = null;


  function showLoader(text = "Loading...") {
    if (loader) {
      loader.style.display = "flex";
      loaderTxt.textContent = text;
    }
  }

  function hideLoader() {
    if (loader) loader.style.display = "none";
  }


  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tabContents.forEach(tc => {
        tc.classList.remove("active");
        if (tc.id === target) tc.classList.add("active");
      });
    });
  });


  async function fetchIRs(area = "all") {
    showLoader("Fetching Incident Reports...");
    let query = supabaseClient.from("ir_cases").select("*").order("date_posted", { ascending: false });
    if (area !== "all") query = query.eq("area", area);
    const { data, error } = await query;
    hideLoader();
    if (error) return console.error("Error fetching IRs:", error);
    reportsData = data || [];
    renderIRTable();
  }

  function renderIRTable() {
    if (!reportsTbody) return;
    reportsTbody.innerHTML = reportsData.map(ir => {
      const transcode = ir.transcode || "N/A";
      const fileLink = ir.file_url ? `<a href="${ir.file_url}" target="_blank" style="color:#0a84ff;">View File</a>` : "No File";
      return `
        <tr>
          <td>${transcode}</td>
          <td>${ir.agent_name}</td>
          <td>${fileLink}</td>
          <td>${ir.date_posted}</td>
          <td>${ir.area}</td>
          <td><span class="status-pill">${ir.status}</span></td>
          <td>
            <button class="action-btn" onclick="openIREdit(${ir.id})" style="background:#444;">Edit</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  window.openIREdit = async (id) => {
    const ir = reportsData.find(r => r.id === id);
    if (!ir) return;
    editingIRId = id;
    document.getElementById("irId").value = ir.id;
    document.getElementById("agent_name").value = ir.agent_name;
    document.getElementById("area").value = ir.area;
    document.getElementById("date_posted").value = ir.date_posted;
    document.getElementById("status").value = ir.status;
    irModal.style.display = "flex";
  };

  addIRBtn?.addEventListener("click", () => {
    editingIRId = null;
    irForm.reset();
    filePreview.innerHTML = "";
    irModal.style.display = "flex";
  });

  closeIRModalBtn?.addEventListener("click", () => irModal.style.display = "none");
  irForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(editingIRId ? "Updating IR..." : "Adding IR...");
    const agent_name = document.getElementById("agent_name").value;
    const area = document.getElementById("area").value;
    const date_posted = document.getElementById("date_posted").value;
    const status = document.getElementById("status").value;

    let payload = { agent_name, area, date_posted, status };

    if (editingIRId) {
      await supabaseClient.from("ir_cases").update(payload).eq("id", editingIRId);
    } else {
      const { data: newData } = await supabaseClient.from("ir_cases").insert([payload]).select();
      if (newData && newData[0]) reportsData.unshift(newData[0]);
    }

    await fetchIRs(areaFilter.value);
    irModal.style.display = "none";
    hideLoader();
  });

  filterBtn?.addEventListener("click", () => {
    fetchIRs(areaFilter.value);
  });

  fileInput?.addEventListener("change", (e) => {
    if (!e.target.files.length) return filePreview.innerHTML = "";
    const file = e.target.files[0];
    filePreview.innerHTML = `<span style="color:#0a84ff">${file.name}</span>`;
  });


  async function fetchCases() {
    showLoader("Fetching Cases...");
    const { data, error } = await supabaseClient.from("cases").select("*").order("case_name", { ascending: true });
    hideLoader();
    if (error) return console.error("Error fetching cases:", error);
    casesData = data || [];
    renderCaseTable();
  }

  function renderCaseTable() {
    caseTbody.innerHTML = casesData.map(c => {
      const fileLink = c.file_url ? `<a href="${c.file_url}" target="_blank" style="color:#0a84ff;">View File</a>` : "No File";
      return `
      <tr onclick="openCaseModal(${c.id})" style="cursor:pointer;">
        <td>${c.transcode || "-"}</td>
        <td>${c.case_name}</td>
        <td>${c.area}</td>
        <td>${c.status}</td>
        <td>${fileLink}</td>
      </tr>
    `;
    }).join("");
  }
  caseForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader("Adding Case...");

    const area = document.getElementById("case_area").value;
    const case_name = document.getElementById("case_name").value;
    const employees = document.getElementById("case_employees").value;
    const officer = document.getElementById("case_officer").value;
    const fileInput = document.getElementById("case_file");
    let file_url = null;

    if (fileInput.files.length) {
      const file = fileInput.files[0];
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from("cases-files")
        .upload(fileName, file);

      if (uploadError) {
        console.error("File upload error:", uploadError);
        hideLoader();
        return;
      }


      const { publicUrl } = supabaseClient
        .storage
        .from("cases-files")
        .getPublicUrl(fileName);

      file_url = publicUrl;
    }


    const areaCode = area.slice(0, 3).toUpperCase();
    const number = String(casesData.filter(c => c.area === area).length + 1).padStart(3, "0");
    const transcode = `${areaCode}-CASE-${number}`;

    const payload = { area, case_name, employees, officer, status: "Open", transcode, file_url };
    const { data, error } = await supabaseClient.from("cases").insert([payload]).select();

    if (error) {
      console.error("Error adding case:", error);
      hideLoader();
      return;
    }

    if (data && data[0]) casesData.unshift(data[0]);
    await fetchCases();
    caseForm.reset();
    document.getElementById("caseFilePreview").innerHTML = "";
    hideLoader();
  });



  async function fetchCases() {
    showLoader("Fetching Cases...");
    try {
      const { data, error } = await supabaseClient
        .from("cases")
        .select("*")
        .order("case_name", { ascending: true });

      hideLoader();

      if (error) {
        console.error("Error fetching cases:", error);
        caseTbody.innerHTML = `<tr><td colspan="5">Error loading cases.</td></tr>`;
        return;
      }

      casesData = data || [];
      renderCaseTable();
    } catch (err) {
      hideLoader();
      console.error(err);
      caseTbody.innerHTML = `<tr><td colspan="5">Error loading cases.</td></tr>`;
    }
  }

  function renderCaseTable() {
    if (!caseTbody) return;

    caseTbody.innerHTML = casesData.map(c => {
      return `
      <tr style="cursor:pointer;" onclick="openCaseModal(${c.id})">
        <td>${c.transcode || "-"}</td>
        <td>${c.case_name || "-"}</td>
        <td>${c.area || "-"}</td>
        <td>${c.status || "-"}</td>
        <td>${c.file_url ? `<a href="${c.file_url}" target="_blank" style="color:#0a84ff;" onclick="event.stopPropagation()">View File</a>` : "No File"}</td>
      </tr>
    `;
    }).join("");
  }

  window.openCaseModal = (id) => {
  const c = casesData.find(x => x.id === id);
  if (!c) return;

  editingCaseId = id;

  document.getElementById("detail_case_name").textContent = c.case_name || "-";
  document.getElementById("detail_area").textContent = c.area || "-";
  document.getElementById("detail_employees").textContent = c.employees || "-";
  document.getElementById("detail_officer").textContent = c.officer || "-";
  detail_STATUS.value = c.status || "-";

  const fileLinkEl = document.getElementById("detail_file_link");
  if (fileLinkEl) {
    fileLinkEl.innerHTML = c.file_url
      ? `<a href="${c.file_url}" target="_blank" style="color:#0a84ff;">View / Download File</a>`
      : "No file attached";
  }

  caseModal.style.display = "flex";
};

  // Close button
  closeCaseModal?.addEventListener("click", () => caseModal.style.display = "none");
  cancelCaseBtn?.addEventListener("click", () => caseModal.style.display = "none");



  window.openEmployeeModal = (emp) => {
    if (!empModal) return;
    document.getElementById("empPhoto").src = emp.photo_url || "https://i.imgur.com/6SF5KQG.png";
    const fields = ["name_english", "name_chinese", "position", "sex", "blood_type", "email", "mobile", "id_card", "dob"];
    fields.forEach(f => {
      const el = document.getElementById("emp_" + f);
      if (el) el.textContent = emp[f] || "-";
    });
    empModal.style.display = "flex";
  };

  closeEmpModal?.addEventListener("click", () => empModal.style.display = "none");
  closeEmpBtn?.addEventListener("click", () => empModal.style.display = "none");

  empSearch?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    dbTbody.innerHTML = employeesData.filter(emp =>
      emp.name_english?.toLowerCase().includes(q) ||
      emp.position?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.mobile?.toLowerCase().includes(q)
    ).map(emp => {
      const empData = JSON.stringify(emp).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
      return `
        <tr style="cursor:pointer;" onclick="openEmployeeModal(${empData})">
          <td>${emp.name_english || "-"}</td>
          <td>${emp.position || "-"}</td>
          <td>${emp.email || "-"}</td>
          <td>${emp.mobile || "-"}</td>
        </tr>
      `;
    }).join("");
  });


  logoutBtn?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });


  window.onclick = (e) => {
    if (e.target === irModal) irModal.style.display = "none";
    if (e.target === caseModal) caseModal.style.display = "none";
    if (e.target === empModal) empModal.style.display = "none";
  };

async function fetchEmployees() {
  showLoader("Fetching Employees...");

  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .order("name_english", { ascending: true });

    hideLoader();

    if (error) {
      console.error("Error fetching employees:", error);
      dbTbody.innerHTML = `<tr><td colspan="4">Error loading employees.</td></tr>`;
      return;
    }

    employeesData = data || [];
    renderEmployeesTable();
  } catch (err) {
    hideLoader();
    console.error(err);
    dbTbody.innerHTML = `<tr><td colspan="4">Error loading employees.</td></tr>`;
  }
}

function renderEmployeesTable() {
  if (!dbTbody) return;

  dbTbody.innerHTML = employeesData.map(emp => {
    const empData = JSON.stringify(emp)
      .replace(/'/g, "&apos;")
      .replace(/"/g, "&quot;");

    return `
      <tr style="cursor:pointer;" onclick="openEmployeeModal(${empData})">
        <td>${emp.name_english || "-"}</td>
        <td>${emp.position || "-"}</td>
        <td>${emp.email || "-"}</td>
        <td>${emp.mobile || "-"}</td>
      </tr>
    `;
  }).join("");
}

  fetchIRs();
  fetchCases();
  fetchEmployees();
});
