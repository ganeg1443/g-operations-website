
const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const auth = document.getElementById("auth");
const dashboard = document.getElementById("dashboard");
const message = document.getElementById("message");

function showMessage(text) {
  message.textContent = text;
}

async function loadDashboard(user) {
  auth.classList.add("hidden");
  dashboard.classList.remove("hidden");

  document.getElementById("welcome").textContent =
    "Welcome, " + (user.user_metadata.full_name || user.email);

  await loadRequests(user);
}

async function loadRequests(user) {
  const list = document.getElementById("requests");
  list.textContent = "Loading requests...";

  const { data, error } = await db
    .from("customer_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

if (error) {
  list.textContent = "Database error: " + error.message;
  return;
}
  }

  list.replaceChildren();

  if (!data.length) {
    list.textContent = "No service requests yet.";
    return;
  }

  data.forEach(request => {
    const item = document.createElement("p");
    item.textContent =
      request.service_type + " — " + request.status;
    list.appendChild(item);
  });
}

// Customer registration
document.getElementById("register").onclick = async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!name || !email || password.length < 8) {
    showMessage("Enter your name, email and a password of at least 8 characters.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }
    }
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (data.session) {
    showMessage("Account created successfully!");
  } else {
    showMessage("Check your email to confirm your account, then log in.");
  }
};

// Customer login
document.getElementById("login").onclick = async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  await loadDashboard(data.user);
  showMessage("Login successful.");
};

// Submit service request
document.getElementById("submitRequest").onclick = async () => {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    showMessage("Please log in again.");
    return;
  }

  const service = document.getElementById("service").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!service) {
    showMessage("Please enter a service type.");
    return;
  }

  const { error } = await db
    .from("customer_requests")
    .insert({
      user_id: user.id,
      service_type: service,
      description: description
    });

  if (error) {
    showMessage(error.message);
    return;
  }

  document.getElementById("service").value = "";
  document.getElementById("description").value = "";

  showMessage("Service request submitted!");
  await loadRequests(user);
};

// Logout
document.getElementById("logout").onclick = async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    showMessage(error.message);
    return;
  }

  dashboard.classList.add("hidden");
  auth.classList.remove("hidden");
  showMessage("You have logged out.");
};

// Restore existing login session
async function startPortal() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    showMessage(error.message);
    return;
  }

  if (data.session) {
    await loadDashboard(data.session.user);
  }
}

startPortal();
