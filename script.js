import * as three from './aplikacja.js';
import * as strona from './strona.js';

const pointMenu = document.getElementById("pointMenu")
const dropdownPointMenu = document.getElementById("dropdownPointMenu")
pointMenu.addEventListener("click", () => {
    dropdownPointMenu.classList.toggle("open")
})

const anihilacjaButton = document.getElementById("anihilacja")
anihilacjaButton.addEventListener("click", (event) => {
    let warning = document.createElement("div");
    warning.innerHTML = "<p>Nawet o tym nie myśl!</p>";
    warning.classList.add("textContainer");
    warning.style.position = "absolute";
    warning.style.top = event.clientY + "px";
    warning.style.left = event.clientX + "px";
    document.body.appendChild(warning);
    setTimeout(() => {
        document.body.removeChild(warning);
    }, 2000);
})

const aplikacja = new three.App();
document.getElementById("start").addEventListener("click", () => {
    aplikacja.init.bind(aplikacja)()
    let descriptionBox = document.getElementById("descriptionBox");
    descriptionBox.classList.add("hidden");
    descriptionBox.innerHTML = "";
});
aplikacja.resize()
strona.init(aplikacja.resize.bind(aplikacja));