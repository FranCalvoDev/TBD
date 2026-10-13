// Semana tipo original y los tips de cada bloque.
const b = (s,e,cat,title,key) => ({s,e,cat,title,key});
const DEFAULT_DAYS = [
  [b("08:30","09:00","rutina","Rutina de mañana","manana"), b("09:00","10:00","trabajo","Postulaciones","postular"),
   b("10:00","13:00","proyectos","Proyectos y portfolio","proyectos"), b("13:00","14:00","rutina","Almuerzo","almuerzo"),
   b("14:00","15:15","estudio","Estudio de la facultad","estudio"), b("15:30","17:00","gym","Gimnasio","gymLunes"),
   b("17:00","17:45","rutina","Merienda y traslado","merienda"), b("18:00","22:30","estudio","Facultad","facultadLunes"),
   b("23:30","24:30","rutina","Cierre del día","cierre")],
  [b("08:30","09:00","rutina","Rutina exprés","manana2"), b("09:00","12:00","estudio","Curso Backend UTN","utn"),
   b("12:00","13:00","rutina","Almuerzo","almuerzo"), b("13:00","14:00","trabajo","Mensajes de contacto","contactos"),
   b("14:00","16:00","contenido","Edición de contenido","edicion"), b("17:00","18:30","gym","Gimnasio","gym"),
   b("19:00","20:00","estudio","Facultad","facultad"), b("20:30","22:00","social","Libre o social","socialMartes"),
   b("23:30","24:30","rutina","Cierre del día","cierre")],
  [b("08:30","09:00","rutina","Rutina de mañana","manana"), b("09:00","10:00","trabajo","Postulaciones","postular"),
   b("10:00","13:00","contenido","Creación de contenido","grabar"), b("13:00","14:00","rutina","Almuerzo","almuerzo"),
   b("14:00","17:00","estudio","Estudio de la facultad","estudio"), b("20:30","22:30","estudio","Facultad","facultad"),
   b("23:30","24:30","rutina","Cierre del día","cierre")],
  [b("08:30","09:00","rutina","Rutina exprés","manana2"), b("09:00","12:00","estudio","Curso Backend UTN","utn"),
   b("12:00","13:00","rutina","Almuerzo","almuerzo"), b("13:00","14:00","contenido","Publicar en LinkedIn y Reddit","publicar"),
   b("14:00","17:00","proyectos","Proyectos y portfolio","proyectos"), b("18:00","19:30","gym","Gimnasio","gym"),
   b("21:00","23:30","social","Salida con amigos","social"), b("23:30","24:30","rutina","Cierre del día","cierre")],
  [b("08:30","09:00","rutina","Rutina de mañana","manana"), b("09:00","10:00","trabajo","Seguimientos y entrevistas","seguimiento"),
   b("10:00","13:00","proyectos","Proyectos y portfolio","proyectos"), b("13:00","14:00","rutina","Almuerzo","almuerzo"),
   b("14:00","16:00","estudio","Estudio de la facultad","estudio"), b("18:00","19:30","gym","Gimnasio","gym"),
   b("20:30","22:30","estudio","Facultad","facultad"), b("23:30","24:30","rutina","Cierre del día","cierre")],
  [b("08:30","09:00","rutina","Rutina de mañana","manana"), b("11:00","13:00","personal","Apariencia y recados","apariencia"),
   b("21:00","24:00","social","Salida","social")],
  [b("08:30","09:00","rutina","Rutina de mañana","manana"), b("18:00","18:30","personal","Revisión semanal","revision"),
   b("18:30","19:00","contenido","Programar publicaciones","programar"), b("20:00","20:30","personal","Preparar la semana","preparar"),
   b("23:30","24:30","rutina","Cierre del día","cierre")]
];

