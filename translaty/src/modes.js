/**
 * @file modes.js
 * @description Defines translation modes and supported languages for the Translaty browser extension.
 *              Exports TRANSLATION_MODES and SUPPORTED_LANGUAGES as global variables for use in other scripts.
 * @author [Brett Pottle]
 */

const TRANSLATION_MODES = {
  PROFESSIONAL: {
    id: 'professional',
    label: 'Professional',
    prompt: 'Translate the selected text to formal {language}, suitable for professional or academic contexts, preserving technical accuracy and avoiding colloquialisms. Text: ',
    temperature: 0.7,
    topK: 50
  },
  LEARNING: {
    id: 'learning',
    label: 'Learning',
    prompt: 'Translate the selected text to {language} and provide a breakdown of key vocabulary and grammar in {language}, formatted for language learners with explanations in {language}. Text: ',
    temperature: 0.7,
    topK: 50
  },
  LITERATURE: {
    id: 'literature',
    label: 'Literature',
    prompt: 'Translate the selected text to {language} with high fidelity, preserving the literary style, tone, and cultural nuances. Retain all details, including metaphors, idioms, and cultural references, without omitting or simplifying content. Ensure the translation captures the emotional and stylistic intent of the original, optimized for web novels or creative writing. Text: ',
    temperature: 0.4,
    topK: 35
  },
  CASUAL: {
    id: 'casual',
    label: 'Casual',
    prompt: 'Translate the selected text to natural, conversational {language}, using colloquial expressions where appropriate. Text: ',
    temperature: 0.7,
    topK: 50
  },
  CUSTOM: {
    id: 'custom',
    label: 'Custom',
    prompt: 'Translate the selected text to {language}. Text: ',
    temperature: 0.7,
    topK: 50
  },
  MEME: {
    id: 'meme',
    label: 'Meme',
    prompt: 'Translate this meme text to {language} in a single, concise sentence, keeping the humor, slang, puns, and punchline intact. Adapt cultural references if needed but preserve the vibe. Return only the translated text, no explanations or extra text. If multiple text segments, return as a JSON array of strings. Text: ',    temperature: 0.9,
    temperature: 0.9,
    topK: 60
  }
};

const SUPPORTED_LANGUAGES = {
  'English': 'en',
  'Spanish': 'es',
  'Japanese': 'ja'
};

window.TRANSLATION_MODES = TRANSLATION_MODES;
window.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;

console.log('Modes loaded with TRANSLATION_MODES:', window.TRANSLATION_MODES);

/*
Non supported languages for our use, would work with Translate, but we are contextulizing translations, 
so doesn't work without more direct support, out of scope for current project. 
May add primary translate / rewrite features as needed.

Note that it does translate FROM most languages.
Also I somehow randomly got Chinese to work a few times, but only simplified and not consistantly? 

  'Chinese (Simplified)': 'zh',
  'Chinese (Traditional)': 'zh-TW',
  'Arabic': 'ar',
  'Hindi': 'hi',
  'Bengali': 'bn',
  'Portuguese': 'pt',
  'Russian': 'ru',
  'German': 'de',
  'French': 'fe',
  'Italian': 'it',
  'Korean':'ko',
  'Turkish':'tr',
  'Vietnamese':'vi',
  'Thai':'th',
  'Dutch':'nl',
  'Swedish':'sv',
  'Danish':'da',
  'Norwegian':'no',
  'Finnish':'fi',
  'Polish':'pl',
  'Czech':'cs',
  'Slovak':'sk',
  'Hungarian':'hu',
  'Romainian':'ro',
  'Bulgarian':'bg',
  'Croatian':'hr',
  'Serbian':'sr',
  'Slovenian':'sl',
  'Estonian':'et',
  'Latvian':'lv',
  'Lithuanian':'it',
  'Greek':'el',
  'Hebrew':'he',
  'Ukrainian':'uk',
  'Tamil':'ta',
  'Telugu':'te',
  'Marathi':'mr',
  'Urdu':'ur',
  'Persian':'fa',
  'Indonesian':'id',
  'Malay':'ms',
  'Filipino':'fil',
  'Burmese':'my',
  'Khmer':'km',
  'Lao':'lo',
  'Swahili':'sw',
  'Amharic':'am',
  'Hausa':'ha',
  'Yoruba':'yo',
  'Igbo':'ig',
  'Zulu': 'zu' */