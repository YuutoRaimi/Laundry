import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const STORAGE_KEY = "laundryTrackerData";
const THEME_KEY = "laundryTrackerTheme";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const laundryDoc = doc(db, "laundry", "shared-list");

const defaultTypes = [
  "Kemeja",
  "Jaket",
  "Hoody Panjang",
  "Hoody Pendek",
  "Kaos Uniqlo",
  "Kaos Biasa",
  "Kaos Krah / Polo",
  "Celana Pendek",
  "Celana Panjang",
  "Kaos Kaki",
];

const laundryItems = {};
const itemNotes = {};
let itemTypes = [...defaultTypes];
let isRemoteReady = false;

loadLocalData();
loadTheme();
renderItemTypes();
renderList();
startFirestoreSync();

window.addLaundryItem = addLaundryItem;
window.addCustomType = addCustomType;
window.showCustomForm = showCustomForm;
window.resetData = resetData;
window.confirmResetData = confirmResetData;
window.closeResetModal = closeResetModal;
window.toggleTheme = toggleTheme;
window.updateItemNote = updateItemNote;

function addLaundryItem(name, amount = 1) {
  laundryItems[name] = (laundryItems[name] || 0) + amount;
  saveData();
  renderList();
}

function getItemStep(name) {
  return name === "Kaos Kaki" ? 2 : 1;
}

function decreaseLaundryItem(name) {
  const step = getItemStep(name);
  laundryItems[name] = (laundryItems[name] || 0) - step;

  if (laundryItems[name] <= 0) {
    delete laundryItems[name];
    delete itemNotes[name];
  }

  saveData();
  renderList();
}

function addCustomType() {
  const input = document.getElementById("itemName");
  const name = input.value.trim();

  if (!name) {
    alert("Masukkan nama jenis barang dulu.");
    return;
  }

  if (!itemTypes.includes(name)) {
    itemTypes.push(name);
  }

  laundryItems[name] = (laundryItems[name] || 0) + 1;
  renderItemTypes();
  saveData();
  renderList();
  input.value = "";
}

function renderItemTypes() {
  const itemTypesElement = document.getElementById("itemTypes");
  itemTypesElement.innerHTML = "";

  itemTypes.forEach((name) => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = name;
    button.onclick = () => addLaundryItem(name, getItemStep(name));
    itemTypesElement.appendChild(button);
  });
}

function showCustomForm() {
  const form = document.getElementById("customForm");

  form.classList.toggle("hidden");

  if (!form.classList.contains("hidden")) {
    document.getElementById("itemName").focus();
  }
}

function renderList() {
  const list = document.getElementById("list");
  const totalItems = document.getElementById("totalItems");
  list.innerHTML = "";

  if (Object.keys(laundryItems).length === 0) {
    list.innerHTML = `<li class="empty">Belum ada barang laundry.</li>`;
  }

  Object.entries(laundryItems).forEach(([name, qty]) => {
    const item = document.createElement("li");
    const itemName = document.createElement("span");
    const itemQty = document.createElement("strong");
    const actions = document.createElement("div");
    const plusButton = document.createElement("button");
    const minusButton = document.createElement("button");
    const noteInput = document.createElement("input");

    itemName.textContent = name;
    itemQty.textContent = `${qty} pcs`;

    actions.className = "item-actions";

    plusButton.type = "button";
    plusButton.className = "small-button plus-button";
    plusButton.textContent = "+";
    plusButton.onclick = () => addLaundryItem(name, getItemStep(name));

    minusButton.type = "button";
    minusButton.className = "small-button minus-button";
    minusButton.textContent = "-";
    minusButton.onclick = () => decreaseLaundryItem(name);

    noteInput.type = "text";
    noteInput.className = "note-input";
    noteInput.placeholder = "Catatan";
    noteInput.value = itemNotes[name] || "";
    noteInput.onchange = () => updateItemNote(name, noteInput.value);

    actions.appendChild(plusButton);
    actions.appendChild(minusButton);

    item.appendChild(itemName);
    item.appendChild(itemQty);
    item.appendChild(actions);
    item.appendChild(noteInput);
    list.appendChild(item);
  });

  const total = Object.values(laundryItems).reduce((sum, qty) => sum + qty, 0);
  totalItems.textContent = `${total} pcs`;
}

