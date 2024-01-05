function transliterate() {
  let lang = document.getElementById("inputLanguage").value;

  // Get the text from the textarea
  let inputText = document.getElementById("inputText").value;
  const ipaText = document.getElementById("ipaText");
  const transcriptText = document.getElementById("transcriptText");

  // Use a regular expression to split the text into words
  var words = inputText.split(/\W+/);

  // Filter out empty strings (resulting from multiple consecutive spaces)
  words = words.filter(function (word) {
    return word.trim() !== "";
  });

  // Log the list of words to the console
  console.log(words);

  // Create a map to store word-wikitext pairs
  const wordMap = new Map();

  // Array to store promises for each fetch operation
  const fetchPromises = [];

  //   Process each word
  words.forEach((word) => {
    // Make an API request to get wikitext for the word
    const fetchPromise = fetchWikitext(lang, word)
      .then((wikitext) => {
        // Add the word and its wikitext to the map
        wordMap.set(word, wikitext);
      })
      .catch(function (error) {
        console.error("Error fetching wikitext:", error);
      });

    fetchPromises.push(fetchPromise);
  });

  // Use Promise.all to wait for all fetch promises to complete
  Promise.all(fetchPromises)
    .then(async () => {
      // All fetch operations are complete
      console.log(wordMap);
      const ipaOutput = replaceWordsWithMap(inputText, wordMap);
      ipaText.innerHTML = ipaOutput;

      const transcriptOutput = await indicTranscript(ipaOutput);
      transcriptText.innerHTML = transcriptOutput;
    })
    .catch((error) => {
      console.error("Error in Promise.all:", error);
    });
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
  let apiUrl = baseurl + encodeURIComponent(word.toLowerCase());

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    // Extract wikitext from the response

    if (langRegexMap.hasOwnProperty(lang)) {
      const regex = langRegexMap[lang];
      let wikitext = data.parse?.wikitext;
      console.log("parsed text", regex.exec(wikitext)?.[1]);

      return wikitext ? regex.exec(wikitext)?.[1] || word : word;
    }
    return word;
  } catch (error) {
    console.error("Failed to fetch wikitext:", error);
    return word;
  }
}

function replaceWordsWithMap(inputString, wordMap) {
  // Create a regular expression to match words
  const wordRegex = /\b\w+\b/g;

  // Use replace() with a callback function to replace each word
  const replacedString = inputString.replace(wordRegex, function (match) {
    return match != wordMap.get(match) ? "/" + wordMap.get(match) + "/" : match;
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

  // clean up
  let transcriptOutput = inputString.replace(/[ˈˌ]/g, "");
  transcriptOutput = transcriptOutput.replace(
    RegExp(Object.keys(replacementMap).join("|"), "g"),
    (match) => replacementMap[match]
  );
  console.log("Post cleaning", transcriptOutput);

  // Compound:
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    ch = c + transcriptOutput[i + 1];

    let x = 1;
    // if at the beginning
    if (i === 0 || transcriptOutput[i - 1] === "/") {
      x = 0;
    }
    console.log(charMap.compound[ch]?.[x]);

    return charMap.compound.hasOwnProperty(transcriptOutput[i - 1] + c)
      ? ""
      : charMap.compound[ch]?.[x] || c;
  });
  console.log("Post compound", transcriptOutput);

  // Vowel
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    console.log(c, charMap.vowels[c]);
    let x = 1;
    // if at the beginning
    if (i === 0 || transcriptOutput[i - 1] === "/") {
      x = 0;
    }
    console.log(charMap.vowels[c]?.[x]);

    return charMap.vowels[c]?.[x] || c;
  });
  console.log("Post vowel", transcriptOutput);

  // Consonants
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    console.log(c, charMap.consonants[c]);

    x = 0;
    // use first if at the beginning or followed by vowel
    if (charMap.consonants.hasOwnProperty(transcriptOutput[i + 1])) {
      x = 1;
    }

    return charMap.consonants[c]?.[x] || c;
  });
  console.log("Post consonants", transcriptOutput);

  // Clean up some characters
  transcriptOutput = transcriptOutput.replace(/[\/()\.]/g, "");

  return transcriptOutput;
}
