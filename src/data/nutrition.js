// Datos de nutrición: alimentos, menús de base, estrategias y niveles de actividad.
// Son datos genéricos (no de una persona): las cantidades de cada menú se escalan
// según el perfil y los objetivos que cada uno carga en la app.

/**
 * Alimentos por 100 g (o 100 ml si `ml`). Valores de ARGENFOODS (UNLu) para carnes, pescado,
 * lácteos, cereales y verduras; USDA para pollo, huevo, atún y fideos; etiqueta para el yogur proteico.
 * g: grupo de equivalencias (prot, carb, fat; otro y veg no se escalan ni se intercambian).
 * sg: subgrupo, para sugerir primero reemplazos parecidos. st: estado del peso (crudo, seco, escurrido).
 * cook: rinde aproximado al cocinar. u: [gramos por unidad, singular, plural].
 */
export const FOODS = {
  pollo:{sg:"carne", n:"Pechuga de pollo", st:"crudo", g:"prot", k:120, p:22.5, c:0, f:2.6},
  nalga:{sg:"carne", n:"Nalga", alt:"o cuadrada, peceto, lomo", st:"crudo", g:"prot", k:112, p:21.2, c:0, f:3},
  merluza:{sg:"carne", n:"Merluza", st:"crudo", g:"prot", k:80, p:17.1, c:0, f:1.3},
  atun:{sg:"carne", n:"Atún al agua", st:"escurrido", g:"prot", k:116, p:25.5, c:0, f:0.8},
  huevo:{sg:"huevo", n:"Huevo", g:"prot", k:143, p:12.6, c:0.7, f:9.5, u:[50,"huevo","huevos"]},
  clara:{sg:"huevo", n:"Clara de huevo", g:"prot", k:52, p:10.9, c:0.7, f:0.2, u:[33,"clara","claras"]},
  untable:{sg:"lacteo", n:"Queso untable descremado", g:"prot", k:82, p:13.7, c:6.1, f:0.3},
  ricota:{sg:"lacteo", n:"Ricota entera", g:"prot", k:160, p:11.6, c:3, f:11.8},
  yogur:{sg:"lacteo", n:"Yogur alto en proteína", g:"prot", k:76, p:8.6, c:8, f:1.1, u:[175,"pote","potes"]},
  whey:{sg:"lacteo", n:"Proteína whey", g:"prot", k:400, p:80, c:8.3, f:5, u:[30,"scoop","scoops"]},
  arroz:{sg:"almidon", n:"Arroz blanco", st:"crudo", cook:3, g:"carb", k:345, p:6.9, c:79.2, f:0.5},
  fideos:{sg:"almidon", n:"Fideos", st:"seco", cook:2.3, g:"carb", k:371, p:13, c:74.7, f:1.5},
  lenteja:{sg:"almidon", n:"Lentejas", st:"seco", cook:2.5, g:"carb", k:340, p:20.8, c:64.8, f:1.1},
  avena:{sg:"almidon", n:"Avena arrollada", g:"carb", k:382, p:15.6, c:62.5, f:7.5},
  pan:{sg:"almidon", n:"Pan francés", g:"carb", k:269, p:9.3, c:57.4, f:0.3},
  papa:{sg:"almidon", n:"Papa", st:"crudo", g:"carb", k:86, p:2, c:19.3, f:0.1},
  batata:{sg:"almidon", n:"Batata", st:"crudo", g:"carb", k:84, p:1.4, c:19.8, f:0.1},
  galleta:{sg:"almidon", n:"Galletas de arroz", g:"carb", k:387, p:8, c:81, f:2.8, u:[9,"galleta de arroz","galletas de arroz"]},
  banana:{sg:"fruta", n:"Banana", g:"carb", k:89, p:1.1, c:22.8, f:0.3, u:[120,"banana","bananas"]},
  manzana:{sg:"fruta", n:"Manzana", g:"carb", k:52, p:0.3, c:13.8, f:0.2, u:[180,"manzana","manzanas"]},
  jugo:{sg:"fruta", n:"Jugo de naranja exprimido", g:"carb", k:45, p:0.7, c:10.4, f:0.2, ml:1},
  miel:{sg:"dulce", n:"Miel", g:"carb", k:304, p:0.3, c:82.4, f:0},
  ddl:{sg:"dulce", n:"Dulce de leche", g:"carb", k:315, p:6.5, c:57.4, f:6.5},
  mermelada:{sg:"dulce", n:"Mermelada light", g:"carb", k:100, p:0.3, c:25, f:0.1},
  aceite:{sg:"grasa", n:"Aceite de oliva o de girasol", g:"fat", k:884, p:0, c:0, f:100},
  palta:{sg:"grasa", n:"Palta", g:"fat", k:160, p:2, c:8.5, f:14.7},
  mani:{sg:"grasa", n:"Maní tostado", g:"fat", k:585, p:25.8, c:16, f:49.7},
  nueces:{sg:"grasa", n:"Nueces", g:"fat", k:654, p:15.2, c:13.7, f:65.2},
  leche:{n:"Leche parcialmente descremada", g:"otro", k:46, p:3.2, c:4.8, f:1.5, ml:1},
  rallado:{n:"Queso rallado", g:"otro", k:400, p:33, c:0, f:28},
  cacao:{n:"Cacao amargo", g:"otro", k:228, p:19.6, c:57.9, f:13.7},
  bebida:{n:"Bebida deportiva", g:"otro", k:24, p:0, c:6, f:0, ml:1},
  agua:{n:"Agua", g:"otro", k:0, p:0, c:0, f:0, ml:1},
  ensalada:{n:"Ensalada de lechuga, tomate y zanahoria", g:"veg", k:22, p:1, c:4, f:0.2},
  verduras:{n:"Verduras de estación", g:"veg", k:25, p:1.5, c:4.5, f:0.2},
  tomate:{n:"Tomate, cebolla y morrón", g:"veg", k:25, p:1.2, c:5, f:0.2},
  zapallo:{n:"Zapallo o calabaza al horno", g:"veg", k:30, p:1, c:7.5, f:0.1},
  salsa:{n:"Salsa de tomate", g:"veg", k:29, p:1.3, c:6, f:0.2}
};

