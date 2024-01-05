function transliterate() {
  // Get the text from the textarea
  var inputText = document.getElementById("inputText").value;
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

  //   Create a map to store word-wikitext pairs
  const wordMap = new Map();

  // Array to store promises for each fetch operation
  const fetchPromises = [];

  //   Process each word
  words.forEach((word) => {
    // Make an API request to get wikitext for the word
    const fetchPromise = fetchWikitext(word)
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
      ipaText.innerHTML = `<span class="badge text-bg-secondary">IPA</span> ${ipaOutput}`;

      const transcriptOutput = await indicTranscript(ipaOutput);
      transcriptText.innerHTML = `<span class="badge text-bg-success">Indic</span> ${transcriptOutput}`;
    })
    .catch((error) => {
      console.error("Error in Promise.all:", error);
    });
}

function fetchWikitext(word) {
  // Use the MediaWiki API to get the wikitext for the given word
  baseurl =
    "https://en.wiktionary.org/w/api.php?action=parse&format=json&prop=wikitext&formatversion=2&origin=*&page=";
  var apiUrl = baseurl + encodeURIComponent(word.toLowerCase());

  // Return a promise for the fetched wikitext
  return fetch(apiUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to fetch wikitext");
      }
      return response.json();
    })
    .then(function (data) {
      // Extract wikitext from the response
      const regex = /Pronunciation[^\/]*\/([^\/]+)/i;
      var wikitext = data.parse?.wikitext;

      return wikitext ? regex.exec(wikitext)?.[1] || word : word;
    });
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
  let transcriptOutput = inputString.replace(/[\/ˈˌ]/g, "");
  transcriptOutput = transcriptOutput.replace(/t͡/g, "t");
  transcriptOutput = transcriptOutput.replace(/d͡/g, "d");
  transcriptOutput = transcriptOutput.replace(/ʊ̯/g, "ʊ");
  transcriptOutput = transcriptOutput.replace(/ə̯/g, "ə");
  console.log("Post cleaning", transcriptOutput);

  // Compound:
  transcriptOutput = transcriptOutput.replace(/./g, (c, i) => {
    ch = c + transcriptOutput[i + 1];

    let x = 1;
    // if at the beginning
    if (i === 0 || transcriptOutput[i - 1] === " ") {
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
    if (i === 0 || transcriptOutput[i - 1] === " ") {
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
  transcriptOutput = transcriptOutput.replace(/[()\.]/g, "");

  return transcriptOutput;
}
