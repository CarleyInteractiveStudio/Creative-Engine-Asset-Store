document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'TU_SUPABASE_URL';
    const supabaseKey = 'TU_SUPABASE_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    const productListDiv = document.getElementById('product-list');
    if (!productListDiv) return; // Only run on dashboard page

    async function loadDashboardData() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // --- Load Payout History ---
        const payoutHistoryList = document.getElementById('payout-history-list');
        const { data: payouts, error: payoutError } = await supabaseClient
            .from('payouts')
            .select('*')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false });

        if (payoutError) {
            payoutHistoryList.innerHTML = '<p class="error">Could not load payout history.</p>';
        } else if (payouts.length === 0) {
            payoutHistoryList.innerHTML = '<p>You have not received any payouts yet.</p>';
        } else {
            let historyHTML = '<ul>';
            for (const payout of payouts) {
                historyHTML += `<li>${new Date(payout.created_at).toLocaleDateString()}: <strong>$${payout.amount.toFixed(2)}</strong> - Status: ${payout.status}</li>`;
            }
            historyHTML += '</ul>';
            payoutHistoryList.innerHTML = historyHTML;
        }

        // --- Load Earnings Summary (Simulated) ---
        const earningsDiv = document.getElementById('earnings-data');
        const simulatedSales = [ { price: 10.00 }, { price: 25.00 }, { price: 5.00 }, { price: 12.00 } ];
        const totalRevenue = simulatedSales.reduce((sum, sale) => sum + sale.price, 0);
        let commissionRate = 0.10;
        if (totalRevenue > 500) commissionRate = 0.20;
        else if (totalRevenue > 100) commissionRate = 0.15;
        const commissionAmount = totalRevenue * commissionRate;
        const netPayout = totalRevenue - commissionAmount;

        earningsDiv.innerHTML = `
            <div class="earning-item">Total Revenue: <strong>$${totalRevenue.toFixed(2)}</strong></div>
            <div class="earning-item">Store Commission (${commissionRate * 100}%): <strong>-$${commissionAmount.toFixed(2)}</strong></div>
            <div class="earning-item">Estimated Net Payout: <strong>$${netPayout.toFixed(2)}</strong></div>
            <div class="earning-item">Next Payout Day: <strong>End of month</strong></div>
        `;

        // --- Load Product List ---
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            productListDiv.innerHTML = '<p class="error">Could not load your products.</p>';
            return;
        }
        if (products.length === 0) {
            productListDiv.innerHTML = '<p>You have not uploaded any products yet.</p>';
            return;
        }
        let productHTML = '<ul>';
        for (const product of products) {
            productHTML += `<li>${product.name} - <strong>Status:</strong> ${product.status}</li>`;
        }
        productHTML += '</ul>';
        productListDiv.innerHTML = productHTML;
    }

    loadDashboardData();
});
