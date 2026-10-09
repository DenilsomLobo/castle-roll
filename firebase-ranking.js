import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getFirestore, collection, query, orderBy, limit, getDocsFromServer, doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().find(app => app.name === 'castle-roll-ranking') || initializeApp(firebaseConfig, 'castle-roll-ranking');
const db = getFirestore(app); // (default)
const auth = getAuth(app);
let authentication;

export function authenticatePlayer() {
  if (!authentication) authentication = (async () => {
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
    return auth.currentUser || (await signInAnonymously(auth)).user;
  })().catch(error => { authentication = null; throw error; });
  return authentication.then(user => {
    if (auth.currentUser?.uid !== user.uid) { authentication = null; return authenticatePlayer(); }
    return user;
  });
}

export async function getTopRanking() {
  const snapshot = await getDocsFromServer(query(collection(db, 'ranking_castle_roll'), orderBy('pontos', 'desc'), limit(10)));
  return snapshot.docs.map(doc => {
    const row = doc.data();
    if (typeof row.nome !== 'string' || !row.nome.trim() || !Number.isSafeInteger(row.pontos) || row.pontos < 0 || !Number.isSafeInteger(row.fase) || row.fase < 0) {
      throw new Error('O ranking contém um documento com nome, pontos ou fase inválidos.');
    }
    return { name: row.nome, score: row.pontos, stage: row.fase };
  });
}

// This is structural validation, NOT proof of a legitimate score.
export async function submitCompletedRun(report, persistUid) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(report.runId) || typeof report.nome !== 'string' || report.nome.length < 2 || report.nome.length > 20 ||
      !Number.isSafeInteger(report.pontos) || report.pontos < 0 || report.pontos > 2147483647 || ![1,2,3].includes(report.fase)) {
    throw new Error('Resultado final inválido para sincronização.');
  }
  const user = await authenticatePlayer();
  if (report.uid && report.uid !== user.uid) throw new Error('A identidade Firebase mudou. O resultado permanece pendente para o UID original.');
  // Persist ownership before making any write: retries must never change origin.
  await persistUid(user.uid);
  const reference = doc(db, 'ranking_castle_roll', report.runId);
  return runTransaction(db, async transaction => {
    const existing = await transaction.get(reference);
    if (existing.exists()) {
      const previous = existing.data();
      if (previous.uid !== user.uid || previous.runId !== report.runId || previous.nome !== report.nome || previous.pontos !== report.pontos || previous.fase !== report.fase) {
        throw new Error('O identificador da campanha já pertence a outro resultado.');
      }
      return { confirmed: true, alreadyExists: true, id: report.runId };
    }
    transaction.set(reference, { nome: report.nome, pontos: report.pontos, fase: report.fase, uid: user.uid, runId: report.runId, criadoEm: serverTimestamp() });
    return { confirmed: true, alreadyExists: false, id: report.runId };
  });
}
