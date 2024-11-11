function createShapes() {
 const shapesContainer = document.getElementById("shapes");
 const numberOfShapes = 15;

 for (let i = 0; i < numberOfShapes; i++) {
   const shape = document.createElement("div");
   shape.className = "shape";

   const size = Math.random() * 200 + 100;
   shape.style.width = `${size}px`;
   shape.style.height = `${size}px`;

   shape.style.left = `${Math.random() * 100}%`;
   shape.style.top = `${Math.random() * 100}%`;

   const duration = Math.random() * 10 + 15;
   const delay = Math.random() * -20;
   shape.style.animationDuration = `${duration}s`;
   shape.style.animationDelay = `${delay}s`;

   shapesContainer.appendChild(shape);
 }
}

function triggerConfetti() {
 const count = 200;
 const defaults = {
   origin: { y: 0.7 },
   spread: 360,
   ticks: 100,
   gravity: 0.5,
   decay: 0.94,
   startVelocity: 30,
 };

 function fire(particleRatio, opts) {
   confetti({
     ...defaults,
     ...opts,
     particleCount: Math.floor(count * particleRatio),
   });
 }

 fire(0.25, {
   spread: 26,
   startVelocity: 55,
 });

 fire(0.2, {
   spread: 60,
 });

 fire(0.35, {
   spread: 100,
   decay: 0.91,
   scalar: 0.8,
 });

 fire(0.1, {
   spread: 120,
   startVelocity: 25,
   decay: 0.92,
   scalar: 1.2,
 });

 fire(0.1, {
   spread: 120,
   startVelocity: 45,
 });
}

window.addEventListener("load", () => {
 createShapes();
 setTimeout(() => {
   document.querySelector(".container").style.opacity = "1";
   document.querySelector(".container").style.transform =
     "translateY(0)";
   triggerConfetti();
   playPopSound();
 }, 500);
});