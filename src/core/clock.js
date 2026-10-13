// Reloj de la app. Los tests lo fijan con setNow() para tener fechas deterministas.
let fixed = null;
export const now = () => fixed ? new Date(fixed) : new Date();
export const setNow = d => { fixed = d ? new Date(d) : null; };
