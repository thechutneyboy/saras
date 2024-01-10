async function transliterate() {
  let lang = document.getElementById("inputLanguage").value;

  let inputText = document.getElementById("inputText").value;
  const ipaText = document.getElementById("ipaText");
  const transcriptText = document.getElementById("transcriptText");

  let word_list = inputText
    .split(/[\s.,?]+/)
    .map((word) => word.trim().toLowerCase());
  word_list = [...new Set(word_list)];
  console.log(word_list);

  const wordMapIPA = new Map();

  // Process each word
  for (const word of word_list) {
    try {
      const wikitext = await fetchWikitext(lang, word);

      if (!wikitext.includes(" ") & (wikitext != word)) {
        wordMapIPA.set(word, wikitext);
      } else {
        // Try with proper case
        wordProper = word[0].toUpperCase() + word.substring(1);
        console.log("Try again", wordProper);

        const wikitext_proper = await fetchWikitext(lang, wordProper);
        if (
          !wikitext_proper.includes(" ") &
          (wikitext_proper.toLowerCase() != word)
        ) {
          wordMapIPA.set(word, wikitext_proper);
        } else {
          wordMapIPA.set(word, word);
        }
      }
    } catch (error) {
      console.error("Error fetching wikitext:", error);
    }
  }

  console.log("wordMapIPA", wordMapIPA);
  const ipaOutput = replaceWordsWithMap(inputText, wordMapIPA, "/");
  ipaText.innerHTML = ipaOutput.replace(/\n/g, "<br>");

  // Indic Character Map
  let charMap;
  try {
    const response = await fetch("character_map.json");
    const data = await response.json();

    charMap = data.hindi;
    console.log("Character Map", charMap);
  } catch (error) {
    console.error("Error loading character map:", error);
  }

  const wordMapIndic = new Map(
    [...wordMapIPA].map(([key, value]) => {
      const indicValue =
        key !== value ? indicTranscript(value, charMap) : value;
      console.log(key, indicValue);
      return [key, indicValue];
    })
  );
  console.log("wordMapIndic", wordMapIndic);

  const transcriptOutput = replaceWordsWithMap(inputText, wordMapIndic);
  transcriptText.innerHTML = transcriptOutput.replace(/\n/g, "<br>");
}

const langRegexMap = {
  en: /Pronunciation[^\/]*\/([^\/]+)/i,
  fr: /pron\|([^|]+)\|fr/,
  de: /Lautschrift\|([^}]+)}/,
};

async function fetchWikitext(lang, word) {
  // Use the MediaWiki API to get the wikitext for the given word
  baseurl =
    "https://" +
    lang +
    ".wiktionary.org/w/api.php?action=parse&format=json&prop=wikitext&formatversion=2&origin=*&page=";
  let apiUrl = baseurl + encodeURIComponent(word);

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Extract wikitext from the response
    if (langRegexMap.hasOwnProperty(lang)) {
      const regex = langRegexMap[lang];
      let wikitext = data.parse?.wikitext;
      console.log("Parsed text", regex.exec(wikitext)?.[1]);

      return wikitext ? regex.exec(wikitext)?.[1] || word : word;
    }
    return word;
  } catch (error) {
    console.error("Failed to fetch wikitext:", error);
    return word;
  }
}

function replaceWordsWithMap(inputString, wordMap, delim = "") {
  const wordRegex = /(\b[^\s]+\b)/g;

  const replacedString = inputString.replace(wordRegex, (match) => {
    return match != wordMap.get(match)
      ? delim + wordMap.get(match.toLowerCase()) + delim
      : match;
  });

  return replacedString;
}

const replacementMap = {
  t͡: "t",
  d͡: "d",
  ʊ̯: "ʊ",
  ə̯: "ə",
  n̩: "n",
  ɪ̯: "ɪ",
  i̯: "i",
  // ɑ̃: "",
  // ɛ̃, ""
};
const startChars = ["/", "ˈ", "ˌ", ".", ")"];

function indicTranscript(inputString, charMap) {
  let transcriptOutput = inputString.replace(
    RegExp(Object.keys(replacementMap).join("|"), "g"),
    (match) => replacementMap[match]
  );
  // console.log("Post cleaning", transcriptOutput);

  // Compound:
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    ch = c + transcriptOutput[i + 1];

    let x = 1;
    // if at the beginning
    if (i === 0 || startChars.includes(transcriptOutput[i - 1])) {
      x = 0;
    }
    // console.log(charMap.compound[ch]?.[x]);

    return charMap.compound.hasOwnProperty(transcriptOutput[i - 1] + c)
      ? ""
      : charMap.compound[ch]?.[x] || c;
  });
  console.log("Post compound", transcriptOutput);

  // Vowel
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    let x = 1;
    // if at the beginning
    if (i === 0 || startChars.includes(transcriptOutput[i - 1])) {
      x = 0;
    }
    // console.log(charMap.vowels[c]?.[x], c);

    return charMap.vowels[c]?.[x] || c;
  });
  // console.log("Post vowel", transcriptOutput);

  // Consonants
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    x = 0;
    // use first if at the beginning or followed by vowel
    if (charMap.consonants.hasOwnProperty(transcriptOutput[i + 1])) {
      x = 1;
    }
    // console.log(charMap.consonants[c]?.[x], c);

    return charMap.consonants[c]?.[x] || c;
  });
  // console.log("Post consonants", transcriptOutput);

  // Clean up some characters
  transcriptOutput = transcriptOutput.replace(/[\/()ˈˌ]/g, "");

  return transcriptOutput;
}
