import actions from '../src/assets/json/actions.json';
import emotions from '../src/assets/json/emotions.json';
import phrases from '../src/assets/json/phrases.json';
import questions from '../src/assets/json/questions.json';
import things from '../src/assets/json/things.json';
import timespace from '../src/assets/json/timespace.json';
import wikicats from '../src/assets/json/wikicats.json';

const basemaps = {
    "actions": actions,
    "emotions": emotions,
    "phrases": phrases,
    "questions": questions,
    "things": things,
    "timespace": timespace,
    "wikicats": wikicats
}

const chooseThreeMostImportantWords = (text) => {
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map();
    for (const word of words) {
        if (stopWords.has(word)) continue;
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    const sortedWords = Array.from(wordCounts.entries()).sort((a, b) => b[1] - a[1]);
    const topThree = sortedWords.slice(0, 3).map(([word]) => word);

    return topThree.join(' '); 
}

const stopWords = new Set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
    "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers",
    "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"
]);

function sampleRandomWords(wordsArray, sampleSize = 10) {
    const shuffled = [...wordsArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }

export { basemaps, sampleRandomWords };