
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDSpebs9nP97-IkXXGALGR2vCqcTTOzlyo",
    authDomain: "ghoatygames.firebaseapp.com",
    projectId: "ghoatygames",
    storageBucket: "ghoatygames.firebasestorage.app",
    messagingSenderId: "606779515816",
    appId: "1:606779515816:web:774ccc3cd8d7f895f7339d",
    measurementId: "G-CCE1LRLR46"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let sessionStart = null;
let accumulatedSeconds = 0;
let currentUser = null;
let active = false;

async function saveUserTime(uid, email, secondsToAdd) {
    const userRef = doc(db, "leaderboard", uid);
    const userSnap = await getDoc(userRef);
    let totalSeconds = secondsToAdd;
    if (userSnap.exists()) {
        const data = userSnap.data();
        totalSeconds += data.totalSeconds || 0;
    }
    await setDoc(userRef, {
        uid: uid,
        email: email,
        totalSeconds: totalSeconds
    });
    loadLeaderboard();
}

async function loadLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;
    list.innerHTML = "<li>Loading...</li>";
    const q = query(collection(db, "leaderboard"), orderBy("totalSeconds", "desc"), limit(10));
    const snap = await getDocs(q);
    list.innerHTML = "";
    snap.forEach((doc) => {
        const data = doc.data();
        const mins = Math.floor((data.totalSeconds || 0) / 60);
        const secs = (data.totalSeconds || 0) % 60;
        list.innerHTML += `<li><strong>${data.email || data.uid}</strong>: ${mins}m ${secs}s</li>`;
    });
    if (list.innerHTML === "") {
        list.innerHTML = "<li>No time tracked yet.</li>";
    }
}

function updateSessionTimer() {
    const timer = document.getElementById("session-timer");
    if (!timer) return;
    if (currentUser && active && sessionStart) {
        const now = Date.now();
        const seconds = accumulatedSeconds + Math.floor((now - sessionStart) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timer.textContent = `Your session: ${mins}m ${secs}s`;
    } else {
        timer.textContent = "";
    }
}

function startTracking() {
    if (!active) {
        active = true;
        sessionStart = Date.now();
    }
}

function stopTracking() {
    if (active && sessionStart) {
        const now = Date.now();
        accumulatedSeconds += Math.floor((now - sessionStart) / 1000);
    }
    active = false;
    sessionStart = null;
}

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    accumulatedSeconds = 0;
    sessionStart = null;
    active = false;
    if (user) {
        loadLeaderboard();
    } else {
        const timer = document.getElementById("session-timer");
        if (timer) timer.textContent = "";
        loadLeaderboard();
    }
});

window.addEventListener("focus", () => {
    if (currentUser) startTracking();
});
window.addEventListener("blur", () => {
    if (currentUser) stopTracking();
});
window.addEventListener("beforeunload", () => {
    if (currentUser) {
        stopTracking();
        if (accumulatedSeconds > 0) {
            saveUserTime(currentUser.uid, currentUser.email, accumulatedSeconds);
        }
    }
});

setInterval(() => {
    if (currentUser && active && sessionStart) {
        const now = Date.now();
        const seconds = Math.floor((now - sessionStart) / 1000);
        if (seconds > 0) {
            saveUserTime(currentUser.uid, currentUser.email, seconds);
            accumulatedSeconds = 0;
            sessionStart = Date.now();
        }
    }
    updateSessionTimer();
}, 60000);

setInterval(loadLeaderboard, 60000);
setInterval(updateSessionTimer, 1000);
