// group_spam_loop.js
// VERSION: 3.0 (Optimizat pentru stabilitate și performanță)

const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const chalk = require('chalk');
const { IgApiClient } = require('nodejs-insta-private-api');
const Utils = require('nodejs-insta-private-api/dist/utils');

// Configurații
const SESSION_FILE = path.resolve(process.cwd(), 'session.json');
const OWNER_FILE = path.resolve(process.cwd(), 'owner.json');

// Banner și Console Override
console.log(chalk.bold.red("\n=========================================="));
console.log(chalk.bold.red("Marian x Bogdan Spammer 🔥 [PRO v3.0]"));
console.log(chalk.bold.red("==========================================\n"));

// ... (Păstrează override-ul de console.log existent pentru consistență) ...

/**
 * Modern sleep cu suport pentru AbortSignal
 */
async function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    });
  });
}

/**
 * Trimitere mesaj optimizată
 */
async function sendMessage(ig, threadId, message) {
  try {
    const thread = ig.entity.directThread(threadId);
    await thread.broadcastText(message);
    return true;
  } catch (err) {
    console.error(`❌ Eroare trimitere: ${err.message}`);
    return false;
  }
}

/**
 * Worker pentru spam per thread
 */
async function startSpamWorker(ig, threadId, message, delaySec, signal) {
  console.log(chalk.blue(`▶️ Spam pornit pe thread-ul: ${threadId}`));
  try {
    while (!signal.aborted) {
      const success = await sendMessage(ig, threadId, message);
      if (success) {
        console.log(chalk.green(`✅ Mesaj trimis către ${threadId}`));
      }
      
      // Jitter pentru a evita shadowban-ul
      const jitterDelay = (delaySec * 1000) + (Math.random() * 2000);
      await sleep(jitterDelay, signal);
    }
  } catch (e) {
    if (e.message !== 'Aborted') console.error(`❌ Worker error: ${e.message}`);
  }
  console.log(chalk.yellow(`⏹️ Worker oprit pentru: ${threadId}`));
}

// ... (Păstrează restul logicii de autentificare și load session) ...

/**
 * Main Logic îmbunătățit
 */
async function main() {
  const ig = new IgApiClient();
  // Logica de logare/sesiune rămâne similară, asigurându-te că folosești 
  // ig.state.generateDevice(username) înainte de login pentru stabilitate
  
  // În loop-ul de comenzi:
  const activeWorkers = new Map(); // Map<threadId, {controller: AbortController}>

  // Exemplu declanșare:
  /*
    const controller = new AbortController();
    activeWorkers.set(threadId, controller);
    startSpamWorker(ig, threadId, "Mesajul tau", delay, controller.signal);
    
    // Exemplu oprire:
    activeWorkers.get(threadId)?.abort();
    activeWorkers.delete(threadId);
  */
}

main().catch(console.error);
