CLASS_NAMES = [
    # APPLE
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___Powdery_mildew",
    "Apple___Fire_blight",
    "Apple___Alternaria_leaf_spot",
    "Apple___healthy",

    # BLUEBERRY
    "Blueberry___Anthracnose",
    "Blueberry___Leaf_rust",
    "Blueberry___Mummy_berry",
    "Blueberry___Powdery_mildew",
    "Blueberry___healthy",

    # CHERRY
    "Cherry___Powdery_mildew",
    "Cherry___Leaf_spot",
    "Cherry___Brown_rot",
    "Cherry___Bacterial_canker",
    "Cherry___healthy",

    # CORN
    "Corn___Cercospora_leaf_spot",
    "Corn___Common_rust",
    "Corn___Northern_Leaf_Blight",
    "Corn___Southern_Leaf_Blight",
    "Corn___Gray_leaf_spot",
    "Corn___Stewart_wilt",
    "Corn___healthy",

    # GRAPE
    "Grape___Black_rot",
    "Grape___Esca",
    "Grape___Leaf_blight",
    "Grape___Downy_mildew",
    "Grape___Powdery_mildew",
    "Grape___Anthracnose",
    "Grape___healthy",

    # ORANGE
    "Orange___Haunglongbing",
    "Orange___Citrus_canker",
    "Orange___Greasy_spot",
    "Orange___Melanose",
    "Orange___Black_spot",
    "Orange___healthy",

    # PEACH
    "Peach___Bacterial_spot",
    "Peach___Leaf_curl",
    "Peach___Brown_rot",
    "Peach___Scab",
    "Peach___healthy",

    # PEPPER
    "Pepper_bell___Bacterial_spot",
    "Pepper_bell___Anthracnose",
    "Pepper_bell___Phytophthora_blight",
    "Pepper_bell___Leaf_spot",
    "Pepper_bell___healthy",

    # POTATO
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___Black_scurf",
    "Potato___Common_scab",
    "Potato___Verticillium_wilt",
    "Potato___healthy",

    # RASPBERRY
    "Raspberry___Leaf_spot",
    "Raspberry___Anthracnose",
    "Raspberry___Rust",
    "Raspberry___healthy",

    # SOYBEAN
    "Soybean___Rust",
    "Soybean___Bacterial_blight",
    "Soybean___Frogeye_leaf_spot",
    "Soybean___Downy_mildew",
    "Soybean___healthy",

    # SQUASH
    "Squash___Powdery_mildew",
    "Squash___Downy_mildew",
    "Squash___Anthracnose",
    "Squash___Angular_leaf_spot",
    "Squash___healthy",

    # STRAWBERRY
    "Strawberry___Leaf_scorch",
    "Strawberry___Gray_mold",
    "Strawberry___Powdery_mildew",
    "Strawberry___Anthracnose",
    "Strawberry___healthy",

    # TOMATO
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___Fusarium_wilt",
    "Tomato___Verticillium_wilt",
    "Tomato___Anthracnose",
    "Tomato___Bacterial_wilt",
    "Tomato___Damping_off",
    "Tomato___healthy",

    # RICE
    "Rice___Blast",
    "Rice___Brown_spot",
    "Rice___Bacterial_leaf_blight",
    "Rice___Sheath_blight",
    "Rice___False_smut",
    "Rice___healthy",

    # WHEAT
    "Wheat___Leaf_rust",
    "Wheat___Stem_rust",
    "Wheat___Stripe_rust",
    "Wheat___Powdery_mildew",
    "Wheat___Septoria",
    "Wheat___healthy",

    # CASSAVA
    "Cassava___Bacterial_blight",
    "Cassava___Brown_streak_disease",
    "Cassava___Mosaic_disease",
    "Cassava___Anthracnose",
    "Cassava___healthy",

    # BANANA
    "Banana___Black_sigatoka",
    "Banana___Panama_disease",
    "Banana___Bacterial_wilt",
    "Banana___Moko_disease",
    "Banana___healthy",

    # MANGO
    "Mango___Anthracnose",
    "Mango___Powdery_mildew",
    "Mango___Bacterial_canker",
    "Mango___Sooty_mold",
    "Mango___healthy"
]