const INFO = {
  manana:{p:"Arranca el día sin prisa y sin pantallas.",l:["Toma un vaso de agua apenas te levantas.","Abre la ventana o sal unos minutos a la luz natural: ayuda a despertarte y a dormir mejor a la noche.","No mires el celular durante los primeros 20 minutos."]},
  manana2:{p:"Solo tienes 30 minutos antes del curso, así que todo tiene que estar listo desde la noche anterior.",l:["Desayuno y ropa preparados la noche anterior.","Ducha rápida, desayuno y a las 9:00 sentado frente a la computadora.","Agua y luz natural igual que los otros días."]},
  postular:{p:"Entre 10 y 15 postulaciones por semana, siempre adaptadas a cada oferta.",l:["Mueve al principio del CV lo que pide la oferta y usa sus mismas palabras clave.","Plataformas: LinkedIn, GetOnBoard, Computrabajo y Bumeran.","Aprovecha tu inglés B2 para postularte a empresas del exterior en remoto.","Anota cada postulación en tu planilla de seguimiento."]},
  contactos:{p:"El canal que más entrevistas consigue en perfiles junior: 5 mensajes por semana.",l:["Escribe a desarrolladores o reclutadores de empresas que te interesen.","Mensajes breves y concretos: pregunta cómo es trabajar ahí o si buscan perfiles como el tuyo, sin pedir trabajo directamente.","Pídele al estudio contable una recomendación en LinkedIn."]},
  seguimiento:{p:"Cierra la semana de búsqueda con orden y práctica.",l:["Escribe de nuevo a las empresas que no respondieron en 7 días.","Repasa JavaScript, React y SQL con ejercicios técnicos.","Arma 3 o 4 anécdotas con la estructura situación, acción y resultado. El arbitraje te da ejemplos muy buenos de decisiones bajo presión."]},
  proyectos:{p:"Tu bloque de trabajo profundo. Protégelo como si fuera una clase más.",l:["Celular en otra habitación.","Trabaja en tandas de 50 minutos con 10 de descanso.","Un solo proyecto por bloque, sin saltar entre varios.","Que el portfolio tenga 2 o 3 proyectos con README, capturas y demo online."]},
  estudio:{p:"Tiempo para las 2 materias de la facultad.",l:["Empieza por lo que tenga entrega o examen más cercano.","Repasa la clase anterior antes de la siguiente: te ahorra horas antes de los parciales."]},
  facultad:{p:"Clase en la facultad.",l:["Ten a mano los apuntes de la clase anterior.","Anota dudas durante la clase y resuélvelas en el bloque de estudio siguiente."]},
  facultadLunes:{p:"La cursada más larga de la semana: de 18:00 a 22:30.",l:["Lleva comida o una colación completa: vienes del gimnasio y son 4 horas y media.","Lleva agua."]},
  utn:{p:"Curso Backend Developer de la UTN, online.",l:["Ten el entorno de desarrollo abierto y practica en paralelo.","Lo que aprendas acá es material directo para tu contenido: explícalo de forma simple."]},
  gym:{p:"A las 18:00 hay más gente, así que lleva el entrenamiento planificado para no esperar máquinas.",l:["Con 4 días funciona muy bien una rutina de torso y piernas (dos veces cada uno).","Anota pesos y repeticiones para ir progresando.","Come algo liviano 1 o 2 horas antes."]},
  gymLunes:{p:"El lunes adelantas el gimnasio porque la facultad empieza a las 18:00.",l:["Termina a las 17:00 para tener tiempo de merendar y llegar tranquilo.","Lleva el entrenamiento planificado.","Anota pesos y repeticiones para ir progresando."]},
  almuerzo:{p:"Pausa real: lejos de la computadora.",l:["Si puedes, cocina de más para tener comida lista otro día."]},
  merienda:{p:"Recarga antes de las 4 horas y media de facultad.",l:["Proteína y carbohidratos después del gimnasio.","Prepara lo que vas a comer durante la clase."]},
  cierre:{p:"Baja el ritmo para dormir 8 horas.",l:["Deja las pantallas desde las 23:30.","Prepara lo del día siguiente.","Anota en papel las 3 tareas más importantes de mañana.","A dormir a las 00:30."]},
  edicion:{p:"Editas lo que grabaste el miércoles anterior.",l:["Primero el video largo o el artículo, después cortas 2 o 3 shorts de 30 a 60 segundos.","Herramientas: DaVinci Resolve o CapCut para editar y Canva para miniaturas.","Subtítulos siempre: la mayoría mira los cortos sin sonido."]},
  grabar:{p:"El día más importante del contenido: escribes y grabas todo junto.",l:["Escribe el guion de la pieza principal de la semana.","Graba la pantalla con OBS.","Aprovecha y graba de una vez los cortos extra.","Invierte primero en un buen micrófono antes que en una cámara."]},
  publicar:{p:"Distribuye la pieza de la semana en todas las plataformas.",l:["LinkedIn: 2 publicaciones por semana, es la plataforma que más te acerca a un trabajo.","Reddit (r/devsarg, r/webdev, r/learnprogramming): pega el contenido completo en el post, no solo un enlace.","Responde todos los comentarios del día."]},
  programar:{p:"Deja programado todo lo de la semana.",l:["Usa la programación de cada plataforma o Buffer.","Así sigues publicando aunque tengas una semana complicada.","Elige el tema de la próxima pieza principal."]},
  social:{p:"Tiempo para amigos, salidas y citas.",l:["Si lo agendas, pasa; si lo dejas para cuando haya tiempo, no pasa.","Si tienes partidos para arbitrar, este es un buen lugar para ubicarlos."]},
  socialMartes:{p:"Rato libre después de la clase corta.",l:["Ideal para ver a alguien o llamar a un amigo.","Si prefieres descansar, también vale."]},
  apariencia:{p:"Lo que más rinde es la constancia.",l:["Corte de pelo cada 3 o 4 semanas.","Repón lo que falte de tu rutina de cuidado de piel.","Si hace falta, compras de ropa."]},
  revision:{p:"El hábito que mantiene todo el sistema funcionando.",l:["¿Qué avanzaste esta semana?","¿Qué quedó pendiente y por qué?","¿Cuáles son las 3 prioridades de la próxima semana?"]},
  preparar:{p:"Deja la semana lista para arrancar el lunes sin fricción.",l:["Elige la ropa de los días de facultad.","Planifica o prepara comidas.","Revisa entregas y fechas de la facultad."]}
};


/** Bloques de la semana tipo original, con ids estables (d<día>b<índice>). */
export function defaultBlocks(){
  const out = [];
  DEFAULT_DAYS.forEach((d,i) => d.forEach((x,j) => {
    const inf = INFO[x.key] || {p:"",l:[]};
    out.push({id:`d${i}b${j}`, day:i, s:x.s, e:x.e, cat:x.cat, title:x.title, p:inf.p, l:inf.l.slice()});
  }));
  return out;
}
