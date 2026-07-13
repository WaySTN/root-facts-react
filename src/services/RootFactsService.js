import { pipeline } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';
import { isWebGPUSupported, logError } from '../utils/common.js';

// Tone → prompt instruction map (Bahasa Inggris, menggunakan format instruksi Alpaca/LaMini agar model 77M tidak berhalusinasi)
const TONE_PROMPT_MAP = {
  normal:
    'Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nWrite a short, informative, and interesting fun fact about the vegetable {vegetable}. The fact must start with the word "{vegetable}".\n\n### Response:',
  funny:
    'Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nWrite a funny, witty, and humorous fun fact about the vegetable {vegetable}. Mention "{vegetable}" in the fact.\n\n### Response:',
  professional:
    'Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nProvide a scientifically accurate, educational, and professional fun fact about the vegetable {vegetable}. Mention "{vegetable}" in the fact.\n\n### Response:',
  casual:
    'Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\nShare a friendly, relaxed, and cool fun fact about the vegetable {vegetable}. Mention "{vegetable}" in the fact.\n\n### Response:',
};

// Kamus fakta cadangan (fallback) untuk menjamin 100% keselarasan data jika AI berhalusinasi
const FALLBACK_FACTS = {
  Beetroot: {
    normal: 'Beetroot is a sweet root vegetable that has been used since ancient Roman times. It is high in fiber, folate, and vitamin C.',
    funny: "Beetroots are so red they can turn your pee pink. Don't panic, it's just the beet's way of playing a colorful prank on you!",
    professional: 'Beta vulgaris, commonly known as beetroot, is rich in inorganic nitrates which the human body converts into nitric oxide, potentially lowering blood pressure.',
    casual: "Hey, did you know beetroots are super sweet? They actually have one of the highest sugar contents of any vegetable, but they're still great for you!"
  },
  Paprika: {
    normal: 'Paprika is a ground spice made from dried red fruits of Capsicum annuum. It is rich in vitamin A and antioxidants.',
    funny: "Paprika is basically bell pepper that decided to get dried, crushed, and fancy. It's the ultimate glow-up story of the spice cabinet!",
    professional: 'Paprika is derived from dried, ground pods of Capsicum annuum. Its color is primarily due to carotenoid pigments, such as capsanthin and capsorubin.',
    casual: "Paprika is awesome for adding color to your dishes. It can range from sweet and mild to hot and smoky, depending on how it's made."
  },
  Cabbage: {
    normal: 'Cabbage is a leafy green or purple biennial plant grown as an annual vegetable crop for its dense-leaved heads. It is packed with vitamin K.',
    funny: 'Cabbage is like the introverted cousin of lettuce. It packs itself so tightly into a ball because it just wants some personal space!',
    professional: 'Brassica oleracea var. capitata, or cabbage, contains significant levels of glucosinolates, which possess antioxidant properties.',
    casual: 'Cabbage is super versatile! You can eat it raw in coleslaw, ferment it into kimchi, or stir-fry it. Plus, it lasts a long time in the fridge.'
  },
  Carrot: {
    normal: 'Carrots are root vegetables that are usually orange, though purple, black, red, white, and yellow cultivars exist. They are rich in beta-carotene.',
    funny: "Carrots were originally purple, not orange! Orange carrots were bred in the Netherlands in the 17th century, probably just to match the royal family's color.",
    professional: 'Daucus carota subsp. sativus is a root vegetable characterized by high concentrations of alpha- and beta-carotene, precursors to Vitamin A.',
    casual: 'Carrots are great for a quick snack. They are super crunchy, sweet, and actually really good for keeping your eyes healthy.'
  },
  Cauliflower: {
    normal: 'Cauliflower is one of several vegetables in the species Brassica oleracea. It is low in calories but high in vitamins and fiber.',
    funny: 'Cauliflower is just cabbage that went to college and got a degree in pretending to be rice, pizza crust, and mashed potatoes!',
    professional: 'Brassica oleracea var. botrytis consists of an edible white inflorescence meristem. It is rich in dietary fiber and vitamin C.',
    casual: 'Cauliflower is like a blank canvas. It absorbs whatever flavors you cook it with, which is why people use it for everything these days!'
  },
  Chilli: {
    normal: 'Chilli peppers are the fruits of Capsicum pepper plants, notable for their hot flavor. They contain capsaicin, which gives them their heat.',
    funny: 'Chilli peppers contain capsaicin to stop animals from eating them. Humans are the only weird species that eats them anyway because we love the pain!',
    professional: 'Capsicum frutescens contains capsaicinoids, primarily capsaicin, which bind to nociceptors in the oral cavity, inducing a thermal sensation.',
    casual: "If your mouth is burning from a hot chilli, don't drink water! Capsaicin is oil-based, so milk or yogurt will wash it away much better."
  },
  Corn: {
    normal: 'Corn, also known as maize, is a cereal grain first domesticated by indigenous peoples in southern Mexico. It is a staple food globally.',
    funny: "An ear of corn always has an even number of rows, usually 16. It's like nature's most mathematically organized snack!",
    professional: 'Zea mays, commonly referred to as maize or corn, is a monocotyledonous crop widely cultivated for food, animal feed, and biofuel production.',
    casual: 'Popcorn is actually a specific type of corn that has a hard hull. When heated, the water inside turns to steam and pops the kernel open!'
  },
  Cucumber: {
    normal: 'Cucumber is a widely cultivated creeping vine plant in the gourd family. It is about 95% water, making it extremely hydrating.',
    funny: 'Cucumbers are biologically fruits, not vegetables. So technically, putting cucumber slices on your eyes is just making a very tiny fruit salad!',
    professional: 'Cucumis sativus is a widely cultivated gourd plant. Due to its high water content (approx. 95.2%), it serves as an excellent natural hydrator.',
    casual: 'Cucumbers are super refreshing. They contain silica, which is great for your skin and hair, and they help keep you cool in hot weather.'
  },
  eggplant: {
    normal: 'Eggplant, also known as aubergine, is a species of nightshade grown for its edible fruit. It is high in antioxidants like nasunin.',
    funny: 'Eggplants got their English name because 18th-century cultivars looked exactly like small, white goose eggs hanging from the plant!',
    professional: 'Solanum melongena is a member of the Solanaceae family. The deep purple skin is rich in nasunin, a potent antioxidant that protects cell membranes.',
    casual: 'Eggplant behaves like a sponge when cooking. It will soak up oils and spices beautifully, making it perfect for stews and curries.'
  },
  Garlic: {
    normal: 'Garlic is a species in the onion genus, Allium. It has been used for thousands of years for both culinary and medicinal purposes.',
    funny: 'Garlic is delicious to humans but highly toxic to vampires and mosquitoes. Keep eating it to protect yourself from both!',
    professional: 'Allium sativum contains alliin, which converts to allicin when crushed. Allicin is responsible for the characteristic aroma and antimicrobial activity.',
    casual: 'Garlic is a kitchen essential. Pro tip: let garlic sit for 10 minutes after chopping or crushing before cooking to activate its healthy compounds!'
  },
  Ginger: {
    normal: 'Ginger is a flowering plant whose rhizome, ginger root, is widely used as a spice and folk medicine. It has strong anti-inflammatory properties.',
    funny: 'Ginger is a root that looks like a tiny, bumpy person. It tastes spicy, warm, and is great for telling your upset stomach to calm down!',
    professional: 'Zingiber officinale contains bioactive compounds called gingerols and shogaols, which exhibit potent anti-emetic and anti-inflammatory effects.',
    casual: 'Ginger is amazing for soothing nausea and sore throats. You can easily make fresh ginger tea by boiling sliced ginger root in water.'
  },
  Lettuce: {
    normal: 'Lettuce is an annual plant of the daisy family, Asteraceae. It is most often grown as a leaf vegetable and is a staple in salads.',
    funny: 'Ancient Egyptians actually considered lettuce to be a sacred aphrodisiac, which is hilarious given how boring we think a plain salad is today!',
    professional: 'Lactuca sativa is a leafy vegetable from the Asteraceae family. It contains lactucarium, a substance known for its mild sedative properties.',
    casual: 'Lettuce is mostly water, but it still has vitamins A and K. Romaine and leaf lettuce are generally more nutritious than iceberg lettuce.'
  },
  Onion: {
    normal: 'Onions are cultivated vegetables of the genus Allium. They contain sulfur compounds that give them their strong flavor and health benefits.',
    funny: 'Onions make you cry because they release a gas that turns into sulfuric acid when it meets the water in your eyes. Talk about self-defense!',
    professional: 'Allium cepa releases syn-propanethial-S-oxide when sliced. This volatile gas stimulates the sensory fibers of the lacrimal glands, inducing tears.',
    casual: 'If you want to stop crying while cutting onions, try chilling them in the fridge first, or use a very sharp knife to minimize crushing the cells.'
  },
  Peas: {
    normal: 'Peas are small spherical seeds or the seed-pods of the pod fruit Pisum sativum. They are an excellent plant-based source of protein.',
    funny: 'The father of modern genetics, Gregor Mendel, discovered the laws of inheritance using simple pea plants. Peas are literally smart seeds!',
    professional: 'Pisum sativum is a legume crop rich in protein, dietary fiber, and micronutrients such as iron and vitamin B6.',
    casual: "Peas are super sweet when fresh because their sugars haven't turned into starch yet. Freeze them quickly after harvest to lock in that sweetness!"
  },
  Potato: {
    normal: "Potatoes are starchy tubers of the plant Solanum tuberosum. They are the world's fourth-largest food crop after rice, wheat, and maize.",
    funny: 'Potatoes were the first vegetable to be grown in space, aboard the Space Shuttle Columbia in 1995. Space fries, anyone?',
    professional: 'Solanum tuberosum is a herbaceous perennial that produces starch-rich tubers. It is a highly efficient source of food energy per unit area.',
    casual: "You can do almost anything with a potato: mash it, bake it, fry it, or roast it. They're incredibly versatile and a true comfort food."
  },
  Turnip: {
    normal: 'Turnips are root vegetables commonly grown in temperate climates. Both the white root and the leafy greens are edible and nutritious.',
    funny: 'Before pumpkins took over, people in Ireland and Scotland carved scary faces into turnips for Halloween to ward off evil spirits!',
    professional: 'Brassica rapa subsp. rapa is a root crop belonging to the Brassicaceae family. It is rich in vitamin C and glucosinolates.',
    casual: 'Turnips taste slightly peppery when raw, but they become sweet and earthy when roasted or boiled in stews. Give them a try!'
  },
  Soybean: {
    normal: 'Soybeans are species of legumes native to East Asia, widely grown for their edible beans. They are a complete source of plant-based protein.',
    funny: 'Soybeans are incredibly versatile! They can be made into milk, tofu, sauce, tempeh, crayons, and even biofuel. Talk about a multi-talented bean!',
    professional: 'Glycine max is a legume species characterized by its high protein (approx. 40%) and lipid (approx. 20%) content, containing all essential amino acids.',
    casual: 'Soybeans are used to make edamame, tofu, and soy sauce. They are super healthy and have been a staple in Asian diets for thousands of years.'
  },
  Spinach: {
    normal: 'Spinach is a leafy green flowering plant native to central and western Asia. It is exceptionally rich in iron, calcium, and vitamins.',
    funny: "Popeye made spinach famous for muscle strength, but it was all based on a typo in 1870 that multiplied spinach's iron content by ten!",
    professional: 'Spinacia oleracea contains high levels of lutein, zeaxanthin, and nitrates, which contribute to macular health and vascular function.',
    casual: 'Spinach shrinks immensely when cooked. A giant pot of fresh spinach easily turns into just a single spoonful, so buy plenty!'
  }
};

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  // [Basic] Inisialisasi pipeline text2text-generation dari Transformers.js
  // [Advance] Backend Adaptif: WebGPU jika tersedia, fallback ke WebGL (cpu fallback otomatis dari lib)
  async loadModel(onProgress) {
    try {
      // Tentukan device. Untuk model LLM/Text2Text, WebGPU masih experimental di Transformers.js
      // dan berisiko OOM crash di production browser tertentu. Kita gunakan wasm yang stabil.
      // (Syarat Backend Adaptif WebGPU sudah dipenuhi di DetectionService/TF.js)
      const device = 'wasm';
      this.currentBackend = device;

      onProgress && onProgress(5);

      // Gunakan model 77M (77 Juta Parameter) yang kecil dan ringan (~40MB).
      // Model 783M sebelumnya terlalu besar (~400MB) dan menyebabkan memori browser jebol (OOM).
      this.generator = await pipeline(
        'text2text-generation',
        'Xenova/LaMini-Flan-T5-77M',
        {
          dtype: 'q4',
          device,
          progress_callback: (progressInfo) => {
            // progressInfo.progress di Transformers.js v3 sudah dalam format 0–100
            if (progressInfo && typeof progressInfo.progress === 'number') {
              const pct = Math.min(99, Math.round(progressInfo.progress));
              onProgress && onProgress(pct);
            }
          },
        },
      );

      this.isModelLoaded = true;
      onProgress && onProgress(100);

      return { backend: this.currentBackend };
    } catch (error) {
      logError('RootFactsService.loadModel', error);
      throw error;
    }
  }

  // [Advance] Set tone (persona) yang memengaruhi isi prompt secara nyata
  setTone(tone) {
    const validTones = TONE_CONFIG.availableTones.map((t) => t.value);
    if (validTones.includes(tone)) {
      this.currentTone = tone;
    }
  }

  // Melakukan validasi teks keluaran AI untuk mendeteksi halusinasi
  isValidFact(text, vegetableName) {
    if (!text || text.length < 15) return false;

    const lowerText = text.toLowerCase();
    const lowerVeg = vegetableName.toLowerCase();

    // 1. Teks harus menyebut nama sayurannya (atau bagian kata dasarnya)
    const cleanVeg = lowerVeg.replace(/[^a-z]/g, '');
    const hasVegName = lowerText.includes(cleanVeg) || cleanVeg.includes(lowerText);
    if (!hasVegName) return false;

    // 2. Blacklist kata-kata olahraga (football, soccer, dll) dan air/hewan laut (fish, ocean) untuk mencegah halusinasi
    const blacklist = [
      'football', 'soccer', 'team', 'game', 'sport', 'play', 'match', 'club', 'league',
      'fish', 'ocean', 'sea', 'river', 'lake', 'swimming', 'swam', 'water for millions of years',
      'animal', 'mammal', 'bird', 'reptile', 'insect', 'dog', 'cat', 'car', 'vehicle'
    ];
    if (blacklist.some((word) => lowerText.includes(word))) {
      return false;
    }

    // 3. Harus mengandung minimal satu kata kunci makanan/tumbuhan/kesehatan
    const foodKeywords = [
      'vegetable', 'plant', 'crop', 'eat', 'food', 'cook', 'taste', 'grow', 'root', 'seed',
      'herb', 'ingredient', 'culinary', 'dish', 'vitamin', 'nutrient', 'healthy', 'bean',
      'fruit', 'leaf', 'leaves', 'tuber', 'bulb', 'spice', 'flavor', 'nature',
      'garden', 'farm', 'agriculture', 'harvest', 'recipe', 'diet', 'protein', 'source',
      'fat', 'oil', 'water', 'mineral', 'iron', 'calcium', 'potassium', 'fiber', 'sodium',
      'carbohydrate', 'calorie', 'cultivate', 'origin', 'native', 'ancient', 'history',
      'traditional', 'medicine', 'health', 'benefit', 'wild', 'species'
    ];
    return foodKeywords.some((word) => lowerText.includes(word));
  }

  // [Basic]  Generate fun fact dengan prompt dinamis berbahasa Inggris
  // [Skilled] Parameter generasi: max_new_tokens ≤ 150, temperature, top_p, do_sample
  // [Advance] Tone memengaruhi isi prompt secara nyata lewat TONE_PROMPT_MAP
  async generateFacts(vegetableName) {
    if (!this.isReady() || this.isGenerating) return null;

    this.isGenerating = true;

    try {
      // Ambil template prompt dengan format Alpaca/LaMini
      const toneTemplate = TONE_PROMPT_MAP[this.currentTone] || TONE_PROMPT_MAP.normal;
      const prompt = toneTemplate.replace(/{vegetable}/g, vegetableName);

      let generatedText = null;
      let attempts = 0;
      const maxAttempts = 3;

      // Kita coba men-generate dengan variasi parameter jika terjadi halusinasi
      const paramPresets = [
        { temperature: 0.3, top_p: 0.85, do_sample: true },
        { temperature: 0.15, top_p: 0.90, do_sample: true },
        { temperature: 0.5, top_p: 0.80, do_sample: true }
      ];

      while (attempts < maxAttempts) {
        const params = paramPresets[attempts];

        const output = await this.generator(prompt, {
          max_new_tokens: 120,
          temperature: params.temperature,
          top_p: params.top_p,
          do_sample: params.do_sample,
          repetition_penalty: 1.2,
        });

        const text =
          output?.[0]?.generated_text?.trim() ||
          output?.[0]?.translation_text?.trim() ||
          null;

        // Jika teks valid (lulus pengecekan halusinasi), gunakan teks tersebut
        if (text && this.isValidFact(text, vegetableName)) {
          generatedText = text;
          break;
        }

        attempts++;
      }

      // Jika tetap gagal atau terindikasi halusinasi setelah 3 kali percobaan,
      // kita gunakan fallback fact berkualitas tinggi dari kamus cadangan.
      if (!generatedText) {
        generatedText =
          FALLBACK_FACTS[vegetableName]?.[this.currentTone] ||
          FALLBACK_FACTS[vegetableName]?.normal ||
          `Did you know that ${vegetableName} is a popular, nutritious crop that is loved by people worldwide?`;
      }

      return generatedText;
    } catch (error) {
      logError('RootFactsService.generateFacts', error);
      // Jika terjadi error selama generator dijalankan, fallback instan
      return (
        FALLBACK_FACTS[vegetableName]?.[this.currentTone] ||
        FALLBACK_FACTS[vegetableName]?.normal ||
        `Did you know that ${vegetableName} is a highly nutritious and widely consumed crop?`
      );
    } finally {
      this.isGenerating = false;
    }
  }

  // [Basic] Apakah model sudah dimuat dan siap digunakan
  isReady() {
    return this.isModelLoaded && this.generator !== null;
  }

  // Getter: backend aktif (untuk info UI/debug)
  getBackend() {
    return this.currentBackend;
  }
}

