// Initialize Supabase
const supabaseUrl = 'https://iyajshacnjxxlatubjem.supabase.co';
const supabaseKey = 'sb_publishable_dKpEaC2dn1L3CSj1lC5ZdQ_jtBCs9uE';

// Create client using the global 'supabase' library, then overwrite it with the client instance
window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Auth Helpers
async function signIn(email, password) {
    const { data, error } = await window.supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    return { data, error };
}

async function signOut() {
    const { error } = await window.supabase.auth.signOut();
    return { error };
}

async function getSession() {
    const { data, error } = await window.supabase.auth.getSession();
    return data.session;
}
