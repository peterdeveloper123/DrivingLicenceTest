// ui.js

const grid = document.getElementById("okruhy-grid");

otazkyPodlaOkruhov.forEach(({ okruh, questions }, index) => {
  const col = document.createElement("div");
  col.className = "col-12 col-sm-6 col-md-4 col-lg-3";

  const card = document.createElement("div");
  card.className = "okruh-card";

  card.innerHTML = `
    <div class="okruh-title">${okruh}</div>
    <div class="okruh-count">${questions.length} otázok</div>
  `;

  card.addEventListener("click", () => {
    window.location.href = `questions.html?okruh=${index}`;
  });

  col.appendChild(card);
  grid.appendChild(col);
});
