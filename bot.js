#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs');
const chalk = require('chalk');
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  try {
 console.log(chalk.red.bold('\n╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.red.bold('║                                                           ║'));
    console.log(chalk.red.bold('║               🤖 Marian x Bogdan spammer 🤖              ║'));
    console.log(chalk.red.bold('║                                                           ║'));
    console.log(chalk.red.bold('║         Instagram Bulk DM Sender - MQTT v5.57.9          ║'));
    console.log(chalk.red.bold('║              Infinite Loop Mode - Continuous             ║'));
    console.log(chalk.red.bold('║                                                           ║'));
    console.log(chalk.red.bold('╚═══════════════════════════════════════════════════════════╝\n'));

  let ig = new IgApiClient();
    let isLoggedIn = false;

    console.log(chalk.cyan('🔐 Instagram Authentication:\n'));
    const username = await question(chalk.yellow('📧 Username: '));
    
    ig.state.generateDevice(username);

    ig.request.end$.subscribe(async () => {
      const serialized = await ig.state.serialize();
      delete serialized.constants;
      fs.writeFileSync('./session.json', JSON.stringify(serialized));
    });

    if (fs.existsSync('./session.json')) {
      console.log(chalk.yellow('🔄 Se încarcă sesiunea existentă din fișier...'));
      try {
let ig = new IgApiClient();
    let isLoggedIn = false;

    console.log(chalk.cyan('🔐 Instagram Authentication:\n'));
    const username = await question(chalk.yellow('📧 Username: '));
    
    ig.state.generateDevice(username);

    ig.request.end$.subscribe(async () => {
      const serialized = await ig.state.serialize();
      delete serialized.constants;
      fs.writeFileSync('./session.json', JSON.stringify(serialized));
    });

    if (fs.existsSync('./session.json')) {
      console.log(chalk.yellow('🔄 Se încarcă sesiunea existentă din fișier...'));
      try {
        const sessionData = JSON.parse(fs.readFileSync('./session.json', 'utf8'));
        await ig.state.deserialize(sessionData);
        await ig.account.currentUser();
        console.log(chalk.green('✅ Logat cu succes prin sesiune salvată (fără parolă)!\n'));
        isLoggedIn = true;
      } catch (err) {
        console.log(chalk.red('❌ Sesiunea a expirat sau este invalidă. Se trece la logarea cu parolă.'));
      }
    }

    if (!isLoggedIn) {
      const password = await question(chalk.yellow('🔑 Password: '));
      const email = await question(chalk.yellow('📨 Email (press Enter to skip): '));

      console.log(chalk.cyan('\n⏳ Authenticating...'));
      try {
        await ig.account.login({
          username: username,
          password: password,
          email: email || undefined
        });
        console.log(chalk.green('✅ Logged in cu succes! Sesiunea a fost salvată.\n'));
      } catch (err) {
        console.error(chalk.red('❌ Login failed:', err.message));
        process.exit(1);
      }
    }
      
    console.log(chalk.green('✅ Logged in!\n'));

    console.log(chalk.cyan('📋 Fetching inbox via MQTT...'));
    const inbox = await ig.direct.getInbox();
    const threads = inbox.inbox.threads;
    
    console.log(chalk.green(`✅ Got ${threads.length} conversations\n`));

    const realtime = new RealtimeClient(ig);
    
    console.log(chalk.cyan('🔌 Connecting to MQTT...'));
    await realtime.connect({
      graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
      skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
      irisData: inbox
    });

    console.log(chalk.green('✅ Connected to MQTT!\n'));

    console.log(chalk.cyan('👂 Listening for incoming messages:\n'));
    let messageCount = 0;

    realtime.on('message', (data) => {
      const msg = data.message;
      if (!msg?.text || msg.text === 'no text') return;

      messageCount++;
      console.log(chalk.yellow(`📨 [#${messageCount}] From ${msg.from_user_id}: ${msg.text.substring(0, 40)}...`));
    });

    console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                     📊 AVAILABLE GROUPS                    ║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════╝\n'));

    threads.forEach((thread, index) => {
      const threadName = thread.thread_title || `Group ${index + 1}`;
      const userCount = thread.users ? thread.users.length : 0;
      console.log(chalk.white(`  ${index + 1}. ${threadName} (${userCount} users)`));
    });

    console.log();

    const selectedInput = await question(chalk.yellow('📍 Enter group numbers (comma-separated, e.g., 1,2,3): '));
    const selectedIndexes = selectedInput
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < threads.length);

    if (selectedIndexes.length === 0) {
      console.log(chalk.red('❌ No valid groups selected'));
      process.exit(1);
    }

    const selectedThreads = selectedIndexes.map(i => threads[i]);
    
    console.log(chalk.green(`\n✅ Selected ${selectedThreads.length} group(s):`));
    selectedThreads.forEach((t, i) => {
      const name = t.thread_title || `Group ${i + 1}`;
      console.log(chalk.white(`  ${i + 1}. ${name}`));
    });
    console.log();

    const textFilePath = await question(chalk.yellow('📄 Enter text file path (e.g., messages.txt): '));
    
    if (!fs.existsSync(textFilePath)) {
      console.error(chalk.red(`❌ File not found: ${textFilePath}`));
      process.exit(1);
    }

    const messageText = fs.readFileSync(textFilePath, 'utf8').trim();
    console.log(chalk.green(`✅ Loaded ${messageText.length} characters from file\n`));

    console.log(chalk.cyan('📮 Select sending mode:\n'));
    console.log(chalk.white('  1. Send line by line (infinite loop)'));
    console.log(chalk.white('  2. Send entire text as one message\n'));
    
    const modeInput = await question(chalk.yellow('Choose option (1 or 2): '));
    const mode = parseInt(modeInput);

    if (![1, 2].includes(mode)) {
      console.error(chalk.red('❌ Invalid option. Choose 1 or 2'));
      process.exit(1);
    }

    const delayInput = await question(chalk.yellow('⏱️  Enter delay between messages (seconds): '));
    const delaySeconds = parseInt(delayInput);

    if (isNaN(delaySeconds) || delaySeconds < 0) {
      console.error(chalk.red('❌ Invalid delay value'));
      process.exit(1);
    }

    console.log(chalk.red.bold('\n╔═══════════════════════════════════════════════════════════╗'));
    console.log(chalk.red.bold('║              🚀 INFINITE LOOP MODE STARTED                 ║'));
    console.log(chalk.red.bold('║                                                            ║'));
    console.log(chalk.red.bold('║  Sending messages continuously...                          ║'));
    console.log(chalk.red.bold('║  Press Ctrl+C to stop                                      ║'));
    console.log(chalk.red.bold('╚═══════════════════════════════════════════════════════════╝\n'));

    let roundCount = 0;
    let totalSent = 0;
    let totalFailed = 0;

    if (mode === 1) {
      // MODE 1: LINE BY LINE INFINITE LOOP
      const lines = messageText.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        console.error(chalk.red('❌ No lines found in file'));
        process.exit(1);
      }

      console.log(chalk.cyan(`Found ${lines.length} lines\n`));

      while (true) {
        roundCount++;
        console.log(chalk.red(`\n${'═'.repeat(60)}`));
        console.log(chalk.red(`🔄 ROUND #${roundCount} - ${new Date().toLocaleTimeString()}`));
        console.log(chalk.red(`${'═'.repeat(60)}\n`));

        let roundSent = 0;
        let roundFailed = 0;

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];

          for (let i = 0; i < selectedThreads.length; i++) {
            const thread = selectedThreads[i];
            const threadName = thread.thread_title || `Group ${i + 1}`;
            
            console.log(chalk.yellow(`📤 [Line ${lineIdx + 1}/${lines.length}][Group ${i + 1}/${selectedThreads.length}] Sending to: ${threadName}`));
            console.log(chalk.white(`   Text: ${line.substring(0, 50)}...`));
            
            try {
              await realtime.directCommands.sendTextViaRealtime(
                thread.thread_id,
                line
              );
              roundSent++;
              totalSent++;
              console.log(chalk.green(`   ✅ Sent!\n`));
            } catch (err) {
              roundFailed++;
              totalFailed++;
              console.log(chalk.red(`   ❌ Failed: ${err.message}\n`));
            }

            if ((lineIdx < lines.length - 1 || i < selectedThreads.length - 1) && delaySeconds > 0) {
              console.log(chalk.cyan(`   ⏳ Waiting ${delaySeconds} second(s)...\n`));
              await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            }
          }
        }

        console.log(chalk.red(`\n📊 Round Summary:`));
        console.log(chalk.white(`  ✅ Sent this round: ${roundSent}`));
        console.log(chalk.white(`  ❌ Failed this round: ${roundFailed}`));
        console.log(chalk.white(`  📈 Total sent overall: ${totalSent}`));
        console.log(chalk.white(`  📈 Total failed overall: ${totalFailed}`));

        console.log(chalk.cyan(`\n⏳ Waiting ${delaySeconds} second(s) before next round...\n`));
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }

    } else {
      // MODE 2: ENTIRE TEXT AS ONE MESSAGE INFINITE LOOP
      while (true) {
        roundCount++;
        console.log(chalk.red(`\n${'═'.repeat(60)}`));
        console.log(chalk.red(`🔄 ROUND #${roundCount} - ${new Date().toLocaleTimeString()}`));
        console.log(chalk.red(`${'═'.repeat(60)}\n`));

        let roundSent = 0;
        let roundFailed = 0;

        for (let i = 0; i < selectedThreads.length; i++) {
          const thread = selectedThreads[i];
          const threadName = thread.thread_title || `Group ${i + 1}`;
          
          console.log(chalk.yellow(`📤 [${i + 1}/${selectedThreads.length}] Sending to: ${threadName}`));
          console.log(chalk.white(`   Text: ${messageText.substring(0, 50)}...`));
          
          try {
            await realtime.directCommands.sendTextViaRealtime(
              thread.thread_id,
              messageText
            );
            roundSent++;
            totalSent++;
            console.log(chalk.green(`   ✅ Sent!\n`));
          } catch (err) {
            roundFailed++;
            totalFailed++;
            console.log(chalk.red(`   ❌ Failed: ${err.message}\n`));
          }

          if (i < selectedThreads.length - 1 && delaySeconds > 0) {
            console.log(chalk.cyan(`   ⏳ Waiting ${delaySeconds} second(s)...\n`));
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          }
        }

        console.log(chalk.red(`\n📊 Round Summary:`));
        console.log(chalk.white(`  ✅ Sent this round: ${roundSent}`));
        console.log(chalk.white(`  ❌ Failed this round: ${roundFailed}`));
        console.log(chalk.white(`  📈 Total sent overall: ${totalSent}`));
        console.log(chalk.white(`  📈 Total failed overall: ${totalFailed}`));

        console.log(chalk.cyan(`\n⏳ Waiting ${delaySeconds} second(s) before next round...\n`));
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error:', error.message));
    process.exit(1);
  }
})();
