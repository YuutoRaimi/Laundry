const STORAGE_KEY = "laundryTrackerData";
const THEME_KEY = "laundryTrackerTheme";

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
let itemTypes = [...defaultTypes];

loadData();
loadTheme();
renderItemTypes();
renderList();

function addLaundryItem(name, amount = 1) {
  laundryItems[name] = (laundryItems[name] || 0) + amount;
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

  renderItemTypes();
  saveData();
  addLaundryItem(name);
  input.value = "";
}

function renderItemTypes() {
  const itemTypesElement = document.getElementById("itemTypes");
  itemTypesElement.innerHTML = "";

  itemTypes.forEach((name) => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = name;
    button.onclick = () => addLaundryItem(name, name === "Kaos Kaki" ? 2 : 1);
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
    item.innerHTML = `<span>${name}</span><strong>${qty} pcs</strong>`;
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

function saveData() {
  const data = {
    laundryItems,
    itemTypes,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return;
  }

  try {
    const data = JSON.parse(savedData);

    const savedTypes = Array.isArray(data.itemTypes) ? data.itemTypes : [];

    Object.assign(laundryItems, data.laundryItems || {});
    itemTypes = [...new Set([...defaultTypes, ...savedTypes])];
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
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

  themeToggle.textContent = document.documentElement.classList.contains("dark-mode") ? "Dark" : "Light";
}
