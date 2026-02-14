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

// Database Helpers
async function getTransactions() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await window.supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data;
}

async function addTransaction(transaction) {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return { error: 'User not logged in' };

    const { data, error } = await window.supabase
        .from('transactions')
        .insert([{
            ...transaction,
            user_id: user.id
        }])
        .select();

    return { data, error };
}

async function getBalance() {
    const transactions = await getTransactions();
    let balance = 0;
    let income = 0;
    let expense = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') {
            balance += parseFloat(tx.amount);
            income += parseFloat(tx.amount);
        } else if (tx.type === 'expense') {
            balance -= parseFloat(tx.amount);
            expense += parseFloat(tx.amount);
        }
        // Transfers might not affect "Net Width" but affect "Cash in Hand" - keeping simple for now
    });

    return { balance, income, expense, transactions };
}
