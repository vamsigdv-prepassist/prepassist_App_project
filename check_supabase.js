const SUPABASE_URL = "https://pjubvuvqzwhvqxeeubcv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdWJ2dXZxendodnF4ZWV1YmN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0NTQ2NiwiZXhwIjoyMDgzNzIxNDY2fQ.xwy9_h8bLPWGUZ1zie8TvQ8vy1fJiBEB2NQAlY66EUU";

async function checkSupabaseUsers() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Error fetching users:", res.status, err);
      return;
    }

    const data = await res.json();
    console.log(`Total Supabase Users: ${data.users.length}`);
    data.users.forEach(u => {
      console.log(`- ${u.email} (Created: ${new Date(u.created_at).toLocaleDateString()})`);
    });
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

checkSupabaseUsers();