function resetData() {
  const modal = document.getElementById("resetModal");
  modal.classList.remove("hidden");
}

function confirmResetData() {
  Object.keys(laundryItems).forEach((name) => delete laundryItems[name]);
  Object.keys(itemNotes).forEach((name) => delete itemNotes[name]);
  itemTypes = [...defaultTypes];
  saveData();
  renderItemTypes();
  renderList();
  closeResetModal();
}

function closeResetModal(event) {
  if (event && event.target.id !== "resetModal") {
    return;
  }

  const modal = document.getElementById("resetModal");
  modal.classList.add("hidden");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeResetModal();
  }
});

async function startFirestoreSync() {
  updateSyncStatus("syncing", "Menyambungkan...");

  try {
    const snapshot = await getDoc(laundryDoc);

    if (!snapshot.exists()) {
      await saveRemoteData();
    }

    onSnapshot(
      laundryDoc,
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          return;
        }

        isRemoteReady = true;
        updateSyncStatus("online", "Online");
        applySavedData(docSnapshot.data());
        saveLocalData();
        renderItemTypes();
        renderList();
      },
      (error) => {
        console.error("Realtime Firestore gagal:", error);
        updateSyncStatus("offline", "Offline");
        isRemoteReady = false;
      }
    );
  } catch (error) {
    console.error("Firestore gagal tersambung:", error);
    updateSyncStatus("offline", "Offline");
    isRemoteReady = false;
  }
}

function saveData() {
  saveLocalData();

  if (isRemoteReady) {
    updateSyncStatus("saving", "Menyimpan...");
    saveRemoteData().catch((error) => {
      console.error("Data gagal disimpan ke Firestore:", error);
      updateSyncStatus("offline", "Offline");
    });
  }
}

function saveLocalData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getCurrentData()));
}

async function saveRemoteData() {
  await setDoc(laundryDoc, getCurrentData());
  updateSyncStatus("online", "Tersimpan");
}

function getCurrentData() {
  return {
    laundryItems: { ...laundryItems },
    itemNotes: { ...itemNotes },
    itemTypes,
    updatedAt: new Date().toISOString(),
  };
}

function loadLocalData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return;
  }

  try {
    applySavedData(JSON.parse(savedData));
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function applySavedData(data) {
  const savedTypes = Array.isArray(data.itemTypes) ? data.itemTypes : [];

  Object.keys(laundryItems).forEach((name) => delete laundryItems[name]);
  Object.keys(itemNotes).forEach((name) => delete itemNotes[name]);
  Object.assign(laundryItems, data.laundryItems || {});
  Object.assign(itemNotes, data.itemNotes || {});
  itemTypes = [...new Set([...defaultTypes, ...savedTypes])];
}

function updateItemNote(name, note) {
  if (note.trim()) {
    itemNotes[name] = note.trim();
  } else {
    delete itemNotes[name];
  }

  saveData();
  renderList();
}

function updateSyncStatus(status, text) {
  const syncStatus = document.getElementById("syncStatus");

  if (!syncStatus) {
    return;
  }

  syncStatus.className = `sync-status ${status}`;
  syncStatus.textContent = text;
}

function toggleTheme() {
  const isDarkMode = document.documentElement.classList.toggle("dark-mode");
  localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  updateThemeButton();
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

  document.documentElement.classList.toggle("dark-mode", shouldUseDark);
  updateThemeButton();
}

function updateThemeButton() {
  const themeToggle = document.getElementById("themeToggle");

  if (!themeToggle) {
    return;
  }

  themeToggle.textContent = document.documentElement.classList.contains("dark-mode") ? "Light" : "Dark";
}