/** Grupos de equivalencias: un alimento se cambia por otro con la misma cantidad del macro clave. */
export const GROUPS = {
  prot:{name:"Proteínas", key:"p", portion:25, label:"25 g de proteína"},
  carb:{name:"Carbohidratos", key:"c", portion:50, label:"50 g de carbohidratos"},
  fat:{name:"Grasas", key:"f", portion:10, label:"10 g de grasa"}
};

export const DAY_TYPES = {gym:"Entrenamiento", rest:"Descanso", match:"Partido"};

/** Comidas del día: nombre y para qué sirve. */
export const ROLES = {
  desayuno:{name:"Desayuno", why:"La primera comida del día, después de levantarte o de caminar."},
  almuerzo:{name:"Almuerzo", why:"Comida completa: proteína, carbohidratos y verduras."},
  pre:{name:"Pre-entreno", why:"1 a 1,5 h antes de entrenar: carbohidratos fáciles, poca grasa y poca fibra."},
  mpre:{name:"Merienda pre-entreno", why:"1,5 a 2 h antes de entrenar."},
  post:{name:"Comida post-entreno", why:"Dentro de las 2 h después de entrenar: proteína con carbohidratos."},
  merienda:{name:"Merienda", why:"Mantiene la proteína repartida a lo largo del día."},
  cena:{name:"Cena", why:"Comida completa, con menos carbohidratos que un día de entrenamiento."},
  noche:{name:"Antes de dormir", why:"Proteína de digestión lenta para la noche."},
  almPartido:{name:"Almuerzo pre-partido", why:"3 a 4 h antes: muchos carbohidratos, poca grasa y poca fibra."},
  prePartido:{name:"Pre-partido", why:"60 a 90 min antes. Toma unos 500 ml de agua 2 h antes del partido."},
  durante:{name:"Durante el partido", why:"Sorbos regulares de agua. Si juegas más de 1 h, bebida con sodio."},
  postPartido:{name:"Cena post-partido", why:"Dentro de 1 a 2 h: carbohidratos, proteína y comida bien salada para reponer sodio."}
};

/**
 * Menús de base, armados para unas 3.000 kcal. Cada ítem: [alimento, gramos, nombre a mostrar].
 * La app escala proteínas, carbohidratos y grasas por separado para llegar a los objetivos de cada persona.
 */
