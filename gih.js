// ==========================================================
// 🔴 GYOVANNY WHATSAPP SCRIPT (INSTAGRAM MQTT SPAM BOT)
// ==========================================================

const fs = require("fs");
const chalk = require("chalk");
const readline = require("readline");
const readlineSync = require("readline-sync");

const { IgApiClient, RealtimeClient } = require("nodejs-insta-private-api");

// ---------- PASSWORD INPUT INVISIBLE ----------
function questionHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    process.stdout.write(query);

    let password = "";
    process.stdin.on("data", (char) => {
      char = char + "";
      switch (char) {
        case "\n":
        case "\r":
        case "\u0004":
          process.stdout.write("\n");
          process.stdin.removeAllListeners("data");
          rl.close();
          resolve(password);
          break;
        default:
          process.stdout.write("*");
          password += char;
          break;
      }
    });
  });
}

// ---------- BANNER ----------
console.log(
  chalk.red(`
██████  ██    ██  ██████  ██    ██  █████  ███    ██ ███    ██ ██    ██
██   ██  ██  ██  ██    ██ ██    ██ ██   ██ ████   ██ ████   ██ ██    ██
██████    ████   ██    ██ ██    ██ ███████ ██ ██  ██ ██ ██  ██ ██    ██
██   ██    ██    ██    ██  ██  ██  ██   ██ ██  ██ ██ ██  ██ ██ ██    ██
██   ██    ██     ██████    ████   ██   ██ ██   ████ ██   ████  ██████
              🔴 GYOVANNY INSTAGRAM MQTT BOT 🔴
`)
);

(async () => {
  try {
    // ---------- LOGIN ----------
    const ig = new IgApiClient();
    const realtime = new RealtimeClient(ig);

    const username = readlineSync.question("Enter your Instagram username: ");
    const password = await questionHidden("Enter your Instagram password: ");

    ig.state.generateDevice(username);

    console.log(chalk.yellow("🔐 Logging in..."));
    await ig.login({ username, password });

    console.log(chalk.green("✅ Logged in successfully!"));

    // ---------- FETCH INBOX (REST API) ----------
    console.log(chalk.yellow("📥 Fetching inbox threads..."));
    const inbox = await ig.direct.getInbox();
    const threads = inbox.inbox.threads;

    if (!threads.length) {
      console.log(chalk.red("❌ No threads found on this account."));
      process.exit(0);
    }

    console.log(chalk.cyan("\n📌 Available Instagram groups / threads:\n"));

    threads.forEach((t, i) => {
      const name =
        t.thread_title ||
        (t.users.length === 1 ? t.users[0].username : "Group Chat");
      console.log(chalk.white(`${i + 1}. ${name}   (Thread ID: ${t.thread_id})`));
    });

    console.log("");

    // ---------- SELECT THREADS ----------
    const selected = readlineSync
      .question("Select groups (ex: 1,2,5): ")
      .split(",")
      .map((x) => parseInt(x.trim()) - 1)
      .filter((x) => x >= 0 && x < threads.length);

    if (!selected.length) {
      console.log(chalk.red("❌ No threads selected."));
      process.exit(0);
    }

    const targetThreads = selected.map((i) => threads[i].thread_id);

    // ---------- TEXT PATH ----------
    const textPath = readlineSync.question("\nEnter your text file path: ");

    if (!fs.existsSync(textPath)) {
      console.log(chalk.red("❌ File does not exist."));
      process.exit(0);
    }

    const messages = fs
      .readFileSync(textPath, "utf8")
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    if (!messages.length) {
      console.log(chalk.red("❌ Text file is empty."));
      process.exit(0);
    }

    // ---------- DELAY ----------
    const delaySeconds = parseInt(
      readlineSync.question("Enter delay between messages (seconds): ")
    );

    if (isNaN(delaySeconds) || delaySeconds < 1) {
      console.log(chalk.red("❌ Invalid delay."));
      process.exit(0);
    }

    // ---------- REALTIME CONNECT ----------
    console.log(chalk.yellow("🔌 Connecting to Instagram MQTT..."));

    await realtime.connect({
      graphQlSubs: ["ig_sub_direct", "ig_sub_direct_v2_message_sync"],
      skywalkerSubs: ["presence_subscribe", "typing_subscribe"],
      irisData: inbox,
    });

    console.log(chalk.green("✅ Connected to MQTT realtime!"));

    // ---------- LISTEN TO ALL INCOMING MESSAGES ----------
    realtime.on("message", (data) => {
      if (data?.message?.text) {
        console.log(
          chalk.magenta(
            `\n📨 New message from ${data.message.from_user_id}: ${data.message.text}`
          )
        );
      }
    });

    // ---------- SPAM LOOP ----------
    console.log(chalk.green("\n🚀 Starting realtime MQTT message loop...\n"));

    while (true) {
      for (const line of messages) {
        for (const threadId of targetThreads) {
          try {
            await realtime.directCommands.sendTextViaRealtime(
              threadId,
              line
            );

            console.log(
              chalk.green(
                `📤 Sent to ${threadId}: "${line}" (via MQTT realtime)`
              )
            );
          } catch (err) {
            console.log(chalk.red(`❌ Error sending: ${err.message}`));
          }
        }

        await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      }
    }
  } catch (err) {
    console.log(chalk.red(`❌ ERROR: ${err.message}`));
  }
})();
