

document.addEventListener("DOMContentLoaded", () => {
    const SUPABASE_URL = "https://hzafznqoyinfjbqrrerp.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YWZ6bnFveWluZmpicXJyZXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDYzMzcsImV4cCI6MjA3NjA4MjMzN30.qQFFQ6fzqBXxl63JG4JWNZ0JR0ZVnoyiU65J4VlDNG8";
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const loginForm = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const overlay = document.getElementById("loadingOverlay");

    const DASHBOARDS = {
        admin: "admin-dashboard.html",
        sales: "sales-dashboard.html",
        er: "er-dashboard.html",
        ops: "ops-dashboard.html",
        fieldmagn: "field-dashboard-magn.html",
        fieldmags: "field-dashboard-mags.html",
        fieldlds: "field-dashboard-lds.html",
        fieldldn: "field-dashboard-ldn.html",
        fieldcot: "field-dashboard-cot.html",
    };

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        overlay.classList.add("active");
        errorMsg.classList.remove("show");

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
            overlay.classList.remove("active");
            errorMsg.textContent = "Please enter both username and password.";
            errorMsg.classList.add("show");
            return;
        }
        document.addEventListener('contextmenu', event => event.preventDefault());
        try {
            const { data: user, error } = await client
                .from("users")
                .select("*")
                .eq("username", username)
                .single();

            if (error || !user) throw new Error("Invalid login credentials.");
            if (user.password !== password) throw new Error("Invalid login credentials.");

            const target = DASHBOARDS[user.role];
            if (!target) throw new Error("Dashboard for this role is not configured.");

            sessionStorage.setItem("loggedIn", "true");
            sessionStorage.setItem("role", user.role);

            window.location.href = target;

        } catch (err) {
            overlay.classList.remove("active");
            errorMsg.textContent = err.message;
            errorMsg.classList.add("show");
        }
    });
});