TREATMENTS = {
    # ── APPLE ────────────────────────────────────────────────────────────────
    "Apple_Apple_scab": {
        "symptoms": "Olive-green or brown scab-like spots on leaves and fruits.",
        "cause": "Fungal infection by Venturia inaequalis.",
        "treatment": "Apply myclobutanil or captan every 7–10 days during wet seasons.",
        "prevention": "Remove fallen leaves, improve air circulation, plant resistant varieties."
    },
    "Apple_Black_rot": {
        "symptoms": "Dark circular lesions on leaves; rotting, mummified fruits.",
        "cause": "Fungus Botryosphaeria obtusa.",
        "treatment": "Prune infected branches and spray sulfur-based fungicides.",
        "prevention": "Sanitize orchard debris and avoid bark wounds."
    },
    "Apple_Cedar_apple_rust": {
        "symptoms": "Bright orange-yellow spots on leaves; gelatinous spore horns in spring.",
        "cause": "Fungus Gymnosporangium juniperi-virginianae requiring cedar as alternate host.",
        "treatment": "Apply myclobutanil or mancozeb at bud break; remove nearby juniper/cedar hosts.",
        "prevention": "Plant resistant apple varieties; eliminate cedar trees within 1–2 miles where feasible."
    },
    "Apple_Powdery_mildew": {
        "symptoms": "White powdery coating on new leaves, shoots, and blossoms.",
        "cause": "Fungus Podosphaera leucotricha.",
        "treatment": "Apply sulfur or potassium bicarbonate sprays; prune infected shoots.",
        "prevention": "Improve airflow, avoid excessive nitrogen, plant resistant varieties."
    },
    "Apple_Fire_blight": {
        "symptoms": "Branches and blossoms appear water-soaked then scorched brown.",
        "cause": "Bacterium Erwinia amylovora.",
        "treatment": "Prune 8–12 inches below visible symptoms; apply copper bactericide.",
        "prevention": "Disinfect pruning tools between cuts; avoid excessive nitrogen fertilizer."
    },
    "Apple_Alternaria_leaf_spot": {
        "symptoms": "Small brown spots with yellow halos on leaves; premature defoliation.",
        "cause": "Fungus Alternaria mali.",
        "treatment": "Apply iprodione or mancozeb fungicides; remove fallen leaves.",
        "prevention": "Improve drainage, avoid wetting foliage, rotate fungicide classes."
    },
    "Apple_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── BLUEBERRY ────────────────────────────────────────────────────────────
    "Blueberry_Anthracnose": {
        "symptoms": "Sunken, water-soaked lesions on berries; pink spore masses in humid conditions.",
        "cause": "Fungus Colletotrichum acutatum.",
        "treatment": "Apply azoxystrobin or captan at bloom; remove infected berries.",
        "prevention": "Ensure good air circulation; avoid overhead irrigation."
    },
    "Blueberry_Leaf_rust": {
        "symptoms": "Yellow-orange pustules on leaf undersides; premature leaf drop.",
        "cause": "Fungus Naohidemyces vaccinii.",
        "treatment": "Apply myclobutanil or sulfur-based fungicides.",
        "prevention": "Remove infected leaves; plant resistant varieties."
    },
    "Blueberry_Mummy_berry": {
        "symptoms": "Shoots wilt and collapse in spring; berries shrivel to hard mummies.",
        "cause": "Fungus Monilinia vaccinii-corymbosi.",
        "treatment": "Apply iprodione or azoxystrobin at bud break; remove mummified berries from soil.",
        "prevention": "Rake and destroy mummies before bud break; mulch to prevent spore release."
    },
    "Blueberry_Powdery_mildew": {
        "symptoms": "White powdery patches on leaves; red discoloration of infected tissue.",
        "cause": "Fungus Microsphaera vaccinii.",
        "treatment": "Apply sulfur or trifloxystrobin fungicides.",
        "prevention": "Increase sunlight exposure and airflow between plants."
    },
    "Blueberry_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── CHERRY ───────────────────────────────────────────────────────────────
    "Cherry_Powdery_mildew": {
        "symptoms": "White powdery growth on leaves, shoots, and fruit surfaces.",
        "cause": "Fungus Podosphaera clandestina.",
        "treatment": "Apply sulfur or trifloxystrobin fungicides at first sign.",
        "prevention": "Prune for airflow; avoid high-nitrogen fertilization in late season."
    },
    "Cherry_Leaf_spot": {
        "symptoms": "Purple-red spots that turn brown on leaves; early defoliation.",
        "cause": "Fungus Blumeriella jaapii.",
        "treatment": "Apply chlorothalonil or myclobutanil after petal fall.",
        "prevention": "Remove and destroy fallen leaves; avoid overhead watering."
    },
    "Cherry_Brown_rot": {
        "symptoms": "Brown rotting of blossoms and fruit; gray spore tufts on infected tissue.",
        "cause": "Fungus Monilinia fructicola.",
        "treatment": "Apply iprodione or boscalid at bloom and pre-harvest.",
        "prevention": "Remove mummified fruits; improve air circulation with pruning."
    },
    "Cherry_Bacterial_canker": {
        "symptoms": "Sunken, gummy cankers on branches; blossom blast and leaf spotting.",
        "cause": "Bacterium Pseudomonas syringae.",
        "treatment": "Prune cankers during dry weather; apply copper bactericide in fall.",
        "prevention": "Avoid pruning in wet conditions; protect wounds with wound sealant."
    },
    "Cherry_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── CORN ─────────────────────────────────────────────────────────────────
    "Corn_Cercospora_leaf_spot": {
        "symptoms": "Small, tan rectangular lesions with dark borders between leaf veins.",
        "cause": "Fungus Cercospora zeae-maydis.",
        "treatment": "Apply azoxystrobin or pyraclostrobin fungicides at early tasseling.",
        "prevention": "Rotate crops; till under residue; plant tolerant hybrids."
    },
    "Corn_Common_rust": {
        "symptoms": "Reddish-brown pustules on both leaf surfaces.",
        "cause": "Fungus Puccinia sorghi.",
        "treatment": "Apply foliar fungicides such as propiconazole.",
        "prevention": "Plant resistant hybrids; monitor humidity levels."
    },
    "Corn_Northern_Leaf_Blight": {
        "symptoms": "Long, cigar-shaped gray-green to tan lesions on leaves.",
        "cause": "Fungus Exserohilum turcicum.",
        "treatment": "Apply azoxystrobin or propiconazole at first sign.",
        "prevention": "Rotate crops, remove crop residue, use resistant hybrids."
    },
    "Corn_Southern_Leaf_Blight": {
        "symptoms": "Small tan lesions with brown borders scattered across leaves.",
        "cause": "Fungus Cochliobolus heterostrophus.",
        "treatment": "Apply mancozeb or chlorothalonil fungicides.",
        "prevention": "Plant resistant varieties; rotate crops; reduce crop residue."
    },
    "Corn_Gray_leaf_spot": {
        "symptoms": "Rectangular gray to tan lesions with parallel edges, running between veins.",
        "cause": "Fungus Cercospora zeina.",
        "treatment": "Apply strobilurin or triazole fungicides; improve field drainage.",
        "prevention": "Rotate crops; till residue; use resistant hybrids."
    },
    "Corn_Stewart_wilt": {
        "symptoms": "Pale green-yellow streaks on leaves early season; later wilting and stalk rot.",
        "cause": "Bacterium Pantoea stewartii, transmitted by corn flea beetle.",
        "treatment": "No curative treatment; remove severely infected plants.",
        "prevention": "Plant resistant hybrids; control flea beetle populations with insecticides."
    },
    "Corn_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── GRAPE ────────────────────────────────────────────────────────────────
    "Grape_Black_rot": {
        "symptoms": "Brown leaf spots with dark borders; shriveled black mummified fruits.",
        "cause": "Fungus Guignardia bidwellii.",
        "treatment": "Apply mancozeb or myclobutanil from early shoot growth through fruit set.",
        "prevention": "Remove mummies; prune vines for airflow; destroy infected debris."
    },
    "Grape_Esca": {
        "symptoms": "Tiger-stripe leaf discoloration; internal wood browning; vine decline.",
        "cause": "Complex of wood-rotting fungi including Phaeomoniella chlamydospora.",
        "treatment": "Prune out affected wood well below discolored tissue; protect wounds.",
        "prevention": "Make clean pruning cuts; apply wound protectants; avoid large pruning wounds."
    },
    "Grape_Leaf_blight": {
        "symptoms": "Irregular brown blotches on leaves; premature defoliation.",
        "cause": "Fungus Pseudocercospora vitis.",
        "treatment": "Apply mancozeb or captan fungicides; remove infected leaves.",
        "prevention": "Improve air circulation; avoid overhead irrigation."
    },
    "Grape_Downy_mildew": {
        "symptoms": "Yellow oily spots on leaf tops; white fluffy growth on undersides.",
        "cause": "Oomycete Plasmopara viticola.",
        "treatment": "Apply copper-based fungicides or metalaxyl at first sign.",
        "prevention": "Avoid excessive irrigation; improve canopy ventilation."
    },
    "Grape_Powdery_mildew": {
        "symptoms": "White powdery coating on leaves, shoots, and berries.",
        "cause": "Fungus Erysiphe necator.",
        "treatment": "Apply sulfur or myclobutanil sprays; remove heavily infected shoots.",
        "prevention": "Maintain open canopy; avoid shaded, humid conditions."
    },
    "Grape_Anthracnose": {
        "symptoms": "Dark sunken lesions with gray centers on berries, leaves, and shoots.",
        "cause": "Fungus Elsinoe ampelina.",
        "treatment": "Apply mancozeb or captan at bud break and throughout season.",
        "prevention": "Prune infected canes; destroy debris; use resistant varieties."
    },
    "Grape_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── ORANGE ───────────────────────────────────────────────────────────────
    "Orange_Haunglongbing": {
        "symptoms": "Asymmetric yellowing of leaves (blotchy mottle); lopsided, bitter fruit.",
        "cause": "Bacterium Candidatus Liberibacter asiaticus, spread by Asian citrus psyllid.",
        "treatment": "No cure; remove and destroy infected trees promptly.",
        "prevention": "Control psyllid populations with insecticides; use certified disease-free nursery stock."
    },
    "Orange_Citrus_canker": {
        "symptoms": "Raised corky lesions with yellow halos on leaves, stems, and fruit.",
        "cause": "Bacterium Xanthomonas citri subsp. citri.",
        "treatment": "Apply copper bactericides; prune and destroy infected tissue.",
        "prevention": "Avoid working in wet orchards; use windbreaks; quarantine new plants."
    },
    "Orange_Greasy_spot": {
        "symptoms": "Yellow-brown blister spots on leaf undersides; premature leaf drop.",
        "cause": "Fungus Mycosphaerella citri.",
        "treatment": "Apply copper or oil-based sprays in summer.",
        "prevention": "Remove fallen leaves; maintain tree vigor with balanced fertilization."
    },
    "Orange_Melanose": {
        "symptoms": "Small, dark, rough-surfaced specks on leaves, twigs, and fruit.",
        "cause": "Fungus Diaporthe citri.",
        "treatment": "Apply copper fungicides after petal fall.",
        "prevention": "Prune dead wood where the fungus overwinters; maintain tree health."
    },
    "Orange_Black_spot": {
        "symptoms": "Red or black spots on fruit rind; leaf lesions with yellow halos.",
        "cause": "Fungus Phyllosticta citricarpa.",
        "treatment": "Apply copper or mancozeb fungicides from petal fall through fruit development.",
        "prevention": "Remove fallen fruit and leaves; avoid overhead irrigation."
    },
    "Orange_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── PEACH ────────────────────────────────────────────────────────────────
    "Peach_Bacterial_spot": {
        "symptoms": "Small water-soaked spots on leaves turning angular and brown; fruit cracking.",
        "cause": "Bacterium Xanthomonas arboricola pv. pruni.",
        "treatment": "Apply copper bactericides from pink bud through cover sprays.",
        "prevention": "Plant in sheltered sites; use resistant varieties; avoid overhead irrigation."
    },
    "Peach_Leaf_curl": {
        "symptoms": "Leaves pucker and curl; reddish blisters; defoliation in severe cases.",
        "cause": "Fungus Taphrina deformans.",
        "treatment": "Apply copper or chlorothalonil fungicide once in late fall or early spring before bud swell.",
        "prevention": "A single well-timed dormant spray provides season-long protection."
    },
    "Peach_Brown_rot": {
        "symptoms": "Brown rotting blossoms and fruit; gray sporulating tufts; twig cankers.",
        "cause": "Fungus Monilinia fructicola.",
        "treatment": "Apply iprodione or boscalid at bloom and pre-harvest.",
        "prevention": "Remove mummies and infected twigs; improve air circulation."
    },
    "Peach_Scab": {
        "symptoms": "Small, olive-green to black spots on fruit surface; cracking in severe cases.",
        "cause": "Fungus Cladosporium carpophilum.",
        "treatment": "Apply myclobutanil or captan starting at petal fall.",
        "prevention": "Prune for good air circulation; thin fruit to reduce humidity."
    },
    "Peach_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── PEPPER ───────────────────────────────────────────────────────────────
    "Pepper_bell_Bacterial_spot": {
        "symptoms": "Water-soaked, dark lesions on leaves and fruit with yellow halos.",
        "cause": "Bacterium Xanthomonas euvesicatoria.",
        "treatment": "Apply copper bactericides; remove infected plant material.",
        "prevention": "Use certified disease-free seed; avoid overhead irrigation; rotate crops."
    },
    "Pepper_bell_Anthracnose": {
        "symptoms": "Sunken, water-soaked lesions on fruit turning dark with salmon spore masses.",
        "cause": "Fungus Colletotrichum capsici.",
        "treatment": "Apply azoxystrobin or mancozeb fungicides; harvest promptly.",
        "prevention": "Use disease-free seed; avoid wounding fruit; improve drainage."
    },
    "Pepper_bell_Phytophthora_blight": {
        "symptoms": "Water-soaked stem lesions; rapid plant collapse; fruit and root rot.",
        "cause": "Oomycete Phytophthora capsici.",
        "treatment": "Apply metalaxyl or mefenoxam; improve field drainage immediately.",
        "prevention": "Avoid low-lying areas; rotate with non-host crops for 3+ years."
    },
    "Pepper_bell_Leaf_spot": {
        "symptoms": "Circular brown spots with yellow borders on leaves; defoliation.",
        "cause": "Fungus Cercospora capsici.",
        "treatment": "Apply copper or mancozeb fungicides at first sign.",
        "prevention": "Rotate crops; remove infected debris; avoid overhead irrigation."
    },
    "Pepper_bell_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── POTATO ───────────────────────────────────────────────────────────────
    "Potato_Early_blight": {
        "symptoms": "Brown concentric target-like spots on lower, older leaves.",
        "cause": "Fungus Alternaria solani.",
        "treatment": "Apply chlorothalonil or mancozeb fungicides; rotate crops.",
        "prevention": "Avoid overhead watering; remove infected foliage; maintain plant vigor."
    },
    "Potato_Late_blight": {
        "symptoms": "Water-soaked, dark lesions on leaves; white mold on undersides; rapid collapse.",
        "cause": "Oomycete Phytophthora infestans.",
        "treatment": "Destroy infected plants immediately; apply metalaxyl or chlorothalonil.",
        "prevention": "Plant resistant varieties; improve drainage; avoid overhead irrigation."
    },
    "Potato_Black_scurf": {
        "symptoms": "Black, irregular sclerotia on tuber skin; stem cankers and stunted sprouts.",
        "cause": "Fungus Rhizoctonia solani.",
        "treatment": "Use certified seed; apply thiabendazole as seed treatment.",
        "prevention": "Plant in warm soil; avoid deep planting; rotate crops."
    },
    "Potato_Common_scab": {
        "symptoms": "Rough, corky, raised or pitted lesions on tuber skin.",
        "cause": "Bacterium Streptomyces scabies.",
        "treatment": "Maintain soil pH between 5.0–5.2; ensure adequate soil moisture at tuber set.",
        "prevention": "Use certified disease-free seed potatoes; avoid liming soil before planting."
    },
    "Potato_Verticillium_wilt": {
        "symptoms": "Yellowing and wilting of lower leaves; brown discoloration inside stems.",
        "cause": "Fungus Verticillium dahliae.",
        "treatment": "No curative treatment; remove and destroy infected plants.",
        "prevention": "Rotate with non-host crops for 3–4 years; plant certified seed; avoid over-irrigation."
    },
    "Potato_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── RASPBERRY ────────────────────────────────────────────────────────────
    "Raspberry_Leaf_spot": {
        "symptoms": "Small purple spots with white centers on leaves; defoliation in severe cases.",
        "cause": "Fungus Sphaerulina rubi.",
        "treatment": "Apply myclobutanil or copper fungicides after harvest.",
        "prevention": "Remove old canes after harvest; improve row spacing for airflow."
    },
    "Raspberry_Anthracnose": {
        "symptoms": "Sunken gray spots with purple borders on canes; small spots on leaves and fruit.",
        "cause": "Fungus Elsinoe veneta.",
        "treatment": "Apply lime sulfur during dormancy; apply captan during the growing season.",
        "prevention": "Remove old infected canes; avoid overhead irrigation."
    },
    "Raspberry_Rust": {
        "symptoms": "Yellow spots on upper leaf surfaces; orange spore pustules on undersides.",
        "cause": "Fungus Phragmidium rubi-idaei.",
        "treatment": "Apply myclobutanil or sulfur at first sign of infection.",
        "prevention": "Remove infected leaves; improve air circulation; plant resistant varieties."
    },
    "Raspberry_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── SOYBEAN ──────────────────────────────────────────────────────────────
    "Soybean_Rust": {
        "symptoms": "Tan to brown angular lesions on leaves; powdery spore masses on undersides.",
        "cause": "Fungus Phakopsora pachyrhizi.",
        "treatment": "Apply triazole or strobilurin fungicides at first detection.",
        "prevention": "Monitor fields regularly; plant early-maturing varieties to escape peak infection."
    },
    "Soybean_Bacterial_blight": {
        "symptoms": "Water-soaked angular spots turning brown with yellow halos; shredded leaves.",
        "cause": "Bacterium Pseudomonas savastanoi pv. glycinea.",
        "treatment": "No effective curative treatment; apply copper bactericides to limit spread.",
        "prevention": "Use certified seed; rotate crops; avoid working in wet fields."
    },
    "Soybean_Frogeye_leaf_spot": {
        "symptoms": "Circular gray spots with reddish-brown borders on leaves.",
        "cause": "Fungus Cercospora sojina.",
        "treatment": "Apply azoxystrobin or pyraclostrobin fungicides.",
        "prevention": "Rotate crops; use resistant varieties; avoid dense plant canopy."
    },
    "Soybean_Downy_mildew": {
        "symptoms": "Pale green-yellow spots on upper leaves; gray fluffy growth on undersides.",
        "cause": "Oomycete Peronospora manshurica.",
        "treatment": "Apply metalaxyl-based seed treatments; foliar copper can limit spread.",
        "prevention": "Use certified seed; improve field drainage; rotate crops."
    },
    "Soybean_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── SQUASH ───────────────────────────────────────────────────────────────
    "Squash_Powdery_mildew": {
        "symptoms": "White powdery patches on leaf surfaces; leaves yellow and die.",
        "cause": "Fungus Podosphaera xanthii.",
        "treatment": "Apply potassium bicarbonate, sulfur, or trifloxystrobin sprays.",
        "prevention": "Increase sunlight and airflow; avoid overhead irrigation."
    },
    "Squash_Downy_mildew": {
        "symptoms": "Angular yellow spots on upper leaf surfaces; gray-purple spores below.",
        "cause": "Oomycete Pseudoperonospora cubensis.",
        "treatment": "Apply chlorothalonil or metalaxyl fungicides at first sign.",
        "prevention": "Improve drainage and air circulation; avoid evening irrigation."
    },
    "Squash_Anthracnose": {
        "symptoms": "Water-soaked lesions on leaves and fruit turning brown with pink spore masses.",
        "cause": "Fungus Colletotrichum orbiculare.",
        "treatment": "Apply azoxystrobin or mancozeb fungicides; remove infected fruits.",
        "prevention": "Avoid overhead irrigation; rotate crops; use disease-free seed."
    },
    "Squash_Angular_leaf_spot": {
        "symptoms": "Angular water-soaked spots bounded by leaf veins; lesions turn white and papery.",
        "cause": "Bacterium Pseudomonas syringae pv. lachrymans.",
        "treatment": "Apply copper bactericides; remove infected leaves.",
        "prevention": "Use certified disease-free seed; avoid working in wet conditions."
    },
    "Squash_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── STRAWBERRY ───────────────────────────────────────────────────────────
    "Strawberry_Leaf_scorch": {
        "symptoms": "Small purple spots that enlarge to blotchy brown lesions; leaf margins die.",
        "cause": "Fungus Diplocarpon earlianum.",
        "treatment": "Apply myclobutanil or captan fungicides after harvest and in early spring.",
        "prevention": "Remove old leaves; avoid overhead irrigation; improve plant spacing."
    },
    "Strawberry_Gray_mold": {
        "symptoms": "Brown soft rot on fruit covered with gray fuzzy spore masses.",
        "cause": "Fungus Botrytis cinerea.",
        "treatment": "Apply iprodione or boscalid fungicides at flowering; remove infected fruit.",
        "prevention": "Improve airflow; avoid excessive moisture; harvest frequently."
    },
    "Strawberry_Powdery_mildew": {
        "symptoms": "White powdery growth on leaf undersides; upward curling of leaf edges.",
        "cause": "Fungus Podosphaera aphanis.",
        "treatment": "Apply sulfur or myclobutanil sprays.",
        "prevention": "Avoid dense planting; increase airflow and sunlight exposure."
    },
    "Strawberry_Anthracnose": {
        "symptoms": "Sunken, dark lesions on fruit; crown rot leading to sudden plant collapse.",
        "cause": "Fungus Colletotrichum acutatum.",
        "treatment": "Apply azoxystrobin fungicides; remove infected plants and fruit.",
        "prevention": "Use certified transplants; avoid overhead irrigation; rotate planting sites."
    },
    "Strawberry_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── TOMATO ───────────────────────────────────────────────────────────────
    "Tomato_Bacterial_spot": {
        "symptoms": "Small, dark water-soaked lesions on leaves and fruit with yellow halos.",
        "cause": "Bacterium Xanthomonas vesicatoria.",
        "treatment": "Apply copper bactericides; remove infected plant material.",
        "prevention": "Use certified seed; avoid overhead irrigation; rotate crops."
    },
    "Tomato_Early_blight": {
        "symptoms": "Dark spots with concentric target-like rings on older leaves.",
        "cause": "Fungus Alternaria solani.",
        "treatment": "Apply copper fungicides or chlorothalonil; mulch to prevent soil splash.",
        "prevention": "Rotate crops; avoid wet foliage; stake plants for airflow."
    },
    "Tomato_Late_blight": {
        "symptoms": "Rapid dark lesions on leaves and fruit; white mold in humid conditions.",
        "cause": "Oomycete Phytophthora infestans.",
        "treatment": "Apply chlorothalonil or metalaxyl; remove and destroy infected plants.",
        "prevention": "Ensure proper spacing; avoid excessive humidity; use resistant varieties."
    },
    "Tomato_Leaf_Mold": {
        "symptoms": "Yellow patches on leaf surfaces; olive-green to gray mold on undersides.",
        "cause": "Fungus Passalora fulva.",
        "treatment": "Improve greenhouse ventilation; apply mancozeb or copper fungicides.",
        "prevention": "Avoid overcrowding; reduce humidity; prune lower leaves."
    },
    "Tomato_Septoria_leaf_spot": {
        "symptoms": "Numerous small circular spots with gray centers and dark borders.",
        "cause": "Fungus Septoria lycopersici.",
        "treatment": "Remove infected leaves; apply copper or chlorothalonil fungicides.",
        "prevention": "Water at plant base; rotate crops annually; remove crop debris."
    },
    "Tomato_Spider_mites": {
        "symptoms": "Tiny yellow speckles on leaves; fine webbing; leaves bronze and die.",
        "cause": "Infestation by Tetranychus urticae (two-spotted spider mite).",
        "treatment": "Spray neem oil, insecticidal soap, or abamectin; repeat every 7 days.",
        "prevention": "Maintain adequate humidity; avoid dusty conditions; introduce predatory mites."
    },
    "Tomato_Target_Spot": {
        "symptoms": "Brown circular lesions with concentric rings and yellow halos on leaves and fruit.",
        "cause": "Fungus Corynespora cassiicola.",
        "treatment": "Apply azoxystrobin or chlorothalonil fungicides.",
        "prevention": "Improve air circulation; avoid leaf wetness; rotate crops."
    },
    "Tomato_Tomato_Yellow_Leaf_Curl_Virus": {
        "symptoms": "Upward leaf curling, yellowing, and stunted growth; reduced fruit set.",
        "cause": "Tomato yellow leaf curl virus (TYLCV) spread by whiteflies.",
        "treatment": "Remove and destroy infected plants; control whitefly populations with insecticides.",
        "prevention": "Use reflective mulch; plant resistant varieties; install insect exclusion netting."
    },
    "Tomato_Tomato_mosaic_virus": {
        "symptoms": "Mottled green and yellow mosaic leaf patterns; distorted fruit.",
        "cause": "Tomato mosaic virus (ToMV).",
        "treatment": "Remove infected plants immediately; there is no chemical cure.",
        "prevention": "Sterilize tools; avoid tobacco contamination; use resistant varieties."
    },
    "Tomato_Fusarium_wilt": {
        "symptoms": "Yellowing and wilting starting on one side; brown vascular discoloration inside stem.",
        "cause": "Fungus Fusarium oxysporum f. sp. lycopersici.",
        "treatment": "Remove infected plants; apply soil drenches with thiophanate-methyl.",
        "prevention": "Rotate crops; sterilize soil; plant Fusarium-resistant varieties."
    },
    "Tomato_Verticillium_wilt": {
        "symptoms": "V-shaped yellow lesions on leaves; wilting during hot hours; internal stem browning.",
        "cause": "Fungus Verticillium dahliae.",
        "treatment": "No curative treatment; remove infected plants.",
        "prevention": "Rotate crops for 3–4 years; plant resistant varieties; avoid over-watering."
    },
    "Tomato_Anthracnose": {
        "symptoms": "Sunken, water-soaked circular spots on ripe fruit enlarging to dark lesions.",
        "cause": "Fungus Colletotrichum coccodes.",
        "treatment": "Apply azoxystrobin or mancozeb; harvest fruit before over-ripening.",
        "prevention": "Avoid overhead irrigation; rotate crops; remove infected debris."
    },
    "Tomato_Bacterial_wilt": {
        "symptoms": "Rapid wilting of entire plant without yellowing; slimy bacterial ooze in cut stems.",
        "cause": "Bacterium Ralstonia solanacearum.",
        "treatment": "No effective chemical control; remove and destroy infected plants immediately.",
        "prevention": "Use resistant varieties; improve soil drainage; avoid soil contamination between plants."
    },
    "Tomato_Damping_off": {
        "symptoms": "Seedling stem rots at soil level; collapse and death of young plants.",
        "cause": "Soil-borne fungi and oomycetes (Pythium, Rhizoctonia, Fusarium).",
        "treatment": "Apply metalaxyl or thiram seed treatment; improve drainage.",
        "prevention": "Use sterile growing medium; avoid overwatering seedlings; ensure good ventilation."
    },
    "Tomato_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── RICE ─────────────────────────────────────────────────────────────────
    "Rice_Blast": {
        "symptoms": "Diamond-shaped lesions with gray centers and brown borders on leaves; neck rot.",
        "cause": "Fungus Magnaporthe oryzae.",
        "treatment": "Apply tricyclazole or isoprothiolane fungicides at first sign.",
        "prevention": "Use resistant varieties; balanced nitrogen fertilization; avoid dense planting."
    },
    "Rice_Brown_spot": {
        "symptoms": "Oval to circular brown lesions with gray centers on leaves and grains.",
        "cause": "Fungus Bipolaris oryzae.",
        "treatment": "Apply mancozeb or iprodione fungicides; improve soil nutrition.",
        "prevention": "Use balanced fertilization; plant healthy certified seed; improve drainage."
    },
    "Rice_Bacterial_leaf_blight": {
        "symptoms": "Water-soaked to yellow stripe along leaf margins progressing to complete leaf blight.",
        "cause": "Bacterium Xanthomonas oryzae pv. oryzae.",
        "treatment": "Apply copper bactericides; drain and dry fields temporarily.",
        "prevention": "Avoid excessive nitrogen fertilizer; use resistant varieties; clean irrigation water."
    },
    "Rice_Sheath_blight": {
        "symptoms": "Oval gray-green lesions on leaf sheaths; lesions with brown borders.",
        "cause": "Fungus Rhizoctonia solani.",
        "treatment": "Apply hexaconazole or propiconazole fungicides at early tillering.",
        "prevention": "Avoid dense planting; reduce nitrogen; improve drainage."
    },
    "Rice_False_smut": {
        "symptoms": "Individual grains replaced by orange-yellow to greenish-black spore balls.",
        "cause": "Fungus Ustilaginoidea virens.",
        "treatment": "Apply propiconazole or tebuconazole at booting to heading stage.",
        "prevention": "Use certified seed; avoid excessive nitrogen; plant resistant varieties."
    },
    "Rice_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── WHEAT ────────────────────────────────────────────────────────────────
    "Wheat_Leaf_rust": {
        "symptoms": "Small, round orange-brown pustules scattered on leaf surfaces.",
        "cause": "Fungus Puccinia triticina.",
        "treatment": "Apply propiconazole or tebuconazole fungicides at first sign.",
        "prevention": "Plant resistant varieties; monitor fields regularly; destroy volunteer wheat."
    },
    "Wheat_Stem_rust": {
        "symptoms": "Brick-red, elongated pustules on stems and leaf sheaths; severe lodging.",
        "cause": "Fungus Puccinia graminis f. sp. tritici.",
        "treatment": "Apply triazole fungicides immediately; resistant varieties are most effective.",
        "prevention": "Eradicate barberry (alternate host); grow resistant varieties."
    },
    "Wheat_Stripe_rust": {
        "symptoms": "Yellow pustules arranged in stripes along leaves; cool-weather disease.",
        "cause": "Fungus Puccinia striiformis f. sp. tritici.",
        "treatment": "Apply propiconazole or azoxystrobin at flag leaf stage.",
        "prevention": "Plant resistant varieties; early sowing; monitor in cool, wet conditions."
    },
    "Wheat_Powdery_mildew": {
        "symptoms": "White, powdery patches on leaves, stems, and heads.",
        "cause": "Fungus Blumeria graminis f. sp. tritici.",
        "treatment": "Apply triazole or strobilurin fungicides at first sign.",
        "prevention": "Avoid high nitrogen fertilization; plant resistant varieties; improve spacing."
    },
    "Wheat_Septoria": {
        "symptoms": "Tan lesions with dark borders and black pycnidia on leaves; blotchy appearance.",
        "cause": "Fungus Zymoseptoria tritici.",
        "treatment": "Apply propiconazole or azoxystrobin at flag leaf emergence.",
        "prevention": "Rotate crops; use resistant varieties; plow under infected residue."
    },
    "Wheat_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── CASSAVA ──────────────────────────────────────────────────────────────
    "Cassava_Bacterial_blight": {
        "symptoms": "Angular water-soaked leaf spots; wilting and stem dieback; gummy exudate.",
        "cause": "Bacterium Xanthomonas phaseoli pv. manihotis.",
        "treatment": "Remove and destroy infected plants; apply copper bactericides to reduce spread.",
        "prevention": "Use disease-free stem cuttings; rotate crops; avoid intercropping with susceptible hosts."
    },
    "Cassava_Brown_streak_disease": {
        "symptoms": "Yellow-brown streaks on leaves; brown necrotic patches in root flesh.",
        "cause": "Cassava brown streak virus (CBSV) spread by whiteflies.",
        "treatment": "No curative treatment; remove infected plants promptly.",
        "prevention": "Use certified virus-free cuttings; control whitefly populations."
    },
    "Cassava_Mosaic_disease": {
        "symptoms": "Mosaic leaf discoloration (yellow-green mottling); distorted, stunted leaves.",
        "cause": "Cassava mosaic virus (CMV) spread by whiteflies.",
        "treatment": "Remove infected plants; there is no chemical cure.",
        "prevention": "Use virus-free cuttings; control whiteflies with insecticides or reflective mulch."
    },
    "Cassava_Anthracnose": {
        "symptoms": "Dark lesions on stems and petioles; die-back of shoot tips.",
        "cause": "Fungus Colletotrichum gloeosporioides.",
        "treatment": "Apply mancozeb or copper fungicides; prune affected stems.",
        "prevention": "Use disease-free planting material; avoid wounding stems during cultivation."
    },
    "Cassava_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── BANANA ───────────────────────────────────────────────────────────────
    "Banana_Black_sigatoka": {
        "symptoms": "Dark brown streaks on leaves enlarging to necrotic patches; premature ripening.",
        "cause": "Fungus Mycosphaerella fijiensis.",
        "treatment": "Apply systemic fungicides (propiconazole, tridemorph); remove infected leaves.",
        "prevention": "Ensure proper field sanitation; improve drainage; use resistant varieties."
    },
    "Banana_Panama_disease": {
        "symptoms": "Yellowing and wilting of outer leaves; brown vascular discoloration inside pseudostem.",
        "cause": "Fungus Fusarium oxysporum f. sp. cubense.",
        "treatment": "No effective chemical cure; destroy infected plants and avoid replanting susceptible varieties.",
        "prevention": "Plant TR4-resistant varieties; use clean planting material; prevent soil movement."
    },
    "Banana_Bacterial_wilt": {
        "symptoms": "Yellowing leaves; premature ripening; yellow bacterial ooze in cut stems.",
        "cause": "Bacterium Xanthomonas vasicola pv. musacearum.",
        "treatment": "Cut and destroy infected plants; disinfect tools between plants.",
        "prevention": "Use clean planting material; control insect vectors; remove male flower buds early."
    },
    "Banana_Moko_disease": {
        "symptoms": "Internal brown discoloration of fruit and pseudostem; plant collapse.",
        "cause": "Bacterium Ralstonia solanacearum.",
        "treatment": "Destroy infected plants with herbicide injection; disinfect tools and equipment.",
        "prevention": "Use clean planting material; control insect vectors; avoid soil contamination."
    },
    "Banana_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── MANGO ────────────────────────────────────────────────────────────────
    "Mango_Anthracnose": {
        "symptoms": "Dark, sunken lesions on flowers, leaves, and fruit; post-harvest fruit rot.",
        "cause": "Fungus Colletotrichum gloeosporioides.",
        "treatment": "Apply copper or mancozeb fungicides from flowering through fruit development.",
        "prevention": "Prune for airflow; avoid overhead irrigation; harvest carefully to prevent wounds."
    },
    "Mango_Powdery_mildew": {
        "symptoms": "White powdery patches on inflorescences, young leaves, and fruit.",
        "cause": "Fungus Oidium mangiferae.",
        "treatment": "Apply sulfur or myclobutanil sprays at flowering.",
        "prevention": "Maintain open canopy; avoid excessive nitrogen; monitor during dry weather."
    },
    "Mango_Bacterial_canker": {
        "symptoms": "Water-soaked lesions with yellow halos on leaves; raised cankers on stems and fruit.",
        "cause": "Bacterium Xanthomonas campestris pv. mangiferaeindicae.",
        "treatment": "Prune and destroy infected tissue; apply copper bactericides.",
        "prevention": "Use disease-free nursery stock; avoid pruning during wet weather."
    },
    "Mango_Sooty_mold": {
        "symptoms": "Black sooty coating on leaves and fruit surfaces reducing photosynthesis.",
        "cause": "Secondary fungal growth (Capnodium spp.) feeding on honeydew from sap-sucking insects.",
        "treatment": "Control scale insects and mealybugs with horticultural oil; wash off sooty mold.",
        "prevention": "Manage sap-sucking insect populations; improve airflow in canopy."
    },
    "Mango_healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    },

    # ── FALLBACK ─────────────────────────────────────────────────────────────
    "healthy": {
        "symptoms": "No visible disease symptoms.",
        "cause": "Healthy plant condition.",
        "treatment": "Continue regular watering, fertilization, and monitoring.",
        "prevention": "Maintain good agricultural practices and inspect regularly."
    }
}