export const MENUS = {
  gymA:{label:"Menú A", type:"gym", meals:[
    {r:"desayuno", items:[["avena",80],["leche",300],["banana",120],["miel",20],["huevo",150,"Huevos revueltos"]]},
    {r:"almuerzo", items:[["pollo",200,"Pechuga de pollo a la plancha"],["arroz",130],["ensalada",200],["aceite",10]]},
    {r:"pre", items:[["pan",100],["untable",40],["ddl",20]], tip:"Si quieres cafeína, un café 60 min antes (3 mg por kg de peso). Evítala si entrenas de noche."},
    {r:"post", items:[["nalga",220,"Nalga a la plancha"],["papa",300,"Papa al horno"],["aceite",5],["verduras",200],["manzana",180]]},
    {r:"noche", items:[["yogur",175],["ricota",100],["nueces",15]]}
  ]},
  gymB:{label:"Menú B", type:"gym", meals:[
    {r:"desayuno", items:[["pan",80],["untable",50],["huevo",100,"Huevos"],["jugo",250]]},
    {r:"almuerzo", items:[["fideos",130],["nalga",200,"Nalga picada en salsa boloñesa"],["salsa",150],["rallado",10],["aceite",10]]},
    {r:"mpre", items:[["yogur",175],["avena",50],["banana",120],["mani",20]]},
    {r:"post", items:[["merluza",250,"Merluza al horno"],["batata",300,"Batata al horno"],["ensalada",200],["palta",50],["aceite",5],["pan",50]]},
    {r:"noche", items:[["ricota",150],["cacao",10],["miel",15]], tip:"Con ricota descremada bajas la grasa y puedes sumar carbohidratos."}
  ]},
  rest:{label:"Día de descanso", type:"rest", meals:[
    {r:"desayuno", items:[["huevo",150],["pan",100],["palta",40],["leche",200,"Leche para el café"]]},
    {r:"almuerzo", items:[["lenteja",80,"Lentejas en ensalada"],["atun",120],["huevo",50,"Huevo duro"],["tomate",200],["aceite",10]]},
    {r:"merienda", items:[["yogur",175],["manzana",180],["nueces",20],["mani",25]]},
    {r:"cena", items:[["pollo",220],["arroz",80],["zapallo",300],["ensalada",150],["aceite",10]]},
    {r:"noche", items:[["untable",150],["mermelada",20],["galleta",18]]}
  ]},
  match:{label:"Día de partido", type:"match", meals:[
    {r:"desayuno", items:[["avena",80],["leche",300],["banana",120],["miel",20],["huevo",100]]},
    {r:"almPartido", items:[["fideos",150],["pollo",180],["salsa",150],["rallado",10],["aceite",5]]},
    {r:"prePartido", items:[["pan",60],["ddl",25],["banana",120],["agua",500]]},
    {r:"durante", items:[["bebida",500]], tip:"Si ese día también tienes otra actividad larga, suma 60-80 g de carbohidratos: una banana y 50 g de pan, o 500 ml más de bebida."},
    {r:"postPartido", items:[["nalga",220],["papa",400,"Papa con sal"],["ensalada",200],["aceite",10],["jugo",250]]},
    {r:"noche", items:[["yogur",175],["avena",30],["nueces",15]]}
  ]}
};

/**
 * Estrategias según la grasa corporal (ISSN, Helms 2014 y 2023, Iraki 2019, Barakat 2020).
 * kcal: multiplicador del mantenimiento. p y f: g por kg de peso; f varía por tipo de día.
 */
export const STRATEGIES = {
  volumen:{name:"Volumen limpio", branch:"A", kcal:1.07, p:2.05, f:{gym:0.98, rest:0.98, match:0.86},
    who:"12-13 % de grasa o menos",
    look:"Se ven los abdominales de arriba sin contraer, los oblicuos marcados y las venas de los antebrazos.",
    waist:"Cintura/altura menor a 0,46", pace:"Subir 0,25-0,35 % del peso por semana.",
    why:"Superávit chico, de 5 a 10 %. Comer más que eso suma sobre todo grasa, no más músculo."},
  recomp:{name:"Recomposición", branch:"B", kcal:0.985, p:2.2, f:{gym:0.9, rest:0.95, match:0.78},
    who:"Entre 14 y 18 % de grasa",
    look:"Los abdominales se ven solo al contraer o con luz de arriba, con algo de grasa a los costados.",
    waist:"Cintura/altura entre 0,46 y 0,5", pace:"Peso estable, cintura que baja y fuerza que sube.",
    why:"Ganas músculo y pierdes grasa a la vez con proteína alta y entrenamiento progresivo."},
  definicion:{name:"Definición corta", branch:"C", kcal:0.82, p:2.4, f:{gym:0.75, rest:0.75, match:0.7},
    who:"19-20 % de grasa o más",
    look:"No se ven los abdominales y hay un pliegue claro sobre el cinturón.",
    waist:"Cintura/altura de 0,5 o más", pace:"Bajar 0,5-1 % del peso por semana.",
    why:"Entre 8 y 12 semanas, sin recortar los carbohidratos de los días de partido."}
};

/** Calorías de cada tipo de día respecto del promedio de la estrategia. */
export const DAY_KCAL = {gym:1, rest:0.9, match:1.08};

/** Factor de actividad que multiplica el metabolismo basal. */
export const ACTIVITY = [
  {f:1.375, name:"Liviana", desc:"1 a 3 entrenamientos por semana"},
  {f:1.55, name:"Moderada", desc:"3 a 5 entrenamientos por semana"},
  {f:1.62, name:"Alta", desc:"4 entrenamientos, deporte y caminatas"},
  {f:1.725, name:"Muy alta", desc:"Entrenamiento diario o trabajo físico"}
];

/** Valores por defecto del registro de ajustes. El perfil queda vacío hasta que la persona lo completa. */
export const DEFAULT_SETTINGS = {id:"settings", profile:null, strategy:"recomp", variant:"alt", adjust:0,
  matchTime:"17:00", water:3, gymCat:"", times:{}};
