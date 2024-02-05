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

  const transliterateButton = document.getElementById("transliterate");
  transliterateButton.classList = "btn btn-secondary";
}

window.onload = setValueAndTransliterate;

window.addEventListener("popstate", function (event) {
  setValueAndTransliterate();
});

document.getElementById("inputText").addEventListener("input", function () {
  const transliterateButton = document.getElementById("transliterate");
  transliterateButton.classList = "btn btn-warning";
});

// Share Link or Text
const shareLink = document.getElementById("shareLink");
const shareText = document.getElementById("shareText");

const inputText = document.getElementById("inputText");
const transcriptText = document.getElementById("transcriptText");

if (navigator.share) {
  shareLink.addEventListener("click", async () => {
    try {
      await navigator.share({
        url: window.location.href,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  });
  shareText.addEventListener("click", async () => {
    try {
      // Alternate input and transliterate
      const inputList = inputText.value.split("\n");
      const transcriptList = transcriptText.innerText.split("\n");

      let copyText = "";
      for (let i = 0; i < inputList.length; i++) {
        copyText += inputList[i] + "\n" + transcriptList[i] + "\n";
      }
      await navigator.share({
        text: copyText,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  });
} else {
  shareLink.addEventListener("click", () => {
    alert("Sharing is not supported on this device/browser.");
  });
  shareText.addEventListener("click", () => {
    alert("Sharing is not supported on this device/browser.");
  });
}
