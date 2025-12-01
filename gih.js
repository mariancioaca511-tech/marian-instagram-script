#!/usr/bin/env node
const readlineSync = require('readline-sync');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { IgApiClient, RealtimeClient } = require('nodejs-insta-private-api');

(async () => {
  console.clear();
  console.log(chalk.red(`
╔═════════════════════════════════════════════╗
║       Gyovanny Instagram Spam Script        ║
╚═════════════════════════════════════════════╝
  `));

  const ig = new IgApiClient();
  let sessionExists = fs.existsSync('session.json');
  let useSession = false;

  if (sessionExists) {
    const ans = readlineSync.question('📂 Found saved session. Use it? (y/n): ');
    useSession = ans.toLowerCase() === 'y';
  }

  if (useSession) {
    const sessionData = JSON.parse(fs.readFileSync('session.json', 'utf8'));
    await ig.state.deserialize(sessionData);
    console.log(chalk.green('✅ Session loaded!\n'));
  } else {
    const username = readlineSync.question('📧 Enter Instagram username: ');
    const password = readlineSync.question('🔑 Enter Instagram password: ', { hideEchoBack: true });
    
    console.log(chalk.yellow('\n⏳ Logging in...'));
    try {
      await ig.login({ username, password });
    } catch (err) {
      console.log(chalk.red('❌ Login failed:'), err.message);
      process.exit(1);
    }
    fs.writeFileSync('session.json', JSON.stringify(ig.state.serialize(), null, 2));
    console.log(chalk.green('✅ Logged in! Session saved.\n'));
  }

  // Fetch inbox
  console.log(chalk.yellow('📋 Fetching inbox...'));
  let inbox;
  try {
    inbox = await ig.direct.getInbox();
    console.log(chalk.green(`✅ Found ${inbox.inbox.threads.length} threads\n`));
  } catch (err) {
    console.log(chalk.red('❌ Failed to fetch inbox:'), err.message);
    process.exit(1);
  }

  // List threads
  inbox.inbox.threads.forEach((thread, idx) => {
    console.log(` ${idx + 1}. ${thread.thread_title || 'Group ' + (idx + 1)}`);
  });

  const threadInput = readlineSync.question('\n📍 Select threads to message (comma-separated numbers): ');
  const selectedThreads = threadInput
    .split(',')
    .map(x => parseInt(x.trim()) - 1)
    .map(i => inbox.inbox.threads[i])
    .filter(t => t);

  if (!selectedThreads.length) {
    console.log(chalk.red('❌ No threads selected.'));
    process.exit(0);
  }

  // Load message file
  const filePath = readlineSync.question('\n📄 Enter path to text file: ');
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red('❌ File does not exist.'));
    process.exit(0);
  }
  const messageText = fs.readFileSync(filePath, 'utf8').trim();
  const mode = readlineSync.questionInt('\n📮 Mode: 1=Line by line, 2=Entire text: ');

  const delaySeconds = readlineSync.questionInt('⏱️ Enter delay between messages (seconds): ');
  if (isNaN(delaySeconds) || delaySeconds < 0) {
    console.log(chalk.red('❌ Invalid delay.'));
    process.exit(0);
  }

  // Connect Realtime MQTT
  const realtime = new RealtimeClient(ig);
  let connected = false;

  const connectRealtime = async () => {
    try {
      await realtime.connect({
        graphQlSubs: ['ig_sub_direct', 'ig_sub_direct_v2_message_sync'],
        skywalkerSubs: ['presence_subscribe', 'typing_subscribe'],
        irisData: inbox
      });
      connected = true;
      console.log(chalk.green('\n✅ Connected to MQTT realtime!\n'));
    } catch (err) {
      connected = false;
      console.log(chalk.red('❌ MQTT connection failed. Retrying in 5s...'));
      setTimeout(connectRealtime, 5000);
    }
  };

  realtime.on('disconnected', () => {
    connected = false;
    console.log(chalk.yellow('⚠️  Disconnected. Reconnecting...'));
    connectRealtime();
  });

  realtime.on('error', (err) => {
    console.log(chalk.red('❌ MQTT error:'), err.message);
  });

  // Listen for all incoming messages
  realtime.on('message', (data) => {
    const msg = data.message;
    if (!msg?.text) return;

    console.log(chalk.blue('\n───────────────────────────────'));
    console.log(`📨 MESSAGE from ${msg.from_user_id} (Thread ${msg.thread_id}):`);
    console.log(msg.text);
    console.log(chalk.blue('───────────────────────────────\n'));
  });

  await connectRealtime();

  // Sending messages infinite loop
  console.log(chalk.green('🚀 Starting message loop. Press Ctrl+C to stop.\n'));
  let round = 0;
  let totalSent = 0;

  if (mode === 1) {
    const lines = messageText.split('\n').filter(l => l.trim().length > 0);
    while (true) {
      round++;
      console.log(chalk.yellow(`\n🔄 ROUND #${round}`));

      for (const line of lines) {
        for (const thread of selectedThreads) {
          if (!connected) {
            console.log(chalk.red('⚠️  Not connected. Waiting to reconnect...'));
            while (!connected) await new Promise(r => setTimeout(r, 1000));
          }
          try {
            await realtime.directCommands.sendTextViaRealtime(thread.thread_id, line);
            totalSent++;
            console.log(chalk.green(`✅ Sent to ${thread.thread_title || thread.thread_id}`));
          } catch (err) {
            console.log(chalk.red(`❌ Failed: ${err.message}`));
          }

          if (delaySeconds > 0) await new Promise(r => setTimeout(r, delaySeconds * 1000));
        }
      }
      console.log(chalk.cyan(`📊 Total messages sent: ${totalSent}`));
    }
  } else {
    while (true) {
      round++;
      console.log(chalk.yellow(`\n🔄 ROUND #${round}`));

      for (const thread of selectedThreads) {
        if (!connected) {
          console.log(chalk.red('⚠️  Not connected. Waiting to reconnect...'));
          while (!connected) await new Promise(r => setTimeout(r, 1000));
        }

        try {
          await realtime.directCommands.sendTextViaRealtime(thread.thread_id, messageText);
          totalSent++;
          console.log(chalk.green(`✅ Sent to ${thread.thread_title || thread.thread_id}`));
        } catch (err) {
          console.log(chalk.red(`❌ Failed: ${err.message}`));
        }

        if (delaySeconds > 0) await new Promise(r => setTimeout(r, delaySeconds * 1000));
      }
      console.log(chalk.cyan(`📊 Total messages sent: ${totalSent}`));
    }
  }

})();
