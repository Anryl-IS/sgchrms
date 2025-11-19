
    const SUPABASE_URL = 'https://hzafznqoyinfjbqrrerp.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


    const loader = document.getElementById('loader');
    const loaderTxt = document.getElementById('loaderTxt');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = 'index.html';
    });

  
    tabBtns.forEach(btn => btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      contents.forEach(c => c.classList.remove('active'));
      const id = btn.dataset.tab;
      document.getElementById(id).classList.add('active');
    }));


    if (!sessionStorage.getItem('loggedIn')) {

      window.location.href = 'index.html';
    }

    const irTbody = document.getElementById('irTbody');
    const addBtn = document.getElementById('addIRBtn');
    const modal = document.getElementById('irModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('irForm');
    const saveBtn = document.getElementById('saveBtn');
    const fileInput = document.getElementById('file');
    const filePreview = document.getElementById('filePreview');
    const modalTitle = document.getElementById('modalTitle');
    const irIdInput = document.getElementById('irId');

    addBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));

    irTbody.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      if (e.target.classList.contains('edit')) {
        showLoader('Loading report...');
        const { data, error } = await supabase.from('incident_reports_salesforce').select('*').eq('id', id).single();
        hideLoader();
        if (error) { alert('Error loading report'); return; }
        openModal(true, data);
      }
      if (e.target.classList.contains('delete')) {
        if (confirm('Delete this report?')) {
          showLoader('Deleting...');
          await supabase.from('incident_reports_salesforce').delete().eq('id', id);
          hideLoader();
          fetchIRs();
        }
      }
      if (e.target.classList.contains('view')) {
        window.open(e.target.dataset.url, '_blank');
      }
    });

    function openModal(edit = false, ir = null) {
      modal.classList.add('show');
      if (edit && ir) {
        modalTitle.textContent = 'Edit Incident Report';
        irIdInput.value = ir.id;
        document.getElementById('agent_name').value = ir.agent_name || '';
        document.getElementById('area').value = ir.area || '';
        document.getElementById('date_posted').value = ir.date_posted ? new Date(ir.date_posted).toISOString().split('T')[0] : '';
        document.getElementById('status').value = ir.status || '';
        filePreview.innerHTML = ir.file_name ? `<a href="${ir.file_url}" target="_blank">${ir.file_name}</a>` : '';
      } else {
        modalTitle.textContent = 'Add Incident Report';
        form.reset();
        irIdInput.value = '';
        filePreview.innerHTML = '';
      }
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const agent_name = document.getElementById('agent_name').value;
      const area = document.getElementById('area').value;
      const date_posted = document.getElementById('date_posted').value;
      const status = document.getElementById('status').value;
      const file = fileInput.files[0];

      let file_name = '';
      let file_url = '';

      try {
        showLoader('Uploading file...');
        if (file) {
          file_name = `${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('incident_reports_sales')
            .upload(file_name, file);
          if (uploadError) {
            hideLoader();
            alert('File upload failed!');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            return;
          }
          const { data: publicURL } = supabase.storage
            .from('incident_reports_sales')
            .getPublicUrl(file_name);
          file_url = publicURL.publicUrl;
        }

        const payload = { agent_name, area, date_posted, status, file_name, file_url };

        if (irIdInput.value) {
          await supabase.from('incident_reports_salesforce').update(payload).eq('id', irIdInput.value);
        } else {
          await supabase.from('incident_reports_salesforce').insert([payload]);
        }

        hideLoader();
        modal.classList.remove('show');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
        fetchIRs();
      } catch (err) {
        hideLoader();
        console.error(err);
        alert('Error saving incident. Check console.');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });

    const filterBtn = document.getElementById('filterBtn');
    const areaFilter = document.getElementById('areaFilter');

    filterBtn.addEventListener('click', () => {
      const selected = areaFilter.value;
      fetchIRs(selected);
    });

    async function fetchIRs(area = 'all') {
      showLoader('Loading incident reports...');
      irTbody.innerHTML = '';

      const tables = [
        { name: 'ir_mag_norte', label: 'Mag Norte' },
        { name: 'ir_mag_sur', label: 'Mag Sur' },
        { name: 'ir_ldn', label: 'Lanao Del Norte' },
        { name: 'ir_lds', label: 'Lanao Del Sur' },
        { name: 'ir_cot', label: 'Cotabato' }
      ];

      let allData = [];

      try {
        if (area === 'all') {
    
          const fetchPromises = tables.map(async t => {
            const { data, error } = await supabase
              .from(t.name)
              .select('*')
              .order('date_posted', { ascending: false });
            if (!error && data) {
              return data.map(d => ({ ...d, area_label: t.label }));
            }
            return [];
          });

          const results = await Promise.all(fetchPromises);
          allData = results.flat();
        } else {

          const selectedTable = tables.find(t => t.name === area);
          if (!selectedTable) {
            hideLoader();
            alert('Invalid area selected.');
            return;
          }

          const { data, error } = await supabase
            .from(selectedTable.name)
            .select('*')
            .order('date_posted', { ascending: false });

          if (error) throw error;
          allData = data.map(d => ({ ...d, area_label: selectedTable.label }));
        }

        hideLoader();

        if (allData.length === 0) {
          irTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No Incident Reports</td></tr>`;
          return;
        }

        allData.sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));

        allData.forEach(ir => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
        <td>${escapeHtml(ir.agent_name || '')}</td>
        <td>${ir.file_name ? `<a href="${ir.file_url}" target="_blank">${escapeHtml(ir.file_name)}</a>` : ''}</td>
        <td>${ir.date_posted ? new Date(ir.date_posted).toLocaleDateString() : ''}</td>
        <td>${escapeHtml(ir.area_label || '')}</td>
        <td>${escapeHtml(ir.status || '')}</td>
        <td>
          ${ir.file_url ? `<button class="action-btn view" data-url="${ir.file_url}">View</button>` : ''}
        </td>
      `;
          irTbody.appendChild(tr);
        });
      } catch (err) {
        hideLoader();
        console.error(err);
        irTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Error loading data.</td></tr>`;
      }
    }

    fetchIRs();


    const caseTbody = document.getElementById('caseTbody');
    const caseForm = document.getElementById('caseForm');
    const caseModal = document.getElementById('caseModal');
    const closeCaseModal = document.getElementById('closeCaseModal');
    const cancelCaseBtn = document.getElementById('cancelCaseBtn');
    const saveCaseBtn = document.getElementById('saveCaseBtn');
    const savedMsg = document.getElementById('savedMsg');
    const detail_case_name = document.getElementById('detail_case_name');
    const detail_area = document.getElementById('detail_area');
    const detail_employees = document.getElementById('detail_employees');
    const detail_officer = document.getElementById('detail_officer');
    const detail_STATUS = document.getElementById('detail_STATUS');
    const detail_file_link = document.getElementById('detail_file_link');


    let currentCase = null;
    let originalStatus = null;
    let employeesCache = [];

    async function loadCases() {
      showLoader('Loading cases...');
      try {
        const { data, error } = await supabase
          .from('cases') 
          .select('*')
          .order('id', { ascending: false });

        hideLoader();

        if (error) {
          console.error('Error loading cases:', error);
          caseTbody.innerHTML = `<tr><td colspan="4">Error loading data.</td></tr>`;
          return;
        }

        if (!data || data.length === 0) {
          caseTbody.innerHTML = `<tr><td colspan="4">No cases found.</td></tr>`;
          return;
        }

        caseTbody.innerHTML = '';
        data.forEach(row => {
          const caseName = row.case_name ?? row.CASE_NAME ?? '';
          const area = row.area ?? row.AREA ?? '';
          const status = (row.status ?? row.status ?? 'OPEN');
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${escapeHtml(caseName)}</td><td>${escapeHtml(area)}</td><td>${escapeHtml(status)}</td>
        <td>
          <button class="action-btn view" data-id="${row.id}" data-type="open-case">Open</button>
        </td>`;

          tr.onclick = () => openCaseModal(row);
          const btn = tr.querySelector('button.view');
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openCaseModal(row);
          });
          caseTbody.appendChild(tr);
        });
      } catch (err) {
        hideLoader();
        console.error(err);
        caseTbody.innerHTML = `<tr><td colspan="4">Error loading data.</td></tr>`;
      }
    }


    function openCaseModal(row) {
      currentCase = row;
      originalStatus = (row.STATUS ?? row.status ?? 'OPEN');

      detail_case_name.textContent = row.case_name ?? row.CASE_NAME ?? '';
      detail_area.textContent = row.area ?? row.AREA ?? '';
      detail_employees.textContent = row.employees ?? row.EMPLOYEES ?? '';
      detail_officer.textContent = row.officer ?? row.OFFICER ?? '';


      const docsUrl = row.supporting_docs ?? ''; // Assuming 'supporting_docs' holds the file URL
      const caseName = row.case_name ?? row.CASE_NAME ?? 'Case Document'; // Use case name for link text

      if (docsUrl) {
        detail_file_link.innerHTML = `<a href="${docsUrl}" target="_blank" style="color:#0a84ff; text-decoration:underline;">View ${escapeHtml(caseName)} Documents</a>`;
      } else {
        detail_file_link.textContent = 'No file attached.';
      }


      const cur = String(originalStatus).toUpperCase();
      detail_STATUS.value = ['OPEN', 'NTE', 'AH', 'NTW', 'NTD'].includes(cur) ? cur : 'OPEN';

      saveCaseBtn.style.display = 'none';
      savedMsg.style.opacity = 0;

      caseModal.classList.add('show');
    }


    detail_STATUS.addEventListener('change', () => {
      const newVal = detail_STATUS.value;
      if (!originalStatus) originalStatus = (currentCase?.STATUS ?? currentCase?.status ?? 'OPEN');
      if (String(newVal).toUpperCase() !== String(originalStatus).toUpperCase()) {
        saveCaseBtn.style.display = 'inline-block';
      } else {
        saveCaseBtn.style.display = 'none';
      }
    });

    saveCaseBtn.addEventListener('click', async () => {
      if (!currentCase) return;

      const newStatus = detail_STATUS.value;

      showLoader('Saving status...');

      try {
        const { error } = await supabase
          .from('cases')
          .update({ status: newStatus })
          .eq('id', currentCase.id);

        hideLoader();

        if (error) {
          console.error(error);
          alert('Failed to update status.');
          return;
        }

   
        savedMsg.style.opacity = 1;
        saveCaseBtn.style.display = 'none';
        originalStatus = newStatus;

   
        loadCases();

      } catch (err) {
        hideLoader();
        console.error(err);
        alert('Unexpected error, check console.');
      }
    });


    closeCaseModal.addEventListener('click', () => {
      caseModal.classList.remove('show');
      currentCase = null;
      originalStatus = null;
    });
    cancelCaseBtn.addEventListener('click', () => {
      caseModal.classList.remove('show');
      currentCase = null;
      originalStatus = null;
    });

    caseForm.onsubmit = async (e) => {
      e.preventDefault();
      const newCase = {
        case_name: document.getElementById('case_name').value,
        area: document.getElementById('case_area').value,
        employees: document.getElementById('case_employees').value,
        officer: document.getElementById('case_officer').value,
        STATUS: 'OPEN'
      };

      try {
        showLoader('Adding case...');
        const { error } = await supabase.from('cases').insert([newCase]);
        hideLoader();
        if (error) {
          console.error('Insert error:', error);
          alert('Error adding case: ' + error.message);
          return;
        }
        caseForm.reset();
        await loadCases();
        // auto-switch to case tab to show result
        document.querySelector('.tab-btn[data-tab="caseTab"]').click();
      } catch (err) {
        hideLoader();
        console.error(err);
        alert('Error adding case. Check console.');
      }
    };

  
    const dbTbody = document.getElementById('dbTbody');
    const empSearch = document.getElementById('empSearch');
    const empModal = document.getElementById('empModal');
    const closeEmpModal = document.getElementById('closeEmpModal');
    const closeEmpBtn = document.getElementById('closeEmpBtn');

    const empPhoto = document.getElementById('empPhoto');
    const emp_name_english = document.getElementById('emp_name_english');
    const emp_name_chinese = document.getElementById('emp_name_chinese');
    const emp_position = document.getElementById('emp_position');
    const emp_sex = document.getElementById('emp_sex');
    const emp_blood_type = document.getElementById('emp_blood_type');
    const emp_dob = document.getElementById('emp_dob');
    const emp_height = null; // not shown in simplified modal but kept in data
    const emp_weight = null;
    const emp_id_card = document.getElementById('emp_id_card');
    const emp_email = document.getElementById('emp_email');
    const emp_mobile = document.getElementById('emp_mobile');

    async function loadEmployees() {
      showLoader('Loading employees...');
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('id', { ascending: false });

        hideLoader();

        if (error) {
          console.error('Error loading employees:', error);
          dbTbody.innerHTML = `<tr><td colspan="4">Error loading data.</td></tr>`;
          employeesCache = [];
          return;
        }

        if (!data || data.length === 0) {
          dbTbody.innerHTML = `<tr><td colspan="4">No employees found.</td></tr>`;
          employeesCache = [];
          return;
        }

        employeesCache = data;
        renderEmployeeRows(data);
      } catch (err) {
        hideLoader();
        console.error(err);
        dbTbody.innerHTML = `<tr><td colspan="4">Error loading data.</td></tr>`;
      }
    }

    function renderEmployeeRows(list) {
      dbTbody.innerHTML = '';
      list.forEach(row => {
        const name = row.name_english ?? '';
        const position = row.position ?? '';
        const email = row.email ?? '';
        const mobile = row.mobile ?? '';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${escapeHtml(position)}</td><td>${escapeHtml(email)}</td><td>${escapeHtml(mobile)}</td>`;
        tr.onclick = () => openEmpModal(row);
        dbTbody.appendChild(tr);
      });
    }

    empSearch.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      if (!q) {
        renderEmployeeRows(employeesCache);
        return;
      }
      const filtered = employeesCache.filter(r => {
        return (String(r.name_english || '') + ' ' + String(r.position || '') + ' ' + String(r.email || '') + ' ' + String(r.mobile || '')).toLowerCase().includes(q);
      });
      renderEmployeeRows(filtered);
    });

    function openEmpModal(row) {
      const photo = row.photo_url ?? row.photo ?? '';
      empPhoto.src = photo || 'https://via.placeholder.com/300x300?text=No+Photo';
      empPhoto.alt = (row.name_english || 'Employee');

      emp_name_english.textContent = row.name_english ?? '';
      emp_name_chinese.textContent = row.name_chinese ?? '';
      emp_position.textContent = row.position ?? '';
      emp_sex.textContent = row.sex ?? '';
      emp_blood_type.textContent = row.blood_type ?? '';
      emp_dob.textContent = row.dob ? new Date(row.dob).toLocaleDateString() : '';
      emp_id_card.textContent = row.id_card ?? '';
      emp_email.textContent = row.email ?? '';
      emp_mobile.textContent = row.mobile ?? '';

      empModal.classList.add('show');
    }

    closeEmpModal.addEventListener('click', closeEmp);
    closeEmpBtn.addEventListener('click', closeEmp);
    function closeEmp() {
      empModal.classList.remove('show');
    }


    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function showLoader(txt = 'Loading...') {
      loaderTxt.textContent = txt;
      loader.classList.add('active');
    }

    function hideLoader() {
      loader.classList.remove('active');
    }

    (async function init() {
      try {

        await fetchIRs();
        await loadCases();
        await loadEmployees();
      } catch (err) {
        console.error('Init error', err);
      }
    })();