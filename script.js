import * as three from './aplikacja.js';
import * as strona from './strona.js';

const pointMenu = document.getElementById("pointMenu")
const dropdownPointMenu = document.getElementById("dropdownPointMenu")
pointMenu.addEventListener("click", () => {
    dropdownPointMenu.classList.toggle("open")
})


const aplikacja = new three.App();
document.getElementById("start").addEventListener("click", aplikacja.init.bind(aplikacja));
aplikacja.resize()
strona.init(aplikacja.resize.bind(aplikacja));