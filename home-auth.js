
// G-Operations homepage authentication
const gopsDB = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const byId = (id) => document.getElementById(id);

function showMessage(message) {
  byId("accountMessage").textContent = message;
}

function hideDashboards() {
  byId("customerDashboard").hidden = true;
  byId("adminDashboard").hidden = true;
}

async function getCurrentRole(user) {
  const { data, error } = await gopsDB
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.role || "customer";
}

async function showDashboard(user, expectedRole) {
  try {
    const role = await getCurrentRole(user);

    if (expectedRole === "admin" && role !== "admin") {
      hideDashboards();
      showMessage("Access denied. This account is not an administrator.");
      await gopsDB.auth.signOut();
      return;
    }

    if (expectedRole === "customer" && role === "admin") {
      hideDashboards();
      showMessage("This is an admin account. Please use Admin Login.");
      await gopsDB.auth.signOut();
      return;
    }

    hideDashboards();

    if (role === "admin") {
      byId("adminDashboard").hidden = false;
      byId("adminWelcome").textContent = "Welcome, " + user.email;
      await loadAdminRequests();
    } else {
      byId("customerDashboard").hidden = false;
      byId("customerWelcome").textContent = "Welcome, " + user.email;
      await loadCustomerRequests(user);
    }

    showMessage("You are signed in successfully.");
  } catch (error) {
    showMessage("Could not verify account: " + error.message);
  }
}

// Customer registration
byId("customerRegister").addEventListener("click", async () => {
  const name = byId("customerName").value.trim();
  const email = byId("customerEmail").value.trim();
  const password = byId("customerPassword").value;

  if (!name || !email || password.length < 8) {
    showMessage("Enter your name, email and a password of at least 8 characters.");
    return;
  }

  showMessage("Creating your account...");

  const { data, error } = await gopsDB.auth.signUp({
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
    await showDashboard(data.user, "customer");
  } else {
    showMessage("Account created. Check your email for the confirmation link before logging in.");
  }
});

// Customer login
byId("customerLogin").addEventListener("click", async () => {
  const email = byId("customerEmail").value.trim();
  const password = byId("customerPassword").value;

  showMessage("Signing in...");

  const { data, error } = await gopsDB.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  await showDashboard(data.user, "customer");
});

// Admin login
byId("adminLogin").addEventListener("click", async () => {
  const email = byId("adminEmail").value.trim();
  const password = byId("adminPassword").value;

  showMessage("Verifying administrator account...");

  const { data, error } = await gopsDB.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  await showDashboard(data.user, "admin");
});

// Submit a customer request
byId("submitCustomerRequest").addEventListener("click", async () => {
  const { data: { user } } = await gopsDB.auth.getUser();

  if (!user) {
    showMessage("Please log in again.");
    return;
  }

  const service = byId("requestService").value.trim();
  const description = byId("requestDescription").value.trim();

  if (!service) {
    showMessage("Please enter a service type.");
    return;
  }

  const { error } = await gopsDB
    .from("customer_requests")
    .insert({
      user_id: user.id,
      service_type: service,
      description: description
    });

  if (error) {
    showMessage("Request failed: " + error.message);
    return;
  }

  byId("requestService").value = "";
  byId("requestDescription").value = "";

  showMessage("Your service request was submitted.");
  await loadCustomerRequests(user);
});

// Load customer's own requests
async function loadCustomerRequests(user) {
  const box = byId("customerRequests");
  box.replaceChildren();

  const { data, error } = await gopsDB
    .from("customer_requests")
    .select("id, service_type, description, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    box.textContent = error.message;
    return;
  }

  if (!data.length) {
    box.textContent = "No requests submitted yet.";
    return;
  }

  data.forEach(request => {
    const item = document.createElement("article");
    const title = document.createElement("h3");
    const details = document.createElement("p");
    const status = document.createElement("p");

    title.textContent = request.service_type;
    details.textContent = request.description || "No description";
    status.textContent = "Status: " + request.status;

    item.append(title, details, status);
    box.appendChild(item);
  });
}

// Load all requests for administrator
async function loadAdminRequests() {
  const box = byId("adminRequests");
  box.replaceChildren();

  const { data, error } = await gopsDB
    .from("customer_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    box.textContent = "Unable to load requests: " + error.message;
    return;
  }

  if (!data.length) {
    box.textContent = "No customer requests yet.";
    return;
  }

  data.forEach(request => {
    const item = document.createElement("article");
    const title = document.createElement("h3");
    const details = document.createElement("p");
    const customer = document.createElement("p");
    const status = document.createElement("select");
    const update = document.createElement("button");

    title.textContent = request.service_type;
    details.textContent = request.description || "No description";
    customer.textContent = "Customer ID: " + request.user_id;

    ["Pending", "In Progress", "Completed", "Cancelled"].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      status.appendChild(option);
    });

    status.value = request.status;
    update.textContent = "Update Status";

    update.addEventListener("click", async () => {
      update.disabled = true;

      const { error } = await gopsDB
        .from("customer_requests")
        .update({ status: status.value })
        .eq("id", request.id);

      update.disabled = false;

      if (error) {
        showMessage("Update failed: " + error.message);
      } else {
        showMessage("Request status updated.");
        await loadAdminRequests();
      }
    });

    item.append(title, details, customer, status, update);
    box.appendChild(item);
  });
}

// Refresh admin requests
byId("refreshAdminRequests").addEventListener("click", loadAdminRequests);

// Customer logout
byId("customerLogout").addEventListener("click", async () => {
  await gopsDB.auth.signOut();
  hideDashboards();
  showMessage("You have logged out.");
});

// Admin logout
byId("adminLogout").addEventListener("click", async () => {
  await gopsDB.auth.signOut();
  hideDashboards();
  showMessage("You have logged out.");
});

// Restore existing login session
async function restoreLogin() {
  const { data, error } = await gopsDB.auth.getSession();

  if (error) {
    showMessage(error.message);
    return;
  }

  if (data.session) {
    await showDashboard(data.session.user, "any");
  }
}

restoreLogin();
