const readline = require('readline');
const { IgApiClient } = require('nodejs-insta-private-api');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function startBot() {
    const ig = new IgApiClient();
    
    try {
        console.log("=== Marian x Bogdan Spammer ===");
        
        const username = await askQuestion('Username: ');
        const password = await askQuestion('Parola: ');

        // Generare dispozitiv automat
        ig.state.generateDevice(username);
        
        console.log("Autentificare în curs...");
        await ig.account.login(username, password);
        console.log("✅ Logare reușită!");

        // Inițializare Realtime Client
        const realtime = new ig.realtime.constructor(ig);
        
        realtime.on('message', (data) => {
            console.log(`Mesaj primit: ${data.message.text}`);
        });

        await realtime.connect({
            graphQlSubs: ['ig_sub_direct'],
            irisData: null
        });

        console.log("✅ Conectat la Instagram!");

    } catch (error) {
        console.error("❌ Eroare:", error.message);
    } finally {
        rl.close();
    }
}

startBot().catch(console.error);
