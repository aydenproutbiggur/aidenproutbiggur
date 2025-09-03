import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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

let currentUser = null;
let lastTick = Date.now();
let activeSeconds = 0;
let unsavedSeconds = 0;


function formatTime(total) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}h ${m}m ${s}s`;
}


function updateYourTimeDisplay() {
    const el = document.getElementById("your-time");
    if (el) {
        el.textContent = "Your Session: " + formatTime(activeSeconds);
    }
}


async function saveUserTime(uid, email, secondsToAdd) {
    try {
        const userRef = doc(db, "leaderboard", uid);
        const userSnap = await getDoc(userRef);
        let totalSeconds = secondsToAdd;

        if (userSnap.exists()) {
            totalSeconds += userSnap.data().totalSeconds || 0;
        }

        await setDoc(userRef, {
            uid: uid,
            email: email,
            totalSeconds: totalSeconds
        });

        unsavedSeconds = 0;
    } catch (e) {
        console.error("Error saving time:", e);
    }
}


function startLeaderboardListener() {
    const leaderboardList = document.getElementById("leaderboard-list");
    if (!leaderboardList) return; 

    const q = query(collection(db, "leaderboard"), orderBy("totalSeconds", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        leaderboardList.innerHTML = "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            leaderboardList.innerHTML += `<li><strong>${data.email || data.uid}</strong>: ${formatTime(data.totalSeconds || 0)}</li>`;
        });
        if (leaderboardList.innerHTML === "") {
            leaderboardList.innerHTML = "<li>No time tracked yet.</li>";
        }
    });
}


setInterval(() => {
    if (currentUser && document.hasFocus()) {
        const now = Date.now();
        const diff = Math.floor((now - lastTick) / 1000);
        if (diff > 0) {
            activeSeconds += diff;
            unsavedSeconds += diff;
            lastTick = now;
            updateYourTimeDisplay();
            if (unsavedSeconds >= 60) {
                saveUserTime(currentUser.uid, currentUser.email, unsavedSeconds);
            }
        }
    } else {
        lastTick = Date.now();
    }
}, 1000);


onAuthStateChanged(auth, (user) => {
    currentUser = user;
    lastTick = Date.now();
    activeSeconds = 0;
    unsavedSeconds = 0;
    if (user) {
        if (document.getElementById("user-email")) {
            document.getElementById("user-email").textContent = user.email;
        }
        startLeaderboardListener();
    } else {
        startLeaderboardListener(); 
    }
});


window.addEventListener("beforeunload", () => {
    if (currentUser && unsavedSeconds > 0) {
        saveUserTime(currentUser.uid, currentUser.email, unsavedSeconds);
    }
});
