// Animate transliteration
document.addEventListener("DOMContentLoaded", function () {
  setInterval(() => {
    const text1 = document.getElementById("text1");
    const text2 = document.getElementById("text2");

    if (text1.classList.contains("visible")) {
      text1.classList.remove("visible");
      text2.classList.add("visible");
    } else {
      text2.classList.remove("visible");
      text1.classList.add("visible");
    }
  }, 6000);
});

const tooltipTriggerList = document.querySelectorAll(
  '[data-bs-toggle="tooltip"]'
);
const tooltipList = [...tooltipTriggerList].map(
  (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
);

function clearOutput() {
  console.log("there");
  const ipaText = document.getElementById("ipaText");
  ipaText.innerHTML =
    '<span class="placeholder col-5 bg-secondary"></span> <span class="placeholder col-4 bg-secondary"></span>';
  const transcriptText = document.getElementById("transcriptText");
  transcriptText.innerHTML =
    '<span class="placeholder col-4 bg-secondary"></span> <span class="placeholder col-3 bg-secondary" ></span >';
}

function clearEverything() {
  const inputText = document.getElementById("inputText");
  inputText.value = "";
  console.log("hi");

  clearOutput();
}

function getUrlParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function setValueAndTransliterate() {
  clearEverything();
  const lang = getUrlParam("lang");
  const paramValue = getUrlParam("t");

  const inputLanguage = document.getElementById("inputLanguage");
  inputLanguage.value = lang || "en";

  const inputText = document.getElementById("inputText");
  inputText.value = paramValue || "";

  if (paramValue) {
    transliterate();
  }
}

function transliterateAndUpdateUrl() {
  const inputLanguage = document.getElementById("inputLanguage");
  const lang = inputLanguage.value;

  const inputText = document.getElementById("inputText");
  const paramValue = inputText.value;

  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  url.searchParams.set("t", paramValue);

  window.history.replaceState({}, document.title, url.toString());
  history.pushState({}, document.title, url.toString());

  transliterate();
}

window.onload = setValueAndTransliterate;

window.addEventListener("popstate", function (event) {
  setValueAndTransliterate();
});
