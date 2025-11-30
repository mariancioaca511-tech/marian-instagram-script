const readline = require('readline');
const fs = require('fs');
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

// =======================
// PASSWORD INVISIBLE FUNCTION
// =======================
function questionInvisible(query) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    process.stdout.write(query);

    let password = "";

    const onDataHandler = char => {
      char = char + "";

      // ENTER
      if (char === "\r" || char === "\n") {
        process.stdout.write("\n");
        process.stdin.removeListener("data", onDataHandler);
        rl.close();
        return resolve(password);
      }

      // BACKSPACE
      if (char === "\u0008" || char === "\u007F") {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
        return;
      }

      // NORMAL CHAR
      password += char;
    };

    process.stdin.on("data", onDataHandler);
  });
}

// ORIGINAL question()
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

// =====================================================
//               FULL SCRIPT
// =====================================================

(async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║    📱 Instagram MQTT Line Sender v1.0                 ║');
    console.log('║         Send messages line by line via MQTT            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 1. LOGIN
    console.log('🔐 Instagram Account Login:\n');
    const username = await question('📧 Enter your Instagram username: ');

    // 🔥 PASSWORD INVISIBLE INPUT
    const password = await questionInvisible('🔑 Enter your Instagram password: ');

    console.log('\n⏳ Authenticating...');
    
    let ig = new IgApiClient();
    try {
      await ig.login({
        username: username,
        password: password
      });
    } catch (err) {
      console.error('❌ Login failed:', err.message);
      process.exit(1);
    }

    console.log('✅ Logged in successfully!\n');

    // 2. FETCH INBOX
    console.log('📋 Fetching inbox...');
    const inbox = await ig.direct.getInbox();
    const threads = inbox.inbox.threads;
    
    console.log(`✅ Found ${threads.length} groups\n`);

    // 3. SHOW GROUPS
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                   📊 YOUR GROUPS                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    threads.forEach((thread, index) => {
      const name = thread.thread_title || `Group ${index + 1}`;
      const userCount = thread.users ? thread.users.length : 0;
      console.log(`  ${index + 1}. ${name} (${userCount} users)`);
    });

    console.log();

    // 4. SELECT GROUPS
    const selectedInput = await question('📍 Select groups (e.g., 1,2,3): ');
    const selectedIndexes = selectedInput
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < threads.length);

    if (selectedIndexes.length === 0) {
      console.log('❌ No valid groups selected');
      process.exit(1);
    }

    const selectedThreads = selectedIndexes.map(i => threads[i]);
    console.log(`\n✅ Selected ${selectedThreads.length} group(s)\n`);

    // 5. TEXT FILE PATH
    const textFilePath = await question('📄 Enter your text file path: ');
    
    if (!fs.existsSync(textFilePath)) {
      console.error(`❌ File not found: ${textFilePath}`);
      process.exit(1);
    }

    const messageText = fs.readFileSync(textFilePath, 'utf8').trim();
    console.log(`✅ Loaded text file (${messageText.length} characters)\n`);

    // 6. DELAY
    const delayInput = await question('⏱️  Enter delay between lines (seconds): ');
    const delaySeconds = parseInt(delayInput);

    if (isNaN(delaySeconds) || delaySeconds < 0) {
      console.error('❌ Invalid delay');
      process.exit(1);
    }

    rl.close();

    // 7. CONNECT TO MQTT
    console.log('\n🔌 Connecting to MQTT...');
    
    const realtime = new RealtimeClient(ig);
    
    try {
      await realtime.connect({
        graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
        skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
        irisData: inbox
      });
    } catch (err) {
      console.error('❌ MQTT connection failed:', err.message);
      process.exit(1);
    }

    console.log('✅ Connected to MQTT!\n');

    // 8. LISTEN FOR MESSAGES
    let incomingCount = 0;
    realtime.on('message', (data) => {
      try {
        const msg = data.message;
        if (!msg?.text || msg.text === 'no text') return;
        incomingCount++;
        console.log(`📨 [${incomingCount}] From ${msg.from_user_id}: ${msg.text.substring(0, 40)}...`);
      } catch (e) {}
    });

    // 9. SEND MESSAGES LINE BY LINE
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           🚀 SENDING MESSAGES LINE BY LINE              ║');
    console.log('║                                                         ║');
    console.log('║  Press Ctrl+C to stop                                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const lines = messageText.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      console.error('❌ No lines in file');
      process.exit(1);
    }

    console.log(`📝 Found ${lines.length} lines\n`);

    let roundCount = 0;
    let totalSent = 0;
    let totalFailed = 0;

    while (true) {
      roundCount++;
      console.log(`\n${'═'.repeat(56)}`);
      console.log(`🔄 ROUND #${roundCount} - ${new Date().toLocaleTimeString()}`);
      console.log(`${'═'.repeat(56)}\n`);

      let roundSent = 0;
      let roundFailed = 0;

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];

        for (let i = 0; i < selectedThreads.length; i++) {
          const thread = selectedThreads[i];
          const threadName = thread.thread_title || `Group ${i + 1}`;
          
          console.log(`📤 [Line ${lineIdx + 1}/${lines.length}][Group ${i + 1}/${selectedThreads.length}] ${threadName}`);
          console.log(`   Text: ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`);
          
          try {
            await realtime.directCommands.sendTextViaRealtime(
              thread.thread_id,
              line
            );
            roundSent++;
            totalSent++;
            console.log(`   ✅ Sent via MQTT!\n`);
          } catch (err) {
            roundFailed++;
            totalFailed++;
            console.log(`   ❌ Failed: ${err.message}\n`);
          }

          if ((lineIdx < lines.length - 1 || i < selectedThreads.length - 1) && delaySeconds > 0) {
            console.log(`   ⏳ Waiting ${delaySeconds}s...\n`);
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          }
        }
      }

      console.log(`📊 Round Summary:`);
      console.log(`  ✅ Sent: ${roundSent}`);
      console.log(`  ❌ Failed: ${roundFailed}`);
      console.log(`  📈 Total: ${totalSent} sent | ${totalFailed} failed`);
      console.log(`\n⏳ Waiting ${delaySeconds}s before next round...\n`);
      
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
