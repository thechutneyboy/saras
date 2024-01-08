async function transliterate() {
  let lang = document.getElementById("inputLanguage").value;

  // Get the text from the textarea
  let inputText = document.getElementById("inputText").value;
  const ipaText = document.getElementById("ipaText");
  const transcriptText = document.getElementById("transcriptText");

  // Use a regular expression to split the text into words
  let word_list = inputText
    .split(/\W+/)
    .map((word) => word.trim().toLowerCase());
  console.log(word_list);

  // Create a map to store word-wikitext pairs
  const wordMap = new Map();

  //   Process each word
  for (const word of word_list) {
    try {
      const wikitext = await fetchWikitext(lang, word);

      if (!wikitext.includes(" ")) {
        wordMap.set(word, wikitext);
      } else {
        // Try with proper case
        console.log("Try again", word[0].toUpperCase(), word.substring(1));

        const wikitext_proper = await fetchWikitext(
          lang,
          word[0].toUpperCase() + word.substring(1)
        );
        if (!wikitext_proper.includes(" ")) {
          wordMap.set(word, wikitext_proper);
        } else {
          wordMap.set(word, word);
        }
      }
    } catch (error) {
      console.error("Error fetching wikitext:", error);
    }
  }

  console.log(wordMap);
  const ipaOutput = replaceWordsWithMap(inputText, wordMap);
  ipaText.innerHTML = ipaOutput.replace(/\n/g, "<br>");

  const transcriptOutput = await indicTranscript(ipaOutput);
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

function replaceWordsWithMap(inputString, wordMap) {
  // Create a regular exeaspression to match words
  const wordRegex = /(\b\w+\b)/g;

  // Use replace() with a callback function to replace each word
  const replacedString = inputString.replace(wordRegex, (match) => {
    return match != wordMap.get(match)
      ? "/" + wordMap.get(match.toLowerCase()) + "/"
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
};
const startChars = ["/", "ˈ", "ˌ", "."];

async function indicTranscript(inputString) {
  let charMap;
  try {
    const response = await fetch("character_map.json");
    const data = await response.json();

    charMap = data.hindi;
    console.log(charMap);
  } catch (error) {
    console.error("Error loading character map:", error);
    return inputString;
  }

  let transcriptOutput = inputString.replace(
    RegExp(Object.keys(replacementMap).join("|"), "g"),
    (match) => replacementMap[match]
  );
  console.log("Post cleaning", transcriptOutput);

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
  console.log("Post vowel", transcriptOutput);

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
  console.log("Post consonants", transcriptOutput);

  // Clean up some characters
  transcriptOutput = transcriptOutput.replace(/[\/()ˈˌ]/g, "");

  return transcriptOutput;
}
