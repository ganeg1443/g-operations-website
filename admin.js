
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const message = document.getElementById("message");
const requestsBox = document.getElementById("requests");

async function checkAdmin() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) return;

  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data || data.role !== "admin") {
    message.textContent = "Access denied. Admin account required.";
    return;
  }

  loginSection.hidden = true;
  dashboard.hidden = false;
  document.getElementById("welcome").textContent =
    "Welcome, " + user.email;

  loadRequests();
}

async function loadRequests() {
  requestsBox.textContent = "Loading...";

  const { data, error } = await db
    .from("customer_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    requestsBox.textContent = "Could not load requests: " + error.message;
    return;
  }

  if (!data.length) {
    requestsBox.textContent = "No customer requests yet.";
    return;
  }

  requestsBox.replaceChildren();

  data.forEach(request => {
    const card = document.createElement("article");
    const heading = document.createElement("h3");
    heading.textContent = request.service_type;

    const description = document.createElement("p");
    description.textContent = request.description || "No description";

    const status = document.createElement("p");
    status.textContent = "Status: " + request.status;

    const select = document.createElement("select");
    ["Pending", "In Progress", "Completed", "Cancelled"].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = request.status;

    const save = document.createElement("button");
    save.textContent = "Update Status";
    save.addEventListener("click", async () => {
      save.disabled = true;

      const { error } = await db
        .from("customer_requests")
        .update({ status: select.value })
        .eq("id", request.id);

      save.disabled = false;

      if (error) {
        alert("Update failed: " + error.message);
      } else {
        alert("Request status updated.");
        loadRequests();
      }
    });

    card.append(heading, description, status, select, save);
    requestsBox.appendChild(card);
  });
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  message.textContent = "Signing in...";

  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  await checkAdmin();
});

document.getElementById("refreshBtn").addEventListener("click", loadRequests);

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  dashboard.hidden = true;
  loginSection.hidden = false;
  message.textContent = "Logged out.";
});

checkAdmin();
